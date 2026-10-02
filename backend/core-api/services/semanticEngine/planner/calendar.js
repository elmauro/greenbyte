const WEEKDAY = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAY[bag.weekday],
  };
}

function offsetMs(date, timeZone) {
  const parts = localParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const corrected = new Date(guess.getTime() - offsetMs(guess, timeZone));
  const drift = offsetMs(corrected, timeZone) - offsetMs(guess, timeZone);
  return drift === 0 ? corrected : new Date(corrected.getTime() - drift);
}

export function formatInTimeZone(date, timeZone) {
  const parts = localParts(date, timeZone);
  const total = Math.round(offsetMs(date, timeZone) / 60000);
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  const pad = (n) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${sign}${hh}:${mm}`;
}

export function localDate(date, timeZone) {
  const parts = localParts(date, timeZone);
  const pad = (n) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function minutesOfDay(clock) {
  if (clock === '24:00') return 24 * 60;
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function dayWindow(parts, calendar) {
  if (!calendar.weekdays.includes(parts.weekday)) return null;
  return { start: minutesOfDay(calendar.start), end: minutesOfDay(calendar.end) };
}

function downtimeHits(date, downtime) {
  const ms = date.getTime();
  return (downtime || []).find((window) => ms >= Date.parse(window.startsAt) && ms < Date.parse(window.endsAt)) || null;
}

function isOpen(date, calendar, downtime, timeZone) {
  const window = dayWindow(localParts(date, timeZone), calendar);
  if (!window) return false;
  const parts = localParts(date, timeZone);
  const minute = parts.hour * 60 + parts.minute;
  if (minute < window.start || minute >= window.end) return false;
  return !downtimeHits(date, downtime);
}

function nextInstant(date, calendar, downtime, timeZone) {
  const limit = date.getTime() + 14 * 24 * 3600 * 1000;
  let cursor = date.getTime();
  while (cursor < limit) {
    const at = new Date(cursor);
    if (isOpen(at, calendar, downtime, timeZone)) return at;
    const down = downtimeHits(at, downtime);
    if (down) {
      cursor = Date.parse(down.endsAt);
      continue;
    }
    const parts = localParts(at, timeZone);
    const window = dayWindow(parts, calendar);
    const minute = parts.hour * 60 + parts.minute;
    if (window && minute < window.start) {
      cursor = zonedTimeToUtc(parts.year, parts.month, parts.day, Math.floor(window.start / 60), window.start % 60, timeZone).getTime();
      continue;
    }
    const nextDay = zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, timeZone).getTime() + 24 * 3600 * 1000;
    cursor = nextDay;
  }
  throw new Error('No open working time in the next 14 days');
}

function segmentEnd(date, calendar, downtime, timeZone) {
  const parts = localParts(date, timeZone);
  const window = dayWindow(parts, calendar);
  const close = zonedTimeToUtc(
    parts.year,
    parts.month,
    parts.day,
    Math.floor(window.end / 60) % 24,
    window.end % 60,
    timeZone,
  );
  let end = window.end >= 24 * 60
    ? zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, timeZone).getTime() + 24 * 3600 * 1000
    : close.getTime();
  for (const block of downtime || []) {
    const start = Date.parse(block.startsAt);
    if (start > date.getTime() && start < end) end = start;
  }
  return new Date(end);
}

export function addWorkingHours(start, hours, calendar, downtime, timeZone) {
  let cursor = nextInstant(start, calendar, downtime, timeZone);
  if (hours <= 0) return cursor;
  let leftMs = hours * 3600 * 1000;
  while (leftMs > 0) {
    cursor = nextInstant(cursor, calendar, downtime, timeZone);
    const end = segmentEnd(cursor, calendar, downtime, timeZone);
    const room = end.getTime() - cursor.getTime();
    if (room <= 0) {
      cursor = new Date(cursor.getTime() + 60 * 1000);
      continue;
    }
    if (leftMs <= room) return new Date(cursor.getTime() + leftMs);
    leftMs -= room;
    cursor = end;
  }
  return cursor;
}

export function workingHoursBetween(start, end, calendar, downtime, timeZone) {
  let cursor = new Date(start.getTime());
  const stop = end.getTime();
  let hours = 0;
  while (cursor.getTime() < stop) {
    if (!isOpen(cursor, calendar, downtime, timeZone)) {
      const next = nextInstant(cursor, calendar, downtime, timeZone);
      if (next.getTime() <= cursor.getTime()) break;
      cursor = next;
      continue;
    }
    const segment = segmentEnd(cursor, calendar, downtime, timeZone).getTime();
    const slice = Math.min(segment, stop) - cursor.getTime();
    hours += slice / 3600000;
    cursor = new Date(cursor.getTime() + slice);
  }
  return hours;
}

export function isoWeekBounds(week, timeZone) {
  const [year, weekNo] = week.split('-W').map(Number);
  const monday = isoWeekMonday(year, weekNo);
  const start = zonedTimeToUtc(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), 0, 0, timeZone);
  return { start, end: new Date(start.getTime() + 7 * 24 * 3600 * 1000) };
}

function isoWeekMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  return monday;
}

export function isoWeek(date, timeZone) {
  const parts = localParts(date, timeZone);
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

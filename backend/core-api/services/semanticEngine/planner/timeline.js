import { addWorkingHours, formatInTimeZone, isoWeek, isoWeekBounds, localDate, workingHoursBetween } from './calendar.js';

function round2(value) {
  return Math.round(value * 100) / 100;
}

function transitionOf(previous, order, rules) {
  if (!previous) return null;
  const speciesChange = previous.speciesCode !== order.speciesCode;
  const beforeExcelis = rules.cleanoutTriggers?.includes('BEFORE_EXCELIS')
    && order.traitFamilyCode === 'EXCELIS'
    && previous.traitFamilyCode !== 'EXCELIS';
  const afterGmo = rules.cleanoutTriggers?.includes('AFTER_GMO') && previous.isGmo === true;
  if (speciesChange) return 'SPECIES_CHANGE';
  if (beforeExcelis || afterGmo) return 'TRAIT_CHANGE';
  if (previous.varietyCode === order.varietyCode) return 'SAME_VARIETY';
  return 'SAME_SPECIES';
}

function changeoverHours(transition, line) {
  if (!transition || transition === null) return 0;
  const hours = line.changeover?.[transition];
  if (hours == null) return line.changeover?.SPECIES_CHANGE ?? 0;
  return Number(hours);
}

function slackDays(sapFinishDate, end, timeZone) {
  if (!sapFinishDate) return null;
  const endDate = localDate(end, timeZone);
  const due = Date.parse(`${sapFinishDate}T00:00:00Z`);
  const actual = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((due - actual) / 86400000);
}

function reasonsFor(order, meta) {
  const reasons = [];
  const add = (code, params, factIds = []) => {
    reasons.push({ seq: reasons.length + 1, code, params, factIds });
  };
  if (order.statusCode === 'ONLINE') {
    add('ALREADY_RUNNING', { work_center_code: meta.workCenterCode, status_code: order.statusCode });
  }
  if (order.rushPlacement) {
    add('RUSH_PRIORITY', {
      source: 'scheduler',
      priority_rank: order.priorityRank ?? 'rush',
      previous_priority: order.schedulePriorityRank ?? order.priorityRank ?? 'none',
    });
  }
  if (order.priorityRank != null && order.statusCode !== 'ONLINE') {
    add('PRIORITY', { priority_rank: order.priorityRank, priority_source: order.prioritySource || 'SAP' });
  }
  if (meta.sameSpecies && meta.previousPo) {
    add('SAME_SPECIES_GROUP', { species_code: order.speciesCode, previous_po: meta.previousPo });
  }
  if (meta.sameVariety && meta.previousPo) {
    add('SAME_VARIETY_GROUP', {
      variety_code: order.varietyCode,
      previous_po: meta.previousPo,
      saved_h: round2(Math.max(0, meta.fullCleanoutH - meta.changeoverHours)),
    });
  }
  if (meta.changeoverHours > 0 && meta.previousPo) {
    add('CHANGEOVER', { transition_code: meta.transition, hours: meta.changeoverHours, from_po: meta.previousPo });
  }
  if (meta.isAtRisk) {
    add('DUE_DATE_RISK', {
      due_date: order.sapFinishDate,
      planned_end_date: meta.plannedEndDate,
      slack_days: meta.slackDays,
    });
  }
  if (meta.eventType && meta.previousPosition != null && meta.previousPosition !== meta.position) {
    add('RESEQUENCED', {
      from_position: meta.previousPosition,
      to_position: meta.position,
      event_type: meta.eventType,
    });
  }
  if (order.isHold && order.qualityTestId != null) {
    add('QA_HOLD', { quality_test_id: String(order.qualityTestId), source: 'pass_fail_log' });
  }
  if (order.notReadyFact && order.statusCode === 'ONLINE') {
    add('NOT_READY_WARNING', {
      fact_label: order.notReadyFact.label,
      semantic_fact_id: order.notReadyFact.id,
      note_text: order.notReadyFact.noteText,
    }, [order.notReadyFact.id]);
  }
  return reasons;
}

function lineCalendar(rules, workCenterCode) {
  return rules.calendar[workCenterCode];
}

export function timeSequence(sequence, line, snapshot, eventType, previousByPo) {
  const calendar = lineCalendar(snapshot.rules, line.workCenterCode);
  const timeZone = snapshot.rules.timeZone;
  const downtime = (snapshot.downtime || []).filter((window) => !window.lineId || window.lineId === line.lineId);
  let cursor = new Date(snapshot.asOf);
  const entries = [];
  let previous = null;

  for (const order of sequence) {
    const transition = order.statusCode === 'ONLINE' ? null : transitionOf(previous, order, snapshot.rules);
    const changeover = order.statusCode === 'ONLINE' ? 0 : changeoverHours(transition, line);
    const rate = order.kgPerHour || line.kgPerHour;
    const runH = rate ? round2(Number(order.inputKg || 0) / rate) : 0;
    const ready = order.readyBy && order.statusCode !== 'ONLINE' ? new Date(order.readyBy) : null;
    const startBase = ready && ready > cursor ? ready : cursor;
    const openStart = addWorkingHours(startBase, 0, calendar, downtime, timeZone);
    const afterChangeover = addWorkingHours(openStart, changeover, calendar, downtime, timeZone);
    const end = addWorkingHours(afterChangeover, runH, calendar, downtime, timeZone);
    const slack = slackDays(order.sapFinishDate, end, timeZone);
    const late = slack != null && slack < 0;
    const previousPosition = previousByPo.get(order.poNumber) ?? null;
    const position = entries.length + 1;
    entries.push({
      lineScheduleItemId: order.lineScheduleItemId,
      processOrderId: order.processOrderId,
      position,
      entryStatus: 'PLANNED',
      plannedStartAt: formatInTimeZone(order.statusCode === 'ONLINE' ? new Date(snapshot.asOf) : openStart, timeZone),
      plannedEndAt: formatInTimeZone(end, timeZone),
      estRunH: runH,
      estChangeoverH: changeover,
      dueDate: order.sapFinishDate,
      slackDays: slack,
      isAtRisk: late,
      previousPosition,
      reasons: reasonsFor(order, {
        workCenterCode: line.workCenterCode,
        sameSpecies: previous && previous.speciesCode === order.speciesCode,
        sameVariety: previous && previous.speciesCode === order.speciesCode && previous.varietyCode === order.varietyCode,
        previousPo: previous?.poNumber || null,
        changeoverHours: changeover,
        fullCleanoutH: line.changeover?.SPECIES_CHANGE ?? changeover,
        transition,
        isAtRisk: late,
        plannedEndDate: localDate(end, timeZone),
        slackDays: slack,
        eventType,
        previousPosition,
        position,
      }),
      poNumber: order.poNumber,
    });
    cursor = end;
    previous = order;
  }
  return entries;
}

export function holdEntries(orders, startPosition, previousByPo, eventType) {
  return orders.filter((order) => order.isHold).map((order, index) => {
    const position = startPosition + index;
    const previousPosition = previousByPo.get(order.poNumber) ?? null;
    return {
      lineScheduleItemId: order.lineScheduleItemId,
      processOrderId: order.processOrderId,
      position,
      entryStatus: 'HOLD',
      plannedStartAt: null,
      plannedEndAt: null,
      estRunH: null,
      estChangeoverH: null,
      dueDate: order.sapFinishDate,
      slackDays: null,
      isAtRisk: false,
      previousPosition,
      reasons: reasonsFor(order, {
        workCenterCode: null,
        eventType,
        previousPosition,
        position,
        sameSpecies: false,
        sameVariety: false,
        changeoverHours: 0,
      }),
      poNumber: order.poNumber,
    };
  });
}

export function weeklyLoad(entries, line, snapshot) {
  const calendar = lineCalendar(snapshot.rules, line.workCenterCode);
  const timeZone = snapshot.rules.timeZone;
  const downtime = (snapshot.downtime || []).filter((window) => !window.lineId || window.lineId === line.lineId);
  const weeks = new Map();
  for (const entry of entries) {
    if (!entry.plannedStartAt || !entry.plannedEndAt) continue;
    const start = new Date(entry.plannedStartAt);
    const end = new Date(entry.plannedEndAt);
    let cursor = start;
    while (cursor < end) {
      const week = isoWeek(cursor, timeZone);
      const { end: weekEnd } = isoWeekBounds(week, timeZone);
      if (weekEnd <= cursor) throw new Error(`Week ${week} ends before ${cursor.toISOString()}`);
      const sliceEnd = end < weekEnd ? end : weekEnd;
      const bucket = weeks.get(week) || { hoursRequired: 0 };
      bucket.hoursRequired += workingHoursBetween(cursor, sliceEnd, calendar, downtime, timeZone);
      weeks.set(week, bucket);
      cursor = sliceEnd;
    }
  }
  return [...weeks.entries()].map(([week, bucket]) => {
    const { start: monday, end: sunday } = isoWeekBounds(week, timeZone);
    const open = workingHoursBetween(monday, sunday, calendar, [], timeZone);
    const lost = (downtime || []).reduce((sum, window) => {
      const start = new Date(Math.max(Date.parse(window.startsAt), monday.getTime()));
      const end = new Date(Math.min(Date.parse(window.endsAt), sunday.getTime()));
      if (end <= start) return sum;
      return sum + workingHoursBetween(start, end, calendar, [], timeZone);
    }, 0);
    return {
      lineId: line.lineId,
      week,
      hoursRequired: round2(bucket.hoursRequired),
      hoursAvailable: round2(Math.max(0, open - lost)),
    };
  });
}

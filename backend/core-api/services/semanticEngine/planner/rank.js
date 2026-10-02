function priorityKey(order) {
  return order.priorityRank == null ? Number.POSITIVE_INFINITY : order.priorityRank;
}

function byFinishThenPo(a, b) {
  const finish = String(a.sapFinishDate || '9999-12-31').localeCompare(String(b.sapFinishDate || '9999-12-31'));
  if (finish !== 0) return finish;
  return String(a.poNumber).localeCompare(String(b.poNumber));
}

function pickNext(remaining, currentSpecies) {
  const rushes = remaining.filter((order) => order.isRush);
  const candidates = rushes.length > 0 ? rushes : remaining;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const order of candidates) bestPriority = Math.min(bestPriority, priorityKey(order));
  const band = candidates.filter((order) => priorityKey(order) === bestPriority);
  const sameSpecies = currentSpecies ? band.filter((order) => order.speciesCode === currentSpecies) : [];
  const pool = sameSpecies.length > 0 ? sameSpecies : band;
  if (sameSpecies.length > 0) return pool.slice().sort(byFinishThenPo)[0];
  const species = [...new Set(pool.map((order) => order.speciesCode))];
  species.sort((a, b) => {
    const aEarliest = pool.filter((order) => order.speciesCode === a).sort(byFinishThenPo)[0];
    const bEarliest = pool.filter((order) => order.speciesCode === b).sort(byFinishThenPo)[0];
    return byFinishThenPo(aEarliest, bEarliest);
  });
  return pool.filter((order) => order.speciesCode === species[0]).sort(byFinishThenPo)[0];
}

export function rankLine(orders) {
  const remaining = orders.filter((order) => !order.isHold);
  const running = remaining.find((order) => order.statusCode === 'ONLINE');
  const sequence = [];
  if (running) sequence.push(running);
  const pool = remaining.filter((order) => order !== running);
  let currentSpecies = running ? running.speciesCode : null;
  while (pool.length > 0) {
    const next = pickNext(pool, currentSpecies);
    pool.splice(pool.indexOf(next), 1);
    sequence.push(next);
    currentSpecies = next.speciesCode;
  }
  return applyManualPositions(sequence);
}

function applyManualPositions(sequence) {
  const pinned = sequence.filter((order) => order.manualPosition != null && order.statusCode !== 'ONLINE');
  if (pinned.length === 0) return sequence;
  const rest = sequence.filter((order) => !pinned.includes(order));
  const placed = pinned.slice().sort((a, b) => a.manualPosition - b.manualPosition);
  for (const order of placed) {
    const index = Math.max(0, Math.min(rest.length, order.manualPosition - 1));
    if (rest[0]?.statusCode === 'ONLINE' && index === 0) rest.splice(1, 0, order);
    else rest.splice(index, 0, order);
  }
  return rest;
}

export function repairGmoSequence(sequence) {
  const violations = [];
  const result = [];
  const pool = sequence.slice();
  while (pool.length > 0) {
    const order = pool.shift();
    const previous = result[result.length - 1];
    if (previous?.isGmo === true && order.isCertifiedNonGmo === true) {
      const breakerAt = pool.findIndex((candidate) => candidate.isGmo === false && candidate.isCertifiedNonGmo === false && candidate.manualPosition == null);
      if (breakerAt >= 0) result.push(pool.splice(breakerAt, 1)[0]);
      else violations.push({ code: 'NO_BREAKER_AVAILABLE', po: order.poNumber });
    }
    result.push(order);
  }
  return { sequence: result, violations };
}

export function speciesBoundaries(sequence) {
  const boundaries = [];
  let start = sequence[0]?.statusCode === 'ONLINE' ? 1 : 0;
  if (sequence.length === 0) return [0];
  let species = sequence[0].speciesCode;
  for (let i = start; i < sequence.length; i += 1) {
    if (sequence[i].speciesCode !== species) {
      boundaries.push(i);
      species = sequence[i].speciesCode;
    }
  }
  boundaries.push(sequence.length);
  return boundaries.length > 0 ? boundaries : [sequence.length];
}

import { computePlan } from './plan.js';

function clone(snapshot) {
  return structuredClone(snapshot);
}

export function applyPlannerEvent(snapshot, event) {
  const next = clone(snapshot);
  next.proposals = [...(next.proposals || [])];
  next.downtime = [...(next.downtime || [])];
  next.overrides = [...(next.overrides || [])];
  next.orders = next.orders.map((order) => ({ ...order }));

  if (event.type === 'new_order') {
    next.orders.push(event.order);
    return computePlan(next, { eventType: 'queue_refresh' });
  }

  if (event.type === 'priority_change') {
    const order = next.orders.find((candidate) => candidate.poNumber === event.po);
    if (!order) throw new Error(`Unknown PO ${event.po}`);
    order.priorityRank = event.priority;
    order.prioritySource = 'SAP';
    return computePlan(next, { eventType: 'priority_change' });
  }

  if (event.type === 'rush') {
    return computePlan(next, { eventType: 'rush', rush: { po: event.po, shipBy: event.shipBy } });
  }

  if (event.type === 'qa_fail') {
    const order = next.orders.find((candidate) => candidate.poNumber === event.po);
    if (!order) {
      const route = next.rules.repairRoutes?.[event.failReason] ?? null;
      next.proposals.push({
        parentPo: event.po,
        route,
        status: 'PROPOSED',
        routeStatus: route ? 'CONFIRMED' : 'ASSUMPTION',
        failReason: event.failReason,
      });
      return computePlan(next, { eventType: 'qa_fail' });
    }
    order.isHold = true;
    order.qualityTestId = event.qualityTestId ?? null;
    return computePlan(next, { eventType: 'qa_fail' });
  }

  if (event.type === 'line_down') {
    next.downtime.push({
      lineId: event.lineId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      reason: event.reason,
    });
    return computePlan(next, { eventType: 'manual_adjust' });
  }

  if (event.type === 'line_swap') {
    next.overrides = next.overrides.filter((override) => !(override.po === event.po && override.type === 'LINE_SWAP'));
    next.overrides.push({
      po: event.po,
      type: 'LINE_SWAP',
      workCenterCode: event.workCenterCode,
      active: true,
    });
    return computePlan(next, { eventType: 'manual_adjust' });
  }

  throw new Error(`Unknown event ${event.type}`);
}

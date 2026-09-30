import { BASE_QUEUE, EXPLANATIONS, PLANT_DEMO_LINE_ID } from './constants.js';

function cloneQueue(rows) {
  return rows.map((r) => ({ ...r }));
}

function annotateReasons(queue, moves, eventType, locale) {
  const moved = new Set(moves.map((m) => m.po));
  const rushReason =
    locale === 'es' ? 'Rush: ventana cliente 2026-07-06' : 'Rush: customer window 2026-07-06';
  const holdReason = locale === 'es' ? 'Hold QA — pass/fail' : 'QA hold — pass/fail failed';
  for (const row of queue) {
    if (row.status === 'HOLD') row.reasonShort = holdReason;
    else if (moved.has(row.po) && eventType === 'rush') row.reasonShort = rushReason;
    else if (row.atRisk && !row.reasonShort)
      row.reasonShort = locale === 'es' ? 'Fecha SAP en riesgo' : 'SAP due date at risk';
    else if (!row.reasonShort && row.status === 'PLANNED')
      row.reasonShort = locale === 'es' ? 'En plan' : 'On plan';
  }
}

export function createBaselineState() {
  return {
    lineId: PLANT_DEMO_LINE_ID,
    queue: cloneQueue(BASE_QUEUE),
    planVersion: 1,
    lastEvent: null,
    acceptedPlanVersion: null,
  };
}

export function getQueueResponse(state, lineId) {
  if (lineId !== PLANT_DEMO_LINE_ID) {
    throw new Error('Unknown line');
  }
  const acceptedPlanVersion = state.acceptedPlanVersion ?? null;
  const pendingEvent =
    state.lastEvent != null &&
    !(acceptedPlanVersion != null && state.planVersion === acceptedPlanVersion);

  return {
    lineId,
    queue: cloneQueue(state.queue),
    planVersion: state.planVersion,
    lastEvent: pendingEvent ? state.lastEvent : null,
    acceptedPlanVersion,
  };
}

export function applyEvent(state, lineId, type, locale) {
  if (lineId !== PLANT_DEMO_LINE_ID) {
    throw new Error('Unknown line');
  }
  const loc = locale === 'es' ? 'es' : 'en';
  const next = cloneQueue(state.queue);
  const moves = [];
  const reasons = [];

  if (type === 'rush') {
    const rushPo = '1002307551';
    const fromIdx = next.findIndex((r) => r.po === rushPo);
    const toIdx = 0;
    if (fromIdx > toIdx) {
      const [row] = next.splice(fromIdx, 1);
      row.previousPosition = fromIdx + 1;
      next.splice(toIdx, 0, row);
      moves.push({ po: rushPo, fromPosition: fromIdx + 1, toPosition: toIdx + 1 });
      reasons.push('priority_2', 'sap_finish_2026-07-06', 'same_species_changeover');
    }
  } else if (type === 'qa_fail') {
    const failPo = '1001884747';
    const failIdx = next.findIndex((r) => r.po === failPo);
    if (failIdx >= 0) {
      next[failIdx] = { ...next[failIdx], status: 'HOLD', previousPosition: failIdx + 1 };
      const [held] = next.splice(failIdx, 1);
      next.push(held);
      moves.push({ po: failPo, fromPosition: failIdx + 1, toPosition: next.length });
      reasons.push('qa_fail_pass_fail_log', 'isolate_hold', 'resequence_downstream');
    }
  } else {
    throw new Error('Invalid event type');
  }

  annotateReasons(next, moves, type, loc);
  const planVersion = state.planVersion + 1;

  const newState = {
    lineId,
    queue: next,
    planVersion,
    lastEvent: type,
    acceptedPlanVersion: null,
  };

  return {
    state: newState,
    response: {
      lineId,
      eventType: type,
      queue: cloneQueue(next),
      planVersion,
      diff: { moves, reasons },
      explanation: EXPLANATIONS[loc][type],
    },
  };
}

export function acceptPlan(state, lineId) {
  if (lineId !== PLANT_DEMO_LINE_ID) {
    throw new Error('Unknown line');
  }
  const nextState = {
    ...state,
    lastEvent: null,
    acceptedPlanVersion: state.planVersion,
  };
  return {
    state: nextState,
    response: {
      acceptedAt: new Date().toISOString(),
      lineId,
      planVersion: state.planVersion,
    },
  };
}

export function explainBatch(state, po, question, locale) {
  const loc = locale === 'es' ? 'es' : 'en';
  const queue = state.queue.filter((r) => r.status !== 'COMPLETE');
  const index = queue.findIndex((r) => r.po === po);
  if (index < 0) {
    throw new Error('Unknown batch');
  }

  const row = queue[index];
  const position = index + 1;
  const ahead = queue.slice(0, index);
  const q = question.toLowerCase();
  const citations = [`PO ${row.po}`, `Line 1 queue v${state.planVersion}`, row.finish];

  if (loc === 'es') {
    if (row.status === 'HOLD') {
      return {
        po,
        answer: `PO ${po} está en **retención QA** tras un fallo pass/fail. No tiene fecha de salida hasta que el programador de planta libere o reprograme el lote. No hay escritura automática en ERP.`,
        citations: [...citations, 'LSV pass/fail log (Pasco demo)'],
        suggestedFollowUps: ['¿Quién aprueba la disposición?', '¿Qué lotes van antes en la línea?'],
      };
    }
    if (q.includes('cuándo') || q.includes('cuando') || q.includes('ship') || q.includes('sale')) {
      return {
        po,
        answer: `Según el plan actual de Línea 1, PO ${po} (${row.species}, ${row.kg} kg) tiene **fin programado ${row.finish}**. Está en posición **${position}** de ${queue.length}; los lotes delante deben correr primero (misma línea, reglas de changeover).`,
        citations,
        suggestedFollowUps: ['¿Por qué está esperando?', '¿Qué haría falta para subirlo?'],
      };
    }
    if (q.includes('subir') || q.includes('move') || q.includes('antes')) {
      return {
        po,
        answer: `Para **subir** PO ${po} hace falta una decisión del **programador de planta** (p. ej. lote rush o ventana cliente). Hoy hay ${ahead.length} lote(s) delante${ahead.length ? `: ${ahead.map((r) => r.po).join(', ')}` : ''}. Un rush de mayor prioridad podría reordenar — siempre con explicación y aceptación humana.`,
        citations,
        suggestedFollowUps: [`¿Por qué está en posición ${position}?`],
      };
    }
    return {
      po,
      answer: `PO ${po} está en posición **${position}** (${row.species}). Motivo en plan: ${row.reasonShort ?? 'en cola estándar'}. Fin programado: **${row.finish}**. ${row.atRisk ? 'Marcado **en riesgo** por fecha SAP/cliente.' : ''}`,
      citations,
      suggestedFollowUps: ['¿Cuándo sale?', '¿Qué haría falta para subirlo?'],
    };
  }

  if (row.status === 'HOLD') {
    return {
      po,
      answer: `PO ${po} is on **QA hold** after a failed pass/fail test. It has no ship date until the line scheduler releases or replans the batch. No automatic ERP write.`,
      citations: [...citations, 'LSV pass/fail log (Pasco demo)'],
      suggestedFollowUps: ['Who approves disposition?', 'Which batches run first?'],
    };
  }
  if (q.includes('when') || q.includes('ship')) {
    return {
      po,
      answer: `On the current Line 1 plan, PO ${po} (${row.species}, ${row.kg} kg) shows **scheduled finish ${row.finish}**. It is **position ${position}** of ${queue.length}; batches ahead must run first (same line, changeover rules).`,
      citations,
      suggestedFollowUps: ['Why is it waiting?', 'What would move it up?'],
    };
  }
  if (q.includes('move') || q.includes('up') || q.includes('ahead')) {
    return {
      po,
      answer: `To **move up** PO ${po}, the **plant scheduler** must accept a replan (e.g. rush batch or customer window). There are ${ahead.length} batch(es) ahead${ahead.length ? `: ${ahead.map((r) => r.po).join(', ')}` : ''}. Higher-priority rush can reorder — always with explanation and human accept.`,
      citations,
      suggestedFollowUps: [`Why is it position ${position}?`],
    };
  }
  return {
    po,
    answer: `PO ${po} is **position ${position}** (${row.species}). Plan note: ${row.reasonShort ?? 'standard queue'}. Scheduled finish: **${row.finish}**. ${row.atRisk ? 'Flagged **at risk** for SAP/customer date.' : ''}`,
    citations,
    suggestedFollowUps: ['When does it ship?', 'What would move it up?'],
  };
}

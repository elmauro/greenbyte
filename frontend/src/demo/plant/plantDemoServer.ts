import type {
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantEventType,
  PlantExplanation,
  PlantQueueResponse,
  QueueMove,
  QueueRow,
} from './plantDemoTypes';

export const PLANT_DEMO_LINE_ID = 'line-1';

type Locale = 'en' | 'es';

const BASE_QUEUE: QueueRow[] = [
  { po: '1001759341', species: 'SWCO', kg: 4200, finish: '2026-07-04 11:30', status: 'PLANNED' },
  {
    po: '1001884747',
    species: 'SWCO',
    kg: 9800,
    finish: '2026-07-05 16:00',
    status: 'PLANNED',
    atRisk: true,
    reasonShort: 'SAP due date — monitor slot',
  },
  {
    po: '1002307551',
    species: 'SWCO',
    kg: 2800,
    finish: '2026-07-06 09:00',
    status: 'PLANNED',
    atRisk: true,
    reasonShort: 'Priority 2 — customer window',
  },
  { po: '1001984402', species: 'CORN', kg: 5100, finish: '2026-07-07 14:00', status: 'PLANNED' },
  { po: '1002011199', species: 'SWCO', kg: 3600, finish: '2026-07-08 10:00', status: 'PLANNED' },
  { po: '1001887703', species: 'SWCO', kg: 2900, finish: '2026-06-30 08:00', status: 'COMPLETE' },
];

const explanations: Record<Locale, Record<PlantEventType, PlantExplanation>> = {
  en: {
    rush: {
      alertBanner: 'SAP priority update — customer window at risk; line replanned.',
      summary: 'Moved PO 1002307551 ahead to protect the 2026-07-06 customer window.',
      bullets: [
        'Moved PO 1002307551 ahead of PO 1001759341.',
        'Reason: SAP finish date 2026-07-06 and priority 2.',
        'Avoided ~1.5h changeover: same species SWCO on Line 1.',
      ],
      impact: 'Impact: Customer window protected · Net changeover: −1.5h (Pasco heuristic).',
    },
    qa_fail: {
      alertBanner: 'LSV pass/fail log — Fail recorded; batch on hold and queue re-sequenced.',
      summary: 'PO 1001884747 placed on QA hold; remaining SWCO batches keep flow without the failed slot.',
      bullets: [
        'PO 1001884747 set to HOLD from LSV pass/fail log — Fail (Dent), Line 1 (Pasco extract).',
        'Downstream positions shifted; no ERP write — planner validates.',
        'Next runnable SWCO batches grouped to limit changeover.',
      ],
      impact: 'Impact: Line keeps moving; failed batch isolated until disposition.',
    },
  },
  es: {
    rush: {
      alertBanner: 'Actualización de prioridad SAP — ventana de cliente en riesgo; línea reprogramada.',
      summary: 'Se adelantó PO 1002307551 para proteger la ventana del 2026-07-06.',
      bullets: [
        'PO 1002307551 pasó por delante de PO 1001759341.',
        'Motivo: fecha fin SAP 2026-07-06 y prioridad 2.',
        'Se evitaron ~1,5 h de changeover: misma especie SWCO en Línea 1.',
      ],
      impact: 'Impacto: ventana de cliente protegida · Changeover neto: −1,5 h (heurística Pasco).',
    },
    qa_fail: {
      alertBanner: 'Log pass/fail LSV — Fail registrado; lote en hold y cola reordenada.',
      summary: 'PO 1001884747 en hold QA; el resto de lotes SWCO sigue flujo sin el slot fallido.',
      bullets: [
        'PO 1001884747 en HOLD según log pass/fail LSV — Fail (Dent), Línea 1 (extracto Pasco).',
        'Posiciones siguientes ajustadas; sin escritura en ERP — valida el programador.',
        'Bloques SWCO siguientes agrupados para limitar changeover.',
      ],
      impact: 'Impacto: la línea sigue; lote fallido aislado hasta disposición.',
    },
  },
};

function cloneQueue(rows: QueueRow[]): QueueRow[] {
  return rows.map((r) => ({ ...r }));
}

function annotateReasons(queue: QueueRow[], moves: QueueMove[], eventType: PlantEventType, locale: Locale) {
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

class PlantDemoServer {
  private queue = cloneQueue(BASE_QUEUE);
  private planVersion = 1;
  private lastEvent: PlantEventType | null = null;
  private acceptedPlanVersion: number | null = null;

  reset() {
    this.queue = cloneQueue(BASE_QUEUE);
    this.planVersion = 1;
    this.lastEvent = null;
    this.acceptedPlanVersion = null;
  }

  getQueue(lineId: string): PlantQueueResponse {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    const pendingEvent =
      this.lastEvent != null &&
      !(this.acceptedPlanVersion != null && this.planVersion === this.acceptedPlanVersion);
    return {
      lineId,
      queue: cloneQueue(this.queue),
      planVersion: this.planVersion,
      lastEvent: pendingEvent ? this.lastEvent : null,
      acceptedPlanVersion: this.acceptedPlanVersion,
    };
  }

  applyEvent(lineId: string, type: PlantEventType, locale: Locale): PlantEventResponse {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    const next = cloneQueue(this.queue);
    const moves: QueueMove[] = [];
    const reasons: string[] = [];

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
    } else {
      const failPo = '1001884747';
      const failIdx = next.findIndex((r) => r.po === failPo);
      if (failIdx >= 0) {
        next[failIdx] = { ...next[failIdx], status: 'HOLD', previousPosition: failIdx + 1 };
        const [held] = next.splice(failIdx, 1);
        next.push(held);
        moves.push({ po: failPo, fromPosition: failIdx + 1, toPosition: next.length });
        reasons.push('qa_fail_pass_fail_log', 'isolate_hold', 'resequence_downstream');
      }
    }

    annotateReasons(next, moves, type, locale);
    this.queue = next;
    this.planVersion += 1;
    this.lastEvent = type;
    this.acceptedPlanVersion = null;

    return {
      lineId,
      eventType: type,
      queue: cloneQueue(this.queue),
      planVersion: this.planVersion,
      diff: { moves, reasons },
      explanation: explanations[locale][type],
    };
  }

  accept(lineId: string): { acceptedAt: string; lineId: string; planVersion: number } {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    this.lastEvent = null;
    this.acceptedPlanVersion = this.planVersion;
    return {
      acceptedAt: new Date().toISOString(),
      lineId,
      planVersion: this.planVersion,
    };
  }

  explainBatch(po: string, question: string, locale: Locale): PlantBatchExplainResponse {
    const queue = this.queue.filter((r) => r.status !== 'COMPLETE');
    const index = queue.findIndex((r) => r.po === po);
    if (index < 0) throw new Error('Unknown batch');

    const row = queue[index];
    const position = index + 1;
    const ahead = queue.slice(0, index);
    const q = question.toLowerCase();

    const citations = [
      `PO ${row.po}`,
      `Line 1 queue v${this.planVersion}`,
      row.finish,
    ];

    if (locale === 'es') {
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
          suggestedFollowUps: ['¿Por qué está en posición ' + position + '?'],
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
}

export const plantDemoServer = new PlantDemoServer();

export function getPlantEventExplanation(type: PlantEventType, locale: Locale): PlantExplanation {
  return explanations[locale === 'es' ? 'es' : 'en'][type];
}

export function movedPoSet(moves: QueueMove[]): Set<string> {
  return new Set(moves.map((m) => m.po));
}

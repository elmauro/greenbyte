import type {
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantEventType,
  PlantExplanation,
  PlantQueueResponse,
  QueueMove,
  QueueRow,
} from './plantDemoTypes';
import { PASCO_LINE1_BASELINE } from './pascoLine1Baseline';
import { appendCustomerReason, customerMetaForPo } from './customerOrderMeta';
import {
  DEFAULT_DEMO_QA_FAIL_PO,
  DEFAULT_DEMO_RUSH_PO,
} from './plantEventUtils';
import { buildExplainReplan } from './plantExplanationBuilder';

export const PLANT_DEMO_LINE_ID = 'line-1';

type Locale = 'en' | 'es';

const BASE_QUEUE: QueueRow[] = PASCO_LINE1_BASELINE;

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

export type PlantApplyEventOptions = {
  po?: string;
  focusPo?: string;
  failedFor?: string;
  priority?: number;
  scheduledFinish?: string;
  trigger?: string;
  species?: string;
  kg?: number;
  finish?: string;
  customerOrderId?: string;
};

class PlantDemoServer {
  private queue = cloneQueue(BASE_QUEUE);
  private planVersion = 1;
  private lastEvent: PlantEventType | null = null;
  private acceptedPlanVersion: number | null = null;
  private pendingExplanation: PlantExplanation | null = null;
  private pendingDiff: PlantEventResponse['diff'] | null = null;

  reset() {
    this.queue = cloneQueue(BASE_QUEUE).map((row) => ({
      po: row.po,
      species: row.species,
      kg: row.kg,
      finish: row.finish,
      status: 'PENDING',
    }));
    this.planVersion = 1;
    this.lastEvent = null;
    this.acceptedPlanVersion = null;
    this.pendingExplanation = null;
    this.pendingDiff = null;
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
      pendingExplanation: pendingEvent ? this.pendingExplanation : null,
      pendingDiff: pendingEvent ? this.pendingDiff : null,
    };
  }

  applyEvent(
    lineId: string,
    type: PlantEventType,
    locale: Locale,
    options: PlantApplyEventOptions = {},
  ): PlantEventResponse {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    const next = cloneQueue(this.queue);
    const moves: QueueMove[] = [];
    const reasons: string[] = [];

    if (type === 'rush') {
      const rushPo = options.focusPo ?? DEFAULT_DEMO_RUSH_PO;
      const fromIdx = next.findIndex((r) => r.po === rushPo);
      const toIdx = 0;
      if (fromIdx > toIdx) {
        const [row] = next.splice(fromIdx, 1);
        row.previousPosition = fromIdx + 1;
        next.splice(toIdx, 0, row);
        moves.push({ po: rushPo, fromPosition: fromIdx + 1, toPosition: toIdx + 1 });
        reasons.push('priority_2', 'sap_finish_2026-07-06', 'same_species_changeover');
        appendCustomerReason(reasons, rushPo);
      }
    } else {
      const failPo = options.focusPo ?? DEFAULT_DEMO_QA_FAIL_PO;
      const failedFor = options.failedFor ?? 'Dent';
      const failIdx = next.findIndex((r) => r.po === failPo);
      if (failIdx >= 0) {
        next[failIdx] = { ...next[failIdx], status: 'HOLD', previousPosition: failIdx + 1 };
        const [held] = next.splice(failIdx, 1);
        next.push(held);
        moves.push({ po: failPo, fromPosition: failIdx + 1, toPosition: next.length });
        reasons.push(
          'qa_fail_pass_fail_log',
          'isolate_hold',
          'resequence_downstream',
          `failed_for_${failedFor.toLowerCase()}`,
        );
      }
    }

    annotateReasons(next, moves, type, locale);
    this.queue = next;
    this.planVersion += 1;
    this.lastEvent = type;
    this.acceptedPlanVersion = null;
    const diff = { moves, reasons };
    const explanation = buildExplainReplan(locale, type, {
      focusPo: type === 'rush' ? options.focusPo ?? DEFAULT_DEMO_RUSH_PO : options.focusPo ?? DEFAULT_DEMO_QA_FAIL_PO,
      failedFor: options.failedFor,
      priority: options.priority,
      scheduledFinish: options.scheduledFinish,
      trigger: options.trigger,
      moves,
      queue: next,
    });
    this.pendingExplanation = explanation;
    this.pendingDiff = diff;

    return {
      lineId,
      eventType: type,
      queue: cloneQueue(this.queue),
      planVersion: this.planVersion,
      diff,
      explanation,
    };
  }

  /** Append new PO if missing, then move to head (Syngenta SAP refresh script C). */
  applySapQueueRefresh(lineId: string, locale: Locale, options: PlantApplyEventOptions): PlantEventResponse {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    const po = options.focusPo ?? options.po;
    if (!po) throw new Error('po required');

    const next = cloneQueue(this.queue);
    const moves: QueueMove[] = [];
    const reasons: string[] = ['sap_coispi_refresh', 'rush_new_po'];

    let idx = next.findIndex((r) => r.po === po);
    if (idx < 0) {
      const meta = customerMetaForPo(po);
      const finish = options.scheduledFinish ?? options.finish ?? '2026-07-07 08:00';
      next.push({
        po,
        species: options.species ?? 'SWCO',
        kg: options.kg ?? 6200,
        finish,
        status: 'PLANNED',
        atRisk: true,
        reasonShort: locale === 'es' ? 'Nuevo PO activo — refresh SAP' : 'New active PO — SAP refresh',
        customerOrderId: meta?.customerOrderId ?? options.customerOrderId,
      });
      idx = next.length - 1;
      reasons.push('new_active_po');
    }

    appendCustomerReason(reasons, po);
    if (options.priority === 2) reasons.push('priority_2');

    if (idx > 0) {
      const [row] = next.splice(idx, 1);
      row.previousPosition = idx + 1;
      next.splice(0, 0, row);
      moves.push({ po, fromPosition: idx + 1, toPosition: 1 });
      reasons.push('same_species_changeover');
    }

    annotateReasons(next, moves, 'rush', locale);
    this.queue = next;
    this.planVersion += 1;
    this.lastEvent = 'rush';
    this.acceptedPlanVersion = null;
    const diff = { moves, reasons };
    const explanation = buildExplainReplan(locale, 'rush', {
      focusPo: po,
      priority: options.priority,
      scheduledFinish: options.scheduledFinish ?? options.finish,
      trigger: 'sap_queue_refresh',
      moves,
      queue: next,
    });
    this.pendingExplanation = explanation;
    this.pendingDiff = diff;

    return {
      lineId,
      eventType: 'rush',
      queue: cloneQueue(this.queue),
      planVersion: this.planVersion,
      diff,
      explanation,
    };
  }

  accept(lineId: string): { acceptedAt: string; lineId: string; planVersion: number } {
    if (lineId !== PLANT_DEMO_LINE_ID) throw new Error('Unknown line');
    this.lastEvent = null;
    this.pendingExplanation = null;
    this.pendingDiff = null;
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
    const rush = !/[?¿]/.test(question) && /\brush\b|\bexpedite\b|\bmove (it|this) up\b|\bm[aá]rcalo rush\b/.test(q);

    const citations = [
      `PO ${row.po}`,
      `Line 1 queue v${this.planVersion}`,
      row.finish,
    ];

    if (rush) {
      return {
        po,
        action: 'rush',
        answer: locale === 'es'
          ? `Rush enviado para PO ${po}. El plan nuevo queda propuesto y hay que aceptarlo. Nada se escribe en SAP.`
          : `Rush sent for PO ${po}. The new plan is proposed and waiting to be accepted. Nothing is written to SAP.`,
        citations,
        suggestedFollowUps: locale === 'es' ? ['¿Por qué está esperando?'] : ['Why is it waiting?'],
      };
    }

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
  const loc = locale === 'es' ? 'es' : 'en';
  return buildExplainReplan(loc, type, {
    focusPo: type === 'rush' ? DEFAULT_DEMO_RUSH_PO : DEFAULT_DEMO_QA_FAIL_PO,
  });
}

export function movedPoSet(moves: QueueMove[]): Set<string> {
  return new Set(moves.map((m) => m.po));
}

import { customerMetaForPo } from './customerOrderMeta.js';

/**
 * Stub Agent explain-replan — grounded in diff + ingest context (swap for David API when live).
 * @param {'en' | 'es'} loc
 * @param {'rush' | 'qa_fail' | 'queue_refresh'} eventType
 * @param {object} ctx
 */
export function buildExplainReplan(loc, eventType, ctx) {
  const {
    focusPo,
    failedFor,
    priority,
    trigger,
    moves = [],
    queue = [],
  } = ctx;

  const added = Array.isArray(ctx.added) ? ctx.added : [];
  const po = focusPo ?? added[0] ?? moves[0]?.po ?? '—';
  const ownMove = moves.find((row) => String(row.po) === String(po)) ?? null;
  const focusRow = queue.find((row) => String(row.po) === String(po));
  const queueIndex = queue.findIndex((row) => String(row.po) === String(po));
  const position = queueIndex >= 0 ? queueIndex + 1 : ownMove?.toPosition ?? null;
  const species = focusRow?.species ? String(focusRow.species) : null;
  const customer = customerMetaForPo(po);
  const fromPosition = ownMove?.fromPosition;
  const toPosition = ownMove?.toPosition;
  const isAdded = added.some((id) => String(id) === String(po));
  const isRefresh = trigger === 'sap_queue_refresh' || eventType === 'queue_refresh';
  const isQa = eventType === 'qa_fail';
  const failLabel = failedFor ?? 'Dent';
  const lineNo = String(ctx.lineId ?? 'line-1').match(/(\d+)\s*$/)?.[1] ?? '1';
  const dueFromReason = String(focusRow?.reasonShort ?? '').match(/due (\d{4}-\d{2}-\d{2})/);
  const due = ctx.scheduledFinish
    ? String(ctx.scheduledFinish).slice(0, 10)
    : dueFromReason?.[1] ?? null;
  const projected = focusRow?.finish ? String(focusRow.finish).slice(0, 10) : null;

  if (loc === 'es') {
    if (!isQa) {
      const banner = isRefresh
        ? `Refresh SAP COISPI — nuevo PO activo en Línea ${lineNo}; cola replanificada.`
        : 'Actualización de prioridad SAP — ventana de cliente en riesgo; línea reprogramada.';
      const moveLine = isAdded
        ? `PO ${po} entró en la posición ${position ?? '—'}.`
        : toPosition != null && fromPosition != null
          ? `PO ${po} pasó de la posición ${fromPosition} a la ${toPosition}.`
          : toPosition != null
            ? `PO ${po} quedó en la posición ${toPosition}.`
            : position != null
              ? `PO ${po} quedó en la posición ${position}.`
              : `PO ${po} se adelantó en la cola.`;
      const dueLine =
        due && projected ? `Fecha SAP ${due}. Fin proyectado ${projected}.` : null;
      const summary = isRefresh
        ? `PO ${po} entró en la Línea ${lineNo}${position != null ? ` en la posición ${position}` : ''}${due ? `, con fecha SAP ${due}` : ''}${projected ? ` y fin proyectado ${projected}` : ''}.`
        : moveLine;
      const bullets = [
        moveLine,
        dueLine,
        priority != null ? `Prioridad SAP: ${priority}.` : 'Señal de prioridad / fecha fin SAP.',
        species
          ? `Especie ${species}.`
          : customer
            ? `Pedido cliente ${customer.customerOrderId} — ventana ${customer.customerWindow}.`
            : `Changeover según la especie del lote en Línea ${lineNo}.`,
        'Sin escritura ERP — valida el programador.',
      ];
      return {
        alertBanner: banner,
        summary,
        bullets: bullets.filter(Boolean),
        impact: 'Impacto: ventana de cliente / rush cubierto · Changeover neto estimado (heurística Pasco).',
      };
    }
    return {
      alertBanner: 'Log pass/fail LSV — Fail registrado; lote en hold y cola reordenada.',
      summary: `PO ${po} en hold QA (${failLabel}); el resto de lotes sigue flujo sin el slot fallido.`,
      bullets: [
        `PO ${po} en HOLD — Fail (${failLabel}), Línea 1 (extracto Pasco).`,
        'Posiciones siguientes ajustadas; sin escritura en ERP.',
        'Bloques siguientes agrupados para limitar changeover.',
      ],
      impact: 'Impacto: la línea sigue; lote fallido aislado hasta disposición.',
    };
  }

  if (!isQa) {
    const banner = isRefresh
      ? `SAP COISPI refresh — new active PO on Line ${lineNo}; queue replanned.`
      : 'SAP priority update — customer window at risk; line replanned.';
    const moveLine = isAdded
      ? `Added PO ${po} at position ${position ?? '—'}.`
      : toPosition != null && fromPosition != null
        ? `Moved PO ${po} from position ${fromPosition} to position ${toPosition}.`
        : toPosition != null
          ? `Moved PO ${po} to position ${toPosition}.`
          : position != null
            ? `PO ${po} is at position ${position}.`
            : `Moved PO ${po} ahead in the queue.`;
    const dueLine = due && projected ? `SAP due ${due}. Projected finish ${projected}.` : null;
    const summary = isRefresh
      ? `PO ${po} entered Line ${lineNo}${position != null ? ` at position ${position}` : ''}${due ? `, SAP due ${due}` : ''}${projected ? `, projected finish ${projected}` : ''}.`
      : moveLine;
    const bullets = [
      moveLine,
      dueLine,
      priority != null ? `SAP priority: ${priority}.` : 'SAP finish / priority signal applied.',
      species
        ? `Species ${species}.`
        : customer
          ? `Customer order ${customer.customerOrderId} — window ${customer.customerWindow}.`
          : `Changeover follows the batch species on Line ${lineNo}.`,
      'No ERP write — planner validates.',
    ];
    return {
      alertBanner: banner,
      summary,
      bullets: bullets.filter(Boolean),
      impact: 'Impact: customer / rush window protected · Net changeover heuristic (Pasco).',
    };
  }

  return {
    alertBanner: 'LSV pass/fail log — Fail recorded; batch on hold and queue re-sequenced.',
    summary: `PO ${po} placed on QA hold (${failLabel}); remaining batches keep flow without the failed slot.`,
    bullets: [
      `PO ${po} set to HOLD from LSV pass/fail log — Fail (${failLabel}), Line 1 (Pasco extract).`,
      'Downstream positions shifted; no ERP write — planner validates.',
      'Next runnable batches grouped to limit changeover.',
    ],
    impact: 'Impact: line keeps moving; failed batch isolated until disposition.',
  };
}

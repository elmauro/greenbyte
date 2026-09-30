import { customerMetaForPo } from './customerOrderMeta.js';

/**
 * Stub Agent explain-replan — grounded in diff + ingest context (swap for David API when live).
 * @param {'en' | 'es'} loc
 * @param {'rush' | 'qa_fail'} eventType
 * @param {object} ctx
 */
export function buildExplainReplan(loc, eventType, ctx) {
  const {
    focusPo,
    failedFor,
    priority,
    scheduledFinish,
    trigger,
    moves = [],
    queue = [],
  } = ctx;

  const po = focusPo ?? moves[0]?.po ?? '—';
  const aheadPo = queue.find((r) => r.status === 'PLANNED' && r.po !== po)?.po;
  const customer = customerMetaForPo(po);
  const isRefresh = trigger === 'sap_queue_refresh';
  const failLabel = failedFor ?? 'Dent';

  if (loc === 'es') {
    if (eventType === 'rush') {
      const banner = isRefresh
        ? 'Refresh SAP COISPI — nuevo PO activo en Línea 1; cola replanificada.'
        : 'Actualización de prioridad SAP — ventana de cliente en riesgo; línea reprogramada.';
      const summary = isRefresh
        ? `PO ${po} entró en la cola activa y se adelantó para cubrir urgencia (refresh SAP).`
        : `Se adelantó PO ${po} para proteger la ventana${scheduledFinish ? ` ${scheduledFinish}` : ' del cliente'}.`;
      const bullets = [
        `PO ${po} pasó a posición 1${aheadPo ? ` (antes detrás de PO ${aheadPo})` : ''}.`,
        priority != null ? `Prioridad SAP: ${priority}.` : 'Señal de prioridad / fecha fin SAP.',
        customer
          ? `Pedido cliente ${customer.customerOrderId} — ventana ${customer.customerWindow}.`
          : 'Changeover: misma especie SWCO en Línea 1 cuando aplica.',
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

  if (eventType === 'rush') {
    const banner = isRefresh
      ? 'SAP COISPI refresh — new active PO on Line 1; queue replanned.'
      : 'SAP priority update — customer window at risk; line replanned.';
    const summary = isRefresh
      ? `PO ${po} entered the active queue and was moved up for rush coverage (SAP refresh).`
      : `Moved PO ${po} ahead to protect the${scheduledFinish ? ` ${scheduledFinish}` : ''} customer window.`;
    const bullets = [
      `Moved PO ${po} to position 1${aheadPo ? ` (was behind PO ${aheadPo})` : ''}.`,
      priority != null ? `SAP priority: ${priority}.` : 'SAP finish / priority signal applied.',
      customer
        ? `Customer order ${customer.customerOrderId} — window ${customer.customerWindow}.`
        : 'Changeover: same species SWCO on Line 1 where applicable.',
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

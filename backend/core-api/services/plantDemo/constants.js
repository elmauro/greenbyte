export const PLANT_DEMO_LINE_ID = 'line-1';

export const BASE_QUEUE = [
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

export const EXPLANATIONS = {
  en: {
    rush: {
      alertBanner: 'Event injected: Rush batch — customer window at risk.',
      summary: 'Moved PO 1002307551 ahead to protect the 2026-07-06 customer window.',
      bullets: [
        'Moved PO 1002307551 ahead of PO 1001759341.',
        'Reason: SAP finish date 2026-07-06 and priority 2.',
        'Avoided ~1.5h changeover: same species SWCO on Line 1.',
      ],
      impact: 'Impact: Customer window protected · Net changeover: −1.5h (Pasco heuristic).',
    },
    qa_fail: {
      alertBanner: 'Event injected: Failed QA test — batch moved to hold and queue re-sequenced.',
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
      alertBanner: 'Evento inyectado: Lote rush — ventana de cliente en riesgo.',
      summary: 'Se adelantó PO 1002307551 para proteger la ventana del 2026-07-06.',
      bullets: [
        'PO 1002307551 pasó por delante de PO 1001759341.',
        'Motivo: fecha fin SAP 2026-07-06 y prioridad 2.',
        'Se evitaron ~1,5 h de changeover: misma especie SWCO en Línea 1.',
      ],
      impact: 'Impacto: ventana de cliente protegida · Changeover neto: −1,5 h (heurística Pasco).',
    },
    qa_fail: {
      alertBanner: 'Evento inyectado: Test QA fallido — lote en hold y cola reordenada.',
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

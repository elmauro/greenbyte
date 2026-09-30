import { PASCO_LINE1_BASELINE } from './pascoLine1Baseline.js';

export const PLANT_DEMO_LINE_ID = 'line-1';

/** Pasco Line 1 queue — see pascoLine1Baseline.js (generated from Syngenta extracts). */
export const BASE_QUEUE = PASCO_LINE1_BASELINE;

export const EXPLANATIONS = {
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

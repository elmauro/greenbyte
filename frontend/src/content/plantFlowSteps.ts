export type Uc1FlowSlideTitleKey = 's01' | 's02' | 's03' | 's03c' | 's03b' | 's04' | 's05' | 's06' | 's07';

export type PlantFlowPreviewKind =
  | 'load'
  | 'at_risk'
  | 'rush'
  | 'rush_refresh'
  | 'qa'
  | 'copilot'
  | 'timeline'
  | 'accept'
  | 'explain';

/** i18n key under plantFlowGallery.backendOwners */
export type PlantFlowBackendOwnerKey = Uc1FlowSlideTitleKey;

export type PlantFlowStepConfig = {
  id: string;
  titleKey: Uc1FlowSlideTitleKey;
  backendOwnerKey: PlantFlowBackendOwnerKey;
  preview: PlantFlowPreviewKind;
  method: 'GET' | 'POST';
  path: string;
  request?: Record<string, unknown>;
  responseKey: keyof PlantFlowResponseKeys;
  mapping: { jsonPath: string; ui: string }[];
};

/** Keys into PlantFlowSnapshots for JSON panel */
export type PlantFlowResponseKeys = {
  load: true;
  rush: true;
  refresh: true;
  qa: true;
  accept: true;
  explain: true;
};

export const PLANT_FLOW_STEPS: PlantFlowStepConfig[] = [
  {
    id: '01',
    titleKey: 's01',
    backendOwnerKey: 's01',
    preview: 'load',
    method: 'GET',
    path: '/demo/plant/lines/{lineId}/queue',
    responseKey: 'load',
    mapping: [
      { jsonPath: 'lineId', ui: 'Line selector — line-1 or line-2 (demo_line_id)' },
      { jsonPath: 'queue[].po', ui: 'PO column' },
      { jsonPath: 'queue[].species', ui: 'Species' },
      { jsonPath: 'queue[].kg', ui: 'Kg' },
      { jsonPath: 'queue[].finish', ui: 'Scheduled finish' },
      { jsonPath: 'queue[].status', ui: 'Status badge' },
      { jsonPath: 'queue[].reasonShort', ui: 'Reason column' },
      { jsonPath: 'queue[].customerOrderId', ui: 'Customer order (demo proxy)' },
      { jsonPath: 'pendingExplanation', ui: 'Copilot (when replan pending on poll)' },
    ],
  },
  {
    id: '02',
    titleKey: 's02',
    backendOwnerKey: 's02',
    preview: 'at_risk',
    method: 'GET',
    path: '/demo/plant/lines/{lineId}/queue',
    responseKey: 'load',
    mapping: [
      { jsonPath: 'queue[].finish', ui: 'Scheduled finish (highlighted)' },
      { jsonPath: 'queue[].atRisk', ui: 'AT RISK badge' },
      { jsonPath: 'queue[].reasonShort', ui: 'Reason text' },
    ],
  },
  {
    id: '03',
    titleKey: 's03',
    backendOwnerKey: 's03',
    preview: 'rush',
    method: 'POST',
    path: '/demo/plant/ingest/sap-priority-change',
    request: {
      po: '1002307551',
      priority: 2,
      scheduledFinish: '2026-10-29',
      lineId: 'line-2',
      locale: 'en|es',
    },
    responseKey: 'rush',
    mapping: [
      { jsonPath: 'queue[]', ui: 'Table reorder' },
      { jsonPath: 'diff.moves[]', ui: 'Gantt highlight PO' },
      { jsonPath: 'diff.reasons[]', ui: 'Includes customer_order when PO has order proxy' },
      { jsonPath: 'explanation.alertBanner', ui: 'Alert bar' },
      { jsonPath: 'source', ui: 'sap_priority_change' },
    ],
  },
  {
    id: '03c',
    titleKey: 's03c',
    backendOwnerKey: 's03c',
    preview: 'rush_refresh',
    method: 'POST',
    path: '/demo/plant/ingest/sap-queue-refresh',
    request: {
      po: '1002408120',
      species: 'SWCO',
      kg: 6200,
      scheduledFinish: '2026-07-07 08:00',
      priority: 2,
      lineId: 'line-1',
      locale: 'en|es',
    },
    responseKey: 'refresh',
    mapping: [
      { jsonPath: 'eventType', ui: 'queue_refresh — new open PO, then a proposed plan' },
      { jsonPath: 'queue[]', ui: 'Recommended order for the line (not only the new PO at the head)' },
      { jsonPath: 'diff', ui: 'Moves and reasons for each position' },
      { jsonPath: 'source', ui: 'etl_refresh' },
    ],
  },
  {
    id: '03b',
    titleKey: 's03b',
    backendOwnerKey: 's03b',
    preview: 'qa',
    method: 'POST',
    path: '/demo/plant/ingest/pass-fail-log',
    request: {
      po: '1002266350',
      passFail: 'Fail',
      failedFor: 'Dent',
      equipmentId: 'Line 1',
      lineId: 'line-1',
      locale: 'en|es',
    },
    responseKey: 'qa',
    mapping: [
      { jsonPath: 'queue[].status=HOLD', ui: 'QA HOLD badge' },
      { jsonPath: 'explanation.bullets[]', ui: 'Copilot cites failedFor (e.g. Dent, Discolored)' },
      { jsonPath: 'source', ui: 'pass_fail_log' },
    ],
  },
  {
    id: '04',
    titleKey: 's04',
    backendOwnerKey: 's04',
    preview: 'copilot',
    method: 'POST',
    path: 'Ingest → BFF → Data replan → Agent POST /explain-replan',
    responseKey: 'rush',
    mapping: [
      { jsonPath: 'explanation.summary', ui: 'Copilot lead' },
      { jsonPath: 'explanation.bullets[]', ui: 'Bullet list' },
      { jsonPath: 'explanation.impact', ui: 'Impact box' },
    ],
  },
  {
    id: '05',
    titleKey: 's05',
    backendOwnerKey: 's05',
    preview: 'timeline',
    method: 'GET',
    path: '/demo/plant/lines/{lineId}/queue (poll ~5s after ingest)',
    responseKey: 'rush',
    mapping: [
      { jsonPath: 'queue[].finish', ui: 'Timeline bar position' },
      { jsonPath: 'queue[].species', ui: 'Bar color (SWCO/CORN)' },
    ],
  },
  {
    id: '06',
    titleKey: 's06',
    backendOwnerKey: 's06',
    preview: 'accept',
    method: 'POST',
    path: '/demo/plant/schedule/accept',
    request: { lineId: 'line-1' },
    responseKey: 'accept',
    mapping: [
      { jsonPath: 'acceptedAt', ui: 'Confirmation note' },
      { jsonPath: 'planVersion', ui: 'Accepted plan version' },
    ],
  },
  {
    id: '07',
    titleKey: 's07',
    backendOwnerKey: 's07',
    preview: 'explain',
    method: 'POST',
    path: '/demo/plant/batches/explain',
    request: { po: '1002307551', question: 'When does it ship?', locale: 'en|es' },
    responseKey: 'explain',
    mapping: [
      { jsonPath: 'answer', ui: 'Chat answer' },
      { jsonPath: 'citations[]', ui: 'Sources line' },
    ],
  },
];

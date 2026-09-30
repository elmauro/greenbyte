/**
 * Camilo (Data API) and David (Agent API) route templates.
 * BFF orchestration calls these paths — never exposed to the browser.
 * @see docs/hackathon/uc1-bff-data-agent-route-map.md
 */

/** @typedef {'rush' | 'qa_fail'} Uc1ReplanType */

export const DATA_API_PATHS = {
  lineQueue: (lineId) => `/lines/${lineId}/queue`,
  scheduleReplan: '/schedule/replan',
  scheduleRefreshFromSap: '/schedule/refresh-from-sap',
  batchByPo: (po) => `/batches/${po}`,
};

export const AGENT_API_PATHS = {
  explainReplan: '/explain-replan',
  batchExplain: '/batches/explain',
};

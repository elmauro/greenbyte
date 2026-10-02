import {
  DEFAULT_DEMO_QA_FAIL_PO,
  DEFAULT_DEMO_RUSH_PO,
} from '../demo/plant/plantEventUtils';
import { PLANT_DEMO_LINE_ID, plantDemoServer } from '../demo/plant/plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantIngestPassFailRequest,
  PlantIngestSapPriorityRequest,
  PlantIngestSapQueueRefreshRequest,
  PlantQueueResponse,
} from '../demo/plant/plantDemoTypes';
import type { Locale } from '../i18n';
import { apiBaseApp, getApiConnectionMode } from './apiConfig';
import { axiosApp } from './axiosInstance';

/** True when HTTP goes to BFF (live API Gateway). */
const useLiveBff = getApiConnectionMode() === 'bff';

/** True when HTTP goes through axios (MSW or live BFF). */
const useHttp = getApiConnectionMode() !== 'in-process';

async function getQueue(
  lineId: string = PLANT_DEMO_LINE_ID,
  locale?: Locale,
): Promise<PlantQueueResponse> {
  if (!useHttp) return plantDemoServer.getQueue(lineId);
  const { data } = await axiosApp.get<PlantQueueResponse>(`/demo/plant/lines/${lineId}/queue`, {
    params: locale ? { locale } : undefined,
  });
  return data;
}

async function postAccept(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantAcceptResponse> {
  if (!useHttp) return plantDemoServer.accept(lineId);
  const { data } = await axiosApp.post<PlantAcceptResponse>(`/demo/plant/schedule/accept`, { lineId });
  return data;
}

async function postIngestPassFailLog(
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
  overrides: Partial<PlantIngestPassFailRequest> = {},
): Promise<PlantEventResponse> {
  const body: PlantIngestPassFailRequest = {
    lineId,
    locale,
    po: DEFAULT_DEMO_QA_FAIL_PO,
    passFail: 'Fail',
    failedFor: 'Dent',
    equipmentId: 'Line 1',
    ...overrides,
  };
  if (!useHttp) {
    return {
      ...plantDemoServer.applyEvent(lineId, 'qa_fail', locale, {
        focusPo: body.po,
        failedFor: body.failedFor,
      }),
      source: 'pass_fail_log',
    };
  }
  const { data } = await axiosApp.post<PlantEventResponse>(`/demo/plant/ingest/pass-fail-log`, body);
  return data;
}

async function postIngestSapPriorityChange(
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
  overrides: Partial<PlantIngestSapPriorityRequest> = {},
): Promise<PlantEventResponse> {
  const body: PlantIngestSapPriorityRequest = {
    lineId,
    locale,
    po: DEFAULT_DEMO_RUSH_PO,
    priority: 2,
    scheduledFinish: '2026-07-06 09:00',
    ...overrides,
  };
  if (!useHttp) {
    return {
      ...plantDemoServer.applyEvent(lineId, 'rush', locale, {
        focusPo: body.po,
        priority: body.priority,
        scheduledFinish: body.scheduledFinish,
      }),
      source: 'sap_priority_change',
    };
  }
  const { data } = await axiosApp.post<PlantEventResponse>(
    `/demo/plant/ingest/sap-priority-change`,
    body,
  );
  return data;
}

async function postIngestSapQueueRefresh(
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
  overrides: Partial<PlantIngestSapQueueRefreshRequest> = {},
): Promise<PlantEventResponse> {
  const body: PlantIngestSapQueueRefreshRequest = {
    lineId,
    locale,
    po: '1002408120',
    species: 'SWCO',
    kg: 6200,
    scheduledFinish: '2026-07-07 08:00',
    priority: 2,
    ...overrides,
  };
  if (!useHttp) {
    return {
      ...plantDemoServer.applySapQueueRefresh(lineId, locale, {
        po: body.po,
        focusPo: body.po,
        species: body.species,
        kg: body.kg,
        scheduledFinish: body.scheduledFinish ?? body.finish,
        finish: body.finish,
        priority: body.priority,
        customerOrderId: body.customerOrderId,
      }),
      source: 'sap_queue_refresh',
    };
  }
  const { data } = await axiosApp.post<PlantEventResponse>(
    `/demo/plant/ingest/sap-queue-refresh`,
    body,
  );
  return data;
}

/** Drops the line's plan. Orders stay, in open-queue order, with no schedule. */
async function stageRawLine(lineId: string): Promise<void> {
  if (!useHttp) {
    plantDemoServer.reset();
    return;
  }
  await axiosApp.post('/demo/plant/demo/stage-raw', { lineId });
}

/** One scheduler run over the orders already on the line. */
async function planLine(lineId: string): Promise<void> {
  if (!useHttp) return;
  await axiosApp.post('/demo/plant/demo/plan-line', { lineId }, { timeout: 120_000 });
}

async function postBatchExplain(
  po: string,
  question: string,
  locale: Locale,
  options: { lineId?: string; history?: { role: 'user' | 'copilot'; text: string }[] } = {},
): Promise<PlantBatchExplainResponse> {
  if (!useHttp) return plantDemoServer.explainBatch(po, question, locale);
  const { data } = await axiosApp.post<PlantBatchExplainResponse>(`/demo/plant/batches/explain`, {
    po,
    question,
    locale,
    lineId: options.lineId,
    history: options.history?.slice(-4),
  });
  return data;
}

export const plantDemoApi = {
  getQueue,
  postIngestPassFailLog,
  postIngestSapPriorityChange,
  postIngestSapQueueRefresh,
  postAccept,
  postBatchExplain,
  stageRawLine,
  planLine,
  /** @deprecated use connectionMode === 'bff' */
  useRemoteBff: useLiveBff,
  connectionMode: getApiConnectionMode(),
  apiBaseApp,
};

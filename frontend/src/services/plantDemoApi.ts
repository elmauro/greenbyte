import { PLANT_DEMO_LINE_ID, plantDemoServer } from '../demo/plant/plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantEventType,
  PlantIngestPassFailRequest,
  PlantIngestSapPriorityRequest,
  PlantQueueResponse,
} from '../demo/plant/plantDemoTypes';
import type { Locale } from '../i18n';
import { apiBaseApp, getApiConnectionMode } from './apiConfig';
import { axiosApp } from './axiosInstance';

/** True when HTTP goes to BFF (live API Gateway). */
const useLiveBff = getApiConnectionMode() === 'bff';

/** True when HTTP goes through axios (MSW or live BFF). */
const useHttp = getApiConnectionMode() !== 'in-process';

async function getQueue(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantQueueResponse> {
  if (!useHttp) return plantDemoServer.getQueue(lineId);
  const { data } = await axiosApp.get<PlantQueueResponse>(`/demo/plant/lines/${lineId}/queue`);
  return data;
}

async function postEvent(
  type: PlantEventType,
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
): Promise<PlantEventResponse> {
  if (!useHttp) return plantDemoServer.applyEvent(lineId, type, locale);
  const { data } = await axiosApp.post<PlantEventResponse>(`/demo/plant/events`, {
    type,
    lineId,
    locale,
  });
  return data;
}

async function postAccept(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantAcceptResponse> {
  if (!useHttp) return plantDemoServer.accept(lineId);
  const { data } = await axiosApp.post<PlantAcceptResponse>(`/demo/plant/schedule/accept`, { lineId });
  return data;
}

async function resetDemo(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantQueueResponse> {
  if (!useHttp) {
    plantDemoServer.reset();
    return plantDemoServer.getQueue(lineId);
  }
  const { data } = await axiosApp.post<PlantQueueResponse>(`/demo/plant/reset`, { lineId });
  return data;
}

async function postIngestPassFailLog(
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
): Promise<PlantEventResponse> {
  const body: PlantIngestPassFailRequest = {
    lineId,
    locale,
    po: '1001884747',
    passFail: 'Fail',
    failedFor: 'Dent',
    equipmentId: 'Line 1',
  };
  if (!useHttp) {
    return { ...plantDemoServer.applyEvent(lineId, 'qa_fail', locale), source: 'pass_fail_log' };
  }
  const { data } = await axiosApp.post<PlantEventResponse>(`/demo/plant/ingest/pass-fail-log`, body);
  return data;
}

async function postIngestSapPriorityChange(
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
): Promise<PlantEventResponse> {
  const body: PlantIngestSapPriorityRequest = {
    lineId,
    locale,
    po: '1002307551',
    priority: 2,
    scheduledFinish: '2026-07-06 09:00',
  };
  if (!useHttp) {
    return { ...plantDemoServer.applyEvent(lineId, 'rush', locale), source: 'sap_priority_change' };
  }
  const { data } = await axiosApp.post<PlantEventResponse>(
    `/demo/plant/ingest/sap-priority-change`,
    body,
  );
  return data;
}

async function postBatchExplain(
  po: string,
  question: string,
  locale: Locale,
): Promise<PlantBatchExplainResponse> {
  if (!useHttp) return plantDemoServer.explainBatch(po, question, locale);
  const { data } = await axiosApp.post<PlantBatchExplainResponse>(`/demo/plant/batches/explain`, {
    po,
    question,
    locale,
  });
  return data;
}

export const plantDemoApi = {
  getQueue,
  /** Legacy demo inject — prefer ingest routes; not exposed in scheduler UI. */
  postEvent,
  postIngestPassFailLog,
  postIngestSapPriorityChange,
  postAccept,
  resetDemo,
  postBatchExplain,
  /** @deprecated use connectionMode === 'bff' */
  useRemoteBff: useLiveBff,
  connectionMode: getApiConnectionMode(),
  apiBaseApp,
};

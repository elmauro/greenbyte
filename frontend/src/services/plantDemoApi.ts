import { PLANT_DEMO_LINE_ID, plantDemoServer } from '../demo/plant/plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantEventType,
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
  postEvent,
  postAccept,
  resetDemo,
  postBatchExplain,
  /** @deprecated use connectionMode === 'bff' */
  useRemoteBff: useLiveBff,
  connectionMode: getApiConnectionMode(),
  apiBaseApp,
};

import { PLANT_DEMO_LINE_ID, plantDemoServer } from '../demo/plant/plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantEventResponse,
  PlantEventType,
  PlantQueueResponse,
} from '../demo/plant/plantDemoTypes';
import type { Locale } from '../i18n';
import { apiConfig } from './apiConfig';
import { axiosApp } from './axiosInstance';

const useRemoteBff = Boolean(apiConfig.apiBaseApp?.trim());

async function getQueue(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantQueueResponse> {
  if (!useRemoteBff) return plantDemoServer.getQueue(lineId);
  const { data } = await axiosApp.get<PlantQueueResponse>(`/demo/plant/lines/${lineId}/queue`);
  return data;
}

async function postEvent(
  type: PlantEventType,
  locale: Locale,
  lineId: string = PLANT_DEMO_LINE_ID,
): Promise<PlantEventResponse> {
  if (!useRemoteBff) return plantDemoServer.applyEvent(lineId, type, locale);
  const { data } = await axiosApp.post<PlantEventResponse>(`/demo/plant/events`, {
    type,
    lineId,
    locale,
  });
  return data;
}

async function postAccept(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantAcceptResponse> {
  if (!useRemoteBff) return plantDemoServer.accept(lineId);
  const { data } = await axiosApp.post<PlantAcceptResponse>(`/demo/plant/schedule/accept`, { lineId });
  return data;
}

async function resetDemo(lineId: string = PLANT_DEMO_LINE_ID): Promise<PlantQueueResponse> {
  if (!useRemoteBff) {
    plantDemoServer.reset();
    return plantDemoServer.getQueue(lineId);
  }
  const { data } = await axiosApp.post<PlantQueueResponse>(`/demo/plant/reset`, { lineId });
  return data;
}

export const plantDemoApi = {
  getQueue,
  postEvent,
  postAccept,
  resetDemo,
  useRemoteBff,
};

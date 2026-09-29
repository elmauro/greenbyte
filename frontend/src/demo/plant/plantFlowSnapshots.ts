import { PLANT_DEMO_LINE_ID, plantDemoServer } from './plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantQueueResponse,
} from './plantDemoTypes';
import type { Locale } from '../../i18n/LocaleContext';

export type PlantFlowSnapshots = {
  load: PlantQueueResponse;
  rush: PlantEventResponse;
  qa: PlantEventResponse;
  accept: PlantAcceptResponse;
  explain: PlantBatchExplainResponse;
};

/** Isolated mock payloads per flow step (resets singleton after). */
export function buildPlantFlowSnapshots(locale: Locale): PlantFlowSnapshots {
  plantDemoServer.reset();
  const load = plantDemoServer.getQueue(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  const rush = plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);

  plantDemoServer.reset();
  const qa = plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'qa_fail', locale);

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const accept = plantDemoServer.accept(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const explain = plantDemoServer.explainBatch('1001858227', 'When does it ship?', locale);

  plantDemoServer.reset();
  return { load, rush, qa, accept, explain };
}

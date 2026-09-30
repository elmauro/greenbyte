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
  refresh: PlantEventResponse;
  qa: PlantEventResponse;
  accept: PlantAcceptResponse;
  explain: PlantBatchExplainResponse;
};

/** Isolated mock payloads per flow step (resets singleton after). */
export function buildPlantFlowSnapshots(locale: Locale): PlantFlowSnapshots {
  plantDemoServer.reset();
  const load = plantDemoServer.getQueue(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  const rush = plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale, {
    focusPo: '1002307551',
    priority: 2,
    scheduledFinish: '2026-07-06 09:00',
  });

  plantDemoServer.reset();
  const refresh = plantDemoServer.applySapQueueRefresh(PLANT_DEMO_LINE_ID, locale, {
    po: '1002408120',
    priority: 2,
    scheduledFinish: '2026-07-07 08:00',
  });

  plantDemoServer.reset();
  const qa = plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'qa_fail', locale, {
    focusPo: '1001884747',
    failedFor: 'Dent',
  });

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const accept = plantDemoServer.accept(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const explain = plantDemoServer.explainBatch('1002307551', 'When does it ship?', locale);

  plantDemoServer.reset();
  return { load, rush, refresh, qa, accept, explain };
}

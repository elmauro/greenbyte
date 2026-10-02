import { PLANT_DEMO_LINE_ID, plantDemoServer } from './plantDemoServer';
import type {
  PlantAcceptResponse,
  PlantBatchExplainResponse,
  PlantEventResponse,
  PlantExplanation,
  PlantQueueResponse,
  QueueRow,
} from './plantDemoTypes';
import type { Locale } from '../../i18n/LocaleContext';

/** Body the BFF posts to David · POST /explain-replan. Not a browser response. */
export type PlantExplainReplanRequest = {
  locale: Locale;
  lineId: string;
  eventType: 'rush' | 'qa_fail';
  planVersion: number;
  diff: PlantEventResponse['diff'];
  queueSnapshot: QueueRow[];
};

export type PlantFlowSnapshots = {
  load: PlantQueueResponse;
  rush: PlantEventResponse;
  refresh: Omit<PlantEventResponse, 'eventType'> & { eventType: string; source: string };
  qa: PlantEventResponse;
  /** GET queue while a plan is still PROPOSED — not the ingest POST body. */
  poll: PlantQueueResponse;
  accept: PlantAcceptResponse;
  explain: PlantBatchExplainResponse;
  /** Private agent call built from the rush ingest. queueSnapshot is that response's queue. */
  explainReplanRequest: PlantExplainReplanRequest;
  explainReplan: PlantExplanation;
};

function agentQueueSnapshot(queue: QueueRow[]): QueueRow[] {
  return queue.map((row) => {
    const out: QueueRow = {
      po: row.po,
      species: row.species,
      kg: row.kg,
      finish: row.finish,
      status: row.status,
    };
    if (row.atRisk === true) out.atRisk = true;
    if (row.reasonShort) out.reasonShort = row.reasonShort;
    if (row.previousPosition != null) out.previousPosition = row.previousPosition;
    return out;
  });
}

function explainReplanRequestFrom(event: PlantEventResponse, locale: Locale): PlantExplainReplanRequest {
  return {
    locale,
    lineId: event.lineId,
    eventType: event.eventType,
    planVersion: event.planVersion,
    diff: {
      moves: event.diff.moves ?? [],
      reasons: event.diff.reasons ?? [],
      held: event.diff.held ?? [],
      added: event.diff.added ?? [],
      removed: event.diff.removed ?? [],
    },
    queueSnapshot: agentQueueSnapshot(event.queue),
  };
}

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
  const refresh = {
    ...plantDemoServer.applySapQueueRefresh(PLANT_DEMO_LINE_ID, locale, {
      po: '1002408120',
      priority: 2,
      scheduledFinish: '2026-07-07 08:00',
    }),
    eventType: 'queue_refresh',
    source: 'etl_refresh',
  };

  plantDemoServer.reset();
  const qa = plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'qa_fail', locale, {
    focusPo: '1001884747',
    failedFor: 'Dent',
  });

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale, {
    focusPo: '1002307551',
    priority: 2,
    scheduledFinish: '2026-07-06 09:00',
  });
  const poll = plantDemoServer.getQueue(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const accept = plantDemoServer.accept(PLANT_DEMO_LINE_ID);

  plantDemoServer.reset();
  plantDemoServer.applyEvent(PLANT_DEMO_LINE_ID, 'rush', locale);
  const explain = plantDemoServer.explainBatch('1002307551', 'When does it ship?', locale);

  plantDemoServer.reset();
  return {
    load,
    rush,
    refresh,
    qa,
    poll,
    accept,
    explain,
    explainReplanRequest: explainReplanRequestFrom(rush, locale),
    explainReplan: rush.explanation,
  };
}

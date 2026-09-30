import { applyEvent } from './logic.js';
import { loadState, saveState } from './stateRepository.js';

/**
 * Apply rush or qa_fail replan and persist (shared by legacy /events and /ingest/* routes).
 */
export async function runPlantEvent(lineId, type, locale, source) {
  const state = await loadState(lineId);
  const { state: nextState, response } = applyEvent(state, lineId, type, locale);
  await saveState(lineId, nextState);
  return { ...response, source };
}

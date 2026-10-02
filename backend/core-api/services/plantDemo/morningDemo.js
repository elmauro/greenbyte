import { SapIngestError } from './sapIngestDb.js';
import { withOpenQueueClient } from './openQueueDb.js';
import { replanWithSemanticEngine } from './semanticReplan.js';

/**
 * Puts one line back to the raw open queue. Deletes that line's plans only.
 * Orders, notes and ingest history stay. Does not call the heuristic.
 */
export async function stageRawLine(lineId) {
  return withOpenQueueClient(async (client) => {
    await client.query('BEGIN');
    try {
      const line = await client.query(
        'SELECT work_center_id FROM silver.work_center WHERE demo_line_id = $1',
        [lineId],
      );
      if (!line.rowCount) throw new SapIngestError(404, `Unknown line ${lineId}`);
      const workCenterId = line.rows[0].work_center_id;
      await client.query(
        'UPDATE gold.schedule_plan SET parent_plan_id = NULL WHERE work_center_id = $1',
        [workCenterId],
      );
      const cleared = await client.query(
        'DELETE FROM gold.schedule_plan WHERE work_center_id = $1',
        [workCenterId],
      );
      await client.query('COMMIT');
      return { lineId, plansCleared: cleared.rowCount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

/** One planner run over the orders already on the line. Does not insert a PO and does not replan the other line. */
export async function planMorningLine(query, lineId) {
  return replanWithSemanticEngine(query, { lineId, kind: 'queue_refresh', onlyLine: true });
}

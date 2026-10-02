import { SapIngestError } from './sapIngestDb.js';
import { withOpenQueueClient } from './openQueueDb.js';
import { replanWithSemanticEngine } from './semanticReplan.js';

/**
 * Puts one line back to the raw open queue. Deletes that line's plans, clears rush flags,
 * and voids QA fails posted through the demo. Baseline plant tests, orders, and notes stay.
 * Does not call the heuristic.
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
      // A rush flag is sticky (any priority change with is_rush). Clearing it here is what
      // drops the badge; the next plan then uses the remaining priority, not the old rush.
      const rushes = await client.query(
        `UPDATE silver.process_order_change c
         SET is_rush = false
         FROM silver.line_schedule_item li
         WHERE c.process_order_id = li.process_order_id
           AND li.work_center_id = $1
           AND c.is_rush`,
        [workCenterId],
      );
      // A demo fail is a pass/fail ingest. The Pasco tests have no ingest event, so they stay.
      const fails = await client.query(
        `WITH doomed_events AS (
           SELECT ie.ingest_event_id
           FROM raw.ingest_event ie
           WHERE ie.voided_at IS NULL
             AND ie.event_source = 'pass_fail_log'
             AND (
               ie.line_id = $1
               OR EXISTS (
                 SELECT 1 FROM silver.quality_test qt
                 WHERE qt.ingest_event_id = ie.ingest_event_id
                   AND qt.work_center_id = $2
               )
             )
         ),
         doomed_tests AS (
           SELECT qt.quality_test_id, qt.ingest_event_id
           FROM silver.quality_test qt
           JOIN doomed_events e ON e.ingest_event_id = qt.ingest_event_id
         ),
         drop_facts AS (
           DELETE FROM gold.semantic_fact sf
           USING gold.source_note sn, doomed_tests d
           WHERE sf.source_note_id = sn.source_note_id
             AND sn.quality_test_id = d.quality_test_id
         ),
         drop_notes AS (
           DELETE FROM gold.source_note sn
           USING doomed_tests d
           WHERE sn.quality_test_id = d.quality_test_id
         ),
         drop_repairs AS (
           DELETE FROM gold.repair_proposal rp
           USING doomed_tests d
           WHERE rp.quality_test_id = d.quality_test_id
         ),
         drop_tests AS (
           DELETE FROM silver.quality_test qt
           USING doomed_tests d
           WHERE qt.quality_test_id = d.quality_test_id
         ),
         drop_sources AS (
           DELETE FROM silver.process_order_source s
           USING doomed_events e
           WHERE s.source_csv = 'raw.ingest_event'
             AND s.source_row_number = e.ingest_event_id
         ),
         voided AS (
           UPDATE raw.ingest_event ie
           SET voided_at = clock_timestamp(), void_reason = 'stage_raw'
           FROM doomed_events e
           WHERE ie.ingest_event_id = e.ingest_event_id
           RETURNING ie.ingest_event_id
         )
         SELECT count(*)::int AS fails_cleared FROM voided`,
        [lineId, workCenterId],
      );
      await client.query('COMMIT');
      return {
        lineId,
        plansCleared: cleared.rowCount,
        rushesCleared: rushes.rowCount,
        failsCleared: fails.rows[0]?.fails_cleared ?? 0,
      };
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

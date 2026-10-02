#!/usr/bin/env node
// Usage (from backend/core-api, with DATABASE_URL or PG* set):
//   node scripts/semantic-smoke.mjs                         morning plan for both large-seed lines, read only
//   node scripts/semantic-smoke.mjs --rush 1002307551 --ship-by 2026-10-02
//   node scripts/semantic-smoke.mjs --qa-fail 1002301004 --reason Discolored
//   node scripts/semantic-smoke.mjs --line-down line-2 --from 2026-09-29T06:00:00-07:00 --to 2026-09-29T18:00:00-07:00
//   node scripts/semantic-smoke.mjs --swap 1002303190 --to-line LSVLN1
//   node scripts/semantic-smoke.mjs --notes                 read Line 1/2 notes with rules (+ JEV when JEV_ENABLED=true)
//   add --save to write plan_event + gold.replan (refuses until replan reads payload.entries)
//   add --json to print the raw payloads
import { isOpenQueueDbConfigured, queryOpenQueue } from '../services/plantDemo/openQueueDb.js';
import { failReasonCode, plannerResult } from '../services/plantDemo/semanticReplan.js';
import { loadSnapshot, replanSupportsEntries, savePlan } from '../services/semanticEngine/db/goldGateway.js';
import { explainPlan } from '../services/semanticEngine/explain/explainPlan.js';
import { createJevClassifier, explainClients, jevEnabled } from '../services/semanticEngine/models/clients.js';
import { extractFacts } from '../services/semanticEngine/notes/extractFacts.js';
import { applyPlannerEvent } from '../services/semanticEngine/planner/index.js';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) out[key.slice(2)] = true;
    else {
      out[key.slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

function changeFrom(opts) {
  if (opts.rush) return { kind: 'rush', po: String(opts.rush), shipBy: opts['ship-by'] || null };
  if (opts['qa-fail']) return { kind: 'qa_fail', po: String(opts['qa-fail']), failedFor: opts.reason || 'Dent' };
  if (opts['line-down']) {
    return { kind: 'line_down', lineId: opts['line-down'], startsAt: opts.from, endsAt: opts.to, reason: opts.reason || 'BREAKDOWN' };
  }
  if (opts.swap) return { kind: 'line_swap', po: String(opts.swap), workCenterCode: opts['to-line'] || 'LSVLN1' };
  return { kind: 'baseline' };
}

function plan(snapshot, change) {
  if (change.kind === 'baseline') return plannerResult(snapshot, { kind: null });
  if (change.kind === 'qa_fail') {
    const queued = snapshot.orders.some((order) => order.poNumber === change.po);
    if (queued) {
      return applyPlannerEvent(snapshot, { type: 'qa_fail', po: change.po, failReason: failReasonCode(change.failedFor) });
    }
    return plannerResult(snapshot, { ...change, kind: 'qa_fail_finished' });
  }
  if (change.kind === 'line_down') {
    return applyPlannerEvent(snapshot, { type: 'line_down', lineId: change.lineId, startsAt: change.startsAt, endsAt: change.endsAt, reason: change.reason });
  }
  if (change.kind === 'line_swap') {
    return applyPlannerEvent(snapshot, { type: 'line_swap', po: change.po, workCenterCode: change.workCenterCode });
  }
  return plannerResult(snapshot, change);
}

function printLine(lineId, payload) {
  console.log(`\n=== ${lineId} — ${payload.entries.length} entries ===`);
  const rows = payload.entries.map((entry) => ({
    pos: entry.position,
    po: entry.poNumber,
    status: entry.entryStatus,
    start: entry.plannedStartAt?.slice(0, 16) ?? '',
    end: entry.plannedEndAt?.slice(0, 16) ?? '',
    sapFinish: entry.dueDate ?? '',
    slack: entry.slackDays ?? '',
    late: entry.isAtRisk ? 'LATE' : '',
    prev: entry.previousPosition ?? '',
    reasons: entry.reasons.map((reason) => reason.code).join(','),
  }));
  console.table(rows);
  console.log('newly late:', payload.impact.newlyLate.join(', ') || '—');
  console.log('weekly load:', payload.impact.weeklyLoad.map((row) => `${row.week} ${row.hoursRequired}/${row.hoursAvailable} h`).join(' · ') || '—');
  if (payload.proposals.length) console.log('proposals:', JSON.stringify(payload.proposals));
  if (payload.downtime.length) console.log('downtime:', JSON.stringify(payload.downtime));
  if (payload.overrides.length) console.log('overrides:', JSON.stringify(payload.overrides));
  if (payload.violations.length) console.log('violations:', JSON.stringify(payload.violations));
}

async function readNotes(snapshot) {
  const pos = snapshot.orders.map((order) => order.poNumber);
  const { rows } = await queryOpenQueue(
    `SELECT DISTINCT ON (sn.note_hash) po.po_number, sn.note_text, sn.source_column
     FROM gold.source_note sn
     JOIN silver.process_order po USING (process_order_id)
     WHERE po.po_number = ANY($1::text[])
       AND sn.source_column IN ('run_order_note', 'priority_note', 'status_note', 'sap_notes')
     ORDER BY sn.note_hash`,
    [pos],
  );
  const clients = jevEnabled() ? { classify: createJevClassifier() } : {};
  const result = await extractFacts(
    rows.map((row) => ({ po: row.po_number, text: row.note_text, asOf: snapshot.asOf })),
    clients,
  );
  console.log(`\n=== notes — ${result.notes.length} distinct texts (JEV ${jevEnabled() ? 'on' : 'off'}) ===`);
  console.table(result.notes.map((note) => ({
    po: note.po,
    text: note.text.slice(0, 50),
    reader: note.reader,
    facts: note.facts.map((fact) => `${fact.fact_type}${fact.fact_value?.ready_by ? `→${fact.fact_value.ready_by.slice(0, 10)}` : ''} ${fact.status}`).join('; '),
  })));
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (!isOpenQueueDbConfigured()) {
    console.error('Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD first.');
    process.exit(1);
  }
  const query = (text, params) => queryOpenQueue(text, params);
  const snapshot = await loadSnapshot(query, { asOf: opts['as-of'] });
  const byLine = snapshot.orders.reduce((acc, order) => ({ ...acc, [order.lineId]: (acc[order.lineId] || 0) + 1 }), {});
  console.log('as of:', snapshot.asOf, '| orders per line:', byLine, '| rules from', snapshot.rules?.calendar ? 'planner_rules or default' : '?');

  if (opts.notes) await readNotes(snapshot);

  const change = changeFrom(opts);
  const result = plan(snapshot, change);
  for (const [lineId, payload] of Object.entries(result.payloads)) printLine(lineId, payload);

  const focusLine = opts.line || 'line-2';
  const payload = result.payloads[focusLine];
  const { explanation, source } = await explainPlan({ lineId: focusLine, ...payload }, await explainClients());
  console.log(`\n=== explanation (${source}) ===`);
  console.log(JSON.stringify(explanation, null, 2));

  if (opts.json) console.log(JSON.stringify(result.payloads, null, 2));

  if (opts.save) {
    if (!(await replanSupportsEntries(query))) {
      console.error('\nNot saved: gold.replan does not read payload.entries yet.');
      process.exitCode = 2;
    } else {
      const saved = await savePlan(query, {
        payloads: result.payloads,
        eventType: change.kind,
        focusPo: change.po,
        focusLineId: change.lineId || (change.kind === 'baseline' ? null : opts.line || 'line-2'),
      });
      console.log('\nsaved:', saved);
    }
  } else {
    console.log('\nRead only. Add --save to write the plan.');
  }
  process.exit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

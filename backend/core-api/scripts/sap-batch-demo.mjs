#!/usr/bin/env node
/**
 * Simulated SAP batch demo. Loads eight Line 1 orders whose comments the engine has to read
 * (some say rush or hold without using the keyword), then plans the line.
 *
 *   node scripts/sap-batch-demo.mjs load   [--base URL] [--line line-1] [--plan]
 *   node scripts/sap-batch-demo.mjs plan   [--base URL] [--line line-1]
 *   node scripts/sap-batch-demo.mjs reset  [--base URL] [--line line-1]
 *
 * --base defaults to the local BFF (http://localhost:3001); pass the API Gateway URL for AWS.
 */

const SAMPLE_ORDERS = [
  { po: '1009900001', species: 'PECO', variety: 'IDALGO', kg: 14000, priority: 4, scheduledFinish: '2026-10-09',
    comment: 'Customer in NL called, export container leaves Friday. Please push this one up' },
  { po: '1009900002', species: 'SWCO', variety: 'GH4927-C', kg: 9000, priority: 2, scheduledFinish: '2026-10-02',
    comment: 'RUSH - Priority 1. For Export to NL' },
  { po: '1009900003', species: 'PECO', variety: 'SP704-3-8', kg: 18000, priority: 3, scheduledFinish: '2026-10-05',
    comment: 'Not fumigated yet, chamber booked for Tuesday' },
  { po: '1009900004', species: 'SWBS', variety: 'R00565H S', kg: 6000, priority: 5, scheduledFinish: '2026-10-12',
    comment: 'Waiting on raw germ results from the lab' },
  { po: '1009900005', species: 'SWCO', variety: 'P&C EARLY', kg: 11000, priority: 6, scheduledFinish: '2026-10-14',
    comment: 'Customer cancelled the slot, keep it off the line for now' },
  { po: '1009900006', species: 'PECO', variety: 'IDALGO', kg: 8000, priority: 4, scheduledFinish: '2026-10-10',
    comment: 'Same Idalgo seed as the export lot, hand pick after sizing' },
  { po: '1009900007', species: 'SWCO', variety: 'EA SUNGLOW', kg: 7000, scheduledFinish: '2026-10-07' },
  { po: '1009900008', species: 'PECO', variety: 'SP704-3-8', kg: 12500, priority: 7, scheduledFinish: '2026-10-16',
    comment: 'Fumigation finished this morning, good to go' },
];

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index > 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const command = process.argv[2] || 'load';
const base = argValue('--base', process.env.BFF_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const lineId = argValue('--line', 'line-1');

async function post(path, body) {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  console.log(`POST ${path} -> ${response.status} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (!response.ok) {
    console.error(json);
    process.exit(1);
  }
  return json;
}

function printQueue(result) {
  const batch = new Set(SAMPLE_ORDERS.map((order) => order.po));
  for (const [index, row] of (result.queue || []).entries()) {
    const mark = batch.has(String(row.po)) ? '*' : ' ';
    console.log(`${mark}${String(index + 1).padStart(3)}. ${row.po} ${row.species ?? ''} ${row.status ?? ''} ${row.reasonShort ?? ''}`);
    if (row.aiNote) console.log(`       ${row.aiNote}`);
  }
  if (result.explanation?.summary) console.log(`\n${result.explanation.summary}`);
}

if (command === 'reset') {
  console.log(await post('/demo/plant/demo/sap-batch-reset', { lineId }));
} else if (command === 'plan') {
  printQueue(await post('/demo/plant/demo/plan-line', { lineId }));
} else {
  const result = await post('/demo/plant/demo/sap-batch', {
    lineId,
    plan: process.argv.includes('--plan'),
    orders: SAMPLE_ORDERS,
  });
  console.log(`Loaded ${result.inserted.length} orders, ${result.notesCreated} notes, cleared ${result.plansCleared} plans.`);
  printQueue(result);
}

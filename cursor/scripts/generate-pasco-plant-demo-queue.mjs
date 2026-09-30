/**
 * Builds Line 1 plant demo queue from Syngenta Pasco extracts + fixed demo anchors.
 * Outputs:
 *   backend/core-api/services/plantDemo/pascoLine1Baseline.js
 *   frontend/src/demo/plant/pascoLine1Baseline.ts
 *
 * Source CSVs (read-only): Hackathon 2026 - Use Cases/.../data_sources/
 *
 * Scope limits (full Pasco vs mock): docs/hackathon/uc1-plant-demo-mock-data.md
 * Syngenta B+ alignment: docs/hackathon/uc1-syngenta-assumptions.md §3.1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DATA_DIR = path.join(
  repoRoot,
  'Hackathon 2026 - Use Cases/Hackathon 2026-UseCases/UC1 - Plant Capacity Utilization/data_sources',
);

const DEMO_ANCHORS = [
  {
    po: '1001759341',
    species: 'SWCO',
    kg: 4200,
    finish: '2026-07-04 11:30',
    status: 'PLANNED',
    _note: 'Synthetic anchor PO for rush swap partner (not in current SAP NEW extract).',
  },
  {
    po: '1001884747',
    species: 'SWCO',
    kg: 9800,
    finish: '2026-07-05 16:00',
    status: 'PLANNED',
    atRisk: true,
    reasonShort: 'SAP due date — monitor slot',
    _note: 'QA fail demo — kg from lsv_pass_fail_log LF Fail row.',
  },
  {
    po: '1002307551',
    species: 'SWCO',
    kg: 6400,
    finish: '2026-07-06 09:00',
    status: 'PLANNED',
    atRisk: true,
    reasonShort: 'Priority 2 — customer window',
    _note: 'Rush demo — real PO from sap_order_headers (priority 2); finish shifted to hackathon window.',
  },
];

const COMPLETE_ROW = {
  po: '1001887703',
  species: 'SWCO',
  kg: 18537,
  finish: '2026-06-30 08:00',
  status: 'COMPLETE',
  _note: 'Historical Line 1 complete batch (line_1_schedule style) for “recent history” row.',
};

const ANCHOR_POS = new Set(DEMO_ANCHORS.map((r) => r.po));
/** Target PLANNED filler count (excludes 3 demo anchors) — enough for 10/20/50 pagination demos. */
const TARGET_PLANNED_FILLER = 32;
const MIN_KG = 300;

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        i += 1;
        let cell = '';
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              cell += '"';
              i += 2;
            } else {
              i += 1;
              break;
            }
          } else {
            cell += text[i];
            i += 1;
          }
        }
        row.push(cell);
      } else {
        let cell = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          cell += text[i];
          i += 1;
        }
        row.push(cell);
      }
      if (text[i] === ',') {
        i += 1;
        continue;
      }
      if (text[i] === '\r') i += 1;
      if (text[i] === '\n') {
        i += 1;
        break;
      }
      if (i >= len) break;
    }
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

function parseKg(raw) {
  const kgRaw = parseFloat(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(kgRaw) ? Math.round(kgRaw) : 0;
}

function loadSapLine1New() {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'main.csv'), 'utf8');
  const rows = parseCsv(raw);
  const header = rows[0];
  const cropI = header.findIndex((h) => h.trim() === 'Crop');
  const poI = header.findIndex((h) => h.includes('Prod. Order'));
  const qtyI = header.findIndex((h) => h.includes('Output'));
  const wcI = header.findIndex((h) => h.includes('WorkCenter'));
  const statusI = header.findIndex((h) => h.includes('PO Status'));

  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const po = String(row[poI] ?? '').trim();
    if (!po || ANCHOR_POS.has(po)) continue;
    if (String(row[wcI] ?? '').trim() !== 'LSVLN1') continue;
    const status = String(row[statusI] ?? '').trim();
    if (status && status !== 'NEW') continue;
    const kg = parseKg(row[qtyI]);
    if (kg < MIN_KG) continue;
    out.push({
      po,
      species: String(row[cropI] ?? '').trim(),
      kg,
      source: 'main.csv',
    });
  }
  return out;
}

/** Real Line 1 POs from plant schedule; remapped to PLANNED + demo finish window. */
function loadLine1ScheduleBacklog() {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'line_1_schedule.csv'), 'utf8');
  const rows = parseCsv(raw);
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const comments = String(row[11] ?? '');
    if (!/\bINT Ln1\b/i.test(comments) && !/\bRAW-CLD INT Ln1\b/i.test(comments)) continue;
    if (/\bLn2\b/i.test(comments) && !/\bLn1\b/i.test(comments)) continue;
    const po = String(row[4] ?? '').trim();
    if (!po || ANCHOR_POS.has(po)) continue;
    const species = String(row[6] ?? '').trim();
    if (!species) continue;
    let kg = parseKg(row[12]);
    if (kg < MIN_KG) kg = parseKg(row[9]);
    if (kg < MIN_KG) continue;
    out.push({
      po,
      species,
      kg,
      source: 'line_1_schedule.csv',
    });
  }
  return out;
}

function mergeFillerRows(...lists) {
  const byPo = new Map();
  for (const list of lists) {
    for (const item of list) {
      if (ANCHOR_POS.has(item.po)) continue;
      const prev = byPo.get(item.po);
      if (!prev || item.kg > prev.kg) byPo.set(item.po, item);
    }
  }
  const merged = [...byPo.values()];
  merged.sort((a, b) => b.kg - a.kg);
  return merged.slice(0, TARGET_PLANNED_FILLER);
}

function demoFinishSlots(count, startDay = 7) {
  const slots = [];
  const hours = [10, 14, 16];
  let day = startDay;
  let h = 0;
  for (let n = 0; n < count; n += 1) {
    const dd = String(day).padStart(2, '0');
    const hh = String(hours[h % hours.length]).padStart(2, '0');
    slots.push(`2026-07-${dd} ${hh}:00`);
    h += 1;
    if (h % hours.length === 0) day += 1;
  }
  return slots;
}

function stripMeta(row) {
  const { _note, sapFinish, source, ...rest } = row;
  return rest;
}

function buildQueue() {
  const filler = mergeFillerRows(loadSapLine1New(), loadLine1ScheduleBacklog());
  const finishes = demoFinishSlots(filler.length);
  const fillerRows = filler.map((f, i) => ({
    po: f.po,
    species: f.species,
    kg: f.kg,
    finish: finishes[i],
    status: 'PLANNED',
  }));

  const anchors = DEMO_ANCHORS.map(stripMeta);
  return [...anchors, ...fillerRows, stripMeta(COMPLETE_ROW)];
}

function serializeRow(row) {
  const parts = [`po: '${row.po}'`, `species: '${row.species}'`, `kg: ${row.kg}`, `finish: '${row.finish}'`, `status: '${row.status}'`];
  if (row.atRisk) parts.push('atRisk: true');
  if (row.reasonShort) parts.push(`reasonShort: '${row.reasonShort.replace(/'/g, "\\'")}'`);
  return `  { ${parts.join(', ')} }`;
}

function writeOutputs(queue) {
  const provenance = [
    '/**',
    ' * Line 1 baseline queue for plant demo (BFF + MSW).',
    ' * Generated by cursor/scripts/generate-pasco-plant-demo-queue.mjs — do not edit by hand.',
    ' * Sources: main.csv (LSVLN1 NEW), line_1_schedule.csv (INT Ln1 backlog), demo anchors.',
    ' */',
  ].join('\n');

  const backendPath = path.join(repoRoot, 'backend/core-api/services/plantDemo/pascoLine1Baseline.js');
  const backendBody = `${provenance}\n\nexport const PASCO_LINE1_BASELINE = [\n${queue.map(serializeRow).join(',\n')},\n];\n`;
  fs.writeFileSync(backendPath, backendBody, 'utf8');

  const frontendPath = path.join(repoRoot, 'frontend/src/demo/plant/pascoLine1Baseline.ts');
  const frontendBody = `${provenance}\n\nimport type { QueueRow } from './plantDemoTypes';\n\nexport const PASCO_LINE1_BASELINE: QueueRow[] = [\n${queue.map(serializeRow).join(',\n')},\n];\n`;
  fs.writeFileSync(frontendPath, frontendBody, 'utf8');

  const planned = queue.filter((r) => r.status === 'PLANNED').length;
  console.log(`Wrote ${queue.length} rows →`);
  console.log(`  ${path.relative(repoRoot, backendPath)}`);
  console.log(`  ${path.relative(repoRoot, frontendPath)}`);
  console.log(`  Planned: ${planned}, COMPLETE: ${queue.filter((r) => r.status === 'COMPLETE').length}`);
}

const queue = buildQueue();
writeOutputs(queue);

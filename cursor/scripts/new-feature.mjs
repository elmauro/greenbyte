#!/usr/bin/env node
/**
 * Register a feature story (mechanical part of intake):
 *   1) Assign the next execution ID from STORY-REGISTRY.md (when backlog exists).
 *   2) Append a registry row and update "Next free execution ID".
 *   3) Insert a lifecycle paste block into future-work/<area>/STORY-LOG.md.
 *   4) Print the orchestrator block for Cursor Agent.
 *
 * Does not create analysis artifacts (that is prompt-feature-lifecycle.md).
 *
 *   node cursor/scripts/new-feature.mjs --name "Password reset via email" --area frontend
 *   node cursor/scripts/new-feature.mjs --name "…" --area backend --fw FW-ACME-012 --stack backend
 *   node cursor/scripts/new-feature.mjs --from-study cursor/analysis/studies/<slug>/study.md --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FW_ROOT = path.join(REPO_ROOT, "cursor/company/future-work");
const REGISTRY = path.join(FW_ROOT, "STORY-REGISTRY.md");
const CONFIG_PATH = path.join(__dirname, "github-story.config.json");
const CONFIG_EXAMPLE = path.join(__dirname, "github-story.config.example.json");
const PROJECT_CONFIG = path.join(REPO_ROOT, "project.config.json");
const LOG_MARKER = "<!-- newest first; new-feature.mjs inserts below this comment -->";

const AREAS = new Set([
  "backend",
  "frontend",
  "infrastructure",
  "product",
  "_core",
]);

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadPrefixes() {
  const configFile = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE;
  const gh = fs.existsSync(configFile) ? loadJson(configFile) : {};
  let projectSlug = "";
  if (fs.existsSync(PROJECT_CONFIG)) {
    const pc = loadJson(PROJECT_CONFIG);
    projectSlug = pc.projectSlug || "";
  }
  const ticketPrefix = (gh.ticketPrefix || projectSlug || "STORY")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/-/g, "_")
    .toUpperCase() || "STORY";
  const branchPrefix = gh.branchPrefix || "feature";
  return { ticketPrefix, branchPrefix };
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function padNum(n) {
  return String(n).padStart(3, "0");
}

function parseTicket(value, prefix) {
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const m = String(value || "").replace(/`/g, "").trim().match(re);
  return m ? Number(m[1]) : null;
}

function nextTicketId(registry, prefix) {
  const rowRe = new RegExp(`\\|\\s*${prefix}-(\\d+)\\s*\\|`, "gi");
  const tableNums = [...registry.matchAll(rowRe)].map((m) => Number(m[1]));
  const maxTable = tableNums.length ? Math.max(...tableNums) : 0;
  const free = registry.match(/\*\*Next free execution ID:\*\*\s*`([^`]+)`/);
  const freeNum = free ? parseTicket(free[1], prefix) : null;
  const next = Math.max(freeNum || maxTable + 1, maxTable + 1);
  return padNum(next || 1);
}

function bumpNextFree(registry, prefix, usedNum) {
  const next = padNum(Number(usedNum) + 1);
  const re = /(\*\*Next free execution ID:\*\*\s*`)([^`]+)(`)/;
  if (re.test(registry)) {
    return registry.replace(re, `$1${prefix}-${next}$3`);
  }
  return registry;
}

function insertRegistryRow(registry, row) {
  const header = registry.indexOf("| Execution story |");
  if (header < 0) die("could not find 'Execution story' table in STORY-REGISTRY.md");
  const sep = registry.indexOf("| --- |", header);
  if (sep < 0) die("could not find table separator in STORY-REGISTRY.md");
  const insertAt = registry.indexOf("\n", sep) + 1;
  return registry.slice(0, insertAt) + row + "\n" + registry.slice(insertAt);
}

function logSkeleton(area) {
  return [
    `# Story log — ${area}`,
    "",
    "Story log for this area (use `prompt-feature-lifecycle.md`).",
    "Backlog FW-*: [`README.md`](README.md) · Ticket↔FW registry: [`../STORY-REGISTRY.md`](../STORY-REGISTRY.md) · Template: [`../STORY-LOG-TEMPLATE.md`](../STORY-LOG-TEMPLATE.md).",
    "",
    "## Stories",
    "",
    LOG_MARKER,
    "",
  ].join("\n");
}

function branchName(ticket, branchPrefix) {
  return `${branchPrefix}/${ticket.toLowerCase()}`;
}

function prTitle(ticket, name) {
  return `${ticket}: ${name}`;
}

function lifecycleBlock(s) {
  return [
    "@cursor/prompts/feature/prompt-feature-lifecycle.md",
    "",
    `Feature slug: ${s.slug}`,
    `Feature name: ${s.name}`,
    `Ticket/story: ${s.ticket}`,
    `Backlog ID: ${s.fw}`,
    `Stack scope: ${s.stack}`,
    `Start at: ${s.start}`,
    `Run tests: ${s.runTests}`,
    `Auto-close: ${s.autoClose}`,
  ].join("\n");
}

function logEntry(s) {
  const pkgRel = `../../../analysis/features/${s.area}/${s.slug}/`;
  return [
    `### ${s.ticket} — ${s.name}`,
    "",
    `- FW: \`${s.fw}\` · Slug: \`${s.slug}\` · Stack: ${s.stack}`,
    `- Branch: \`${s.branch}\` · PR: \`${s.pr}\``,
    `- Status: planned · Package: [\`${s.area}/${s.slug}/\`](${pkgRel})`,
    "",
    "```text",
    lifecycleBlock(s),
    "```",
    "",
  ].join("\n");
}

function insertLogEntry(logMd, entry) {
  if (!logMd.includes(LOG_MARKER)) {
    die("could not find STORY-LOG.md marker (newest first; new-feature.mjs inserts below this comment)");
  }
  const idx = logMd.indexOf(LOG_MARKER);
  const insertAt = logMd.indexOf("\n", idx) + 1;
  return logMd.slice(0, insertAt) + "\n" + entry + logMd.slice(insertAt);
}

function defaultStack(area) {
  if (area === "frontend" || area === "backend" || area === "infrastructure") return area;
  if (area === "product" || area === "_core") return "n/a";
  return "full-stack";
}

function normalizeStory(input, prefixes) {
  const name = (input.name || "").trim();
  if (!name) die("missing --name (Feature name)");
  const area = (input.area || "").trim() || "backend";
  if (area.includes("/") || area.includes("\\") || area.startsWith(".")) {
    die(`invalid area "${area}"`);
  }
  if (!AREAS.has(area) && !/^[a-z][a-z0-9-]*$/.test(area)) {
    die(`invalid area "${area}". Use backend|frontend|infrastructure|product|_core or a domain slug`);
  }
  const fwRaw = (input.fw || "").trim();
  const fw = !fwRaw || fwRaw === "create" || fwRaw === "crear" ? "n/a" : fwRaw;
  const slug = (input.slug || "").trim() || slugify(name);
  const stack = (input.stack || "").trim() || defaultStack(area);
  const runTests = (input["run-tests"] || input.runTests || "").trim() || "no";
  return {
    name,
    slug,
    area,
    fw,
    fwPending: fwRaw === "create" || fwRaw === "crear",
    origin: input.origin === "comparison" ? "comparison" : "new",
    stack,
    priority: (input.priority || "").trim() || "P2",
    start: (input.start || "").trim() || "analysis",
    runTests,
    autoClose: (input["auto-close"] || input.autoClose || "").trim() || "yes",
    ticketOverride: (input.ticket || "").trim() || null,
    prefixes,
  };
}

function registerOne(input, registry, prefixes, dryRun) {
  const s = normalizeStory(input, prefixes);
  const hasRegistry = typeof registry === "string";
  let ticket = s.ticketOverride;
  let nextRegistry = registry;

  if (!ticket) {
    if (!hasRegistry) {
      ticket = "n/a";
    } else {
      ticket = `${prefixes.ticketPrefix}-${nextTicketId(registry, prefixes.ticketPrefix)}`;
    }
  }

  s.ticket = ticket;
  s.branch = ticket === "n/a" ? `${prefixes.branchPrefix}/${s.slug}` : branchName(ticket, prefixes.branchPrefix);
  s.pr = ticket === "n/a" ? s.name : prTitle(ticket, s.name);

  if (hasRegistry && ticket !== "n/a") {
    const row = `| ${ticket} | ${s.fw} | \`${s.slug}\` | ${s.name} | ${s.priority} | planned |`;
    nextRegistry = insertRegistryRow(registry, row);
    const used = parseTicket(ticket, prefixes.ticketPrefix);
    if (used != null) nextRegistry = bumpNextFree(nextRegistry, prefixes.ticketPrefix, used);
  }

  const logFile = path.join(FW_ROOT, s.area, "STORY-LOG.md");
  const hasFw = fs.existsSync(FW_ROOT);
  let newLog = null;
  if (hasFw) {
    const logMd = fs.existsSync(logFile) ? readText(logFile) : logSkeleton(s.area);
    newLog = insertLogEntry(logMd, logEntry(s));
    if (!dryRun) {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.writeFileSync(logFile, newLog);
    }
  }

  const fwNote = s.fwPending ? "  ⚠ FW pending: create the item in future-work and update the row" : "";
  const summary = `${s.ticket}  ${s.area}  ${s.slug}  (FW: ${s.fw}, ${s.origin}, ${s.priority})${fwNote}`;
  return { story: s, registry: nextRegistry, summary, logFile: hasFw ? logFile : null };
}

function parseStudy(file) {
  if (!fs.existsSync(file)) die(`study file not found: ${file}`);
  const md = readText(file);
  const secIdx = md.search(/##\s*CANDIDATE STORIES/i);
  if (secIdx < 0) die('study is missing "## CANDIDATE STORIES" section');
  const section = md.slice(secIdx);
  const lines = section.split("\n").filter((l) => l.trim().startsWith("|"));
  const stories = [];
  for (const line of lines) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 10) continue;
    const name = cells[2];
    if (!name || name.toLowerCase() === "feature name") continue;
    if (/^[-:\s]+$/.test(name)) continue;
    if (name.startsWith("<") || name.startsWith("`<")) continue;
    const decision = (cells[cells.length - 2] || "").toLowerCase();
    if (!decision.startsWith("implement")) continue;
    stories.push({
      name: name.replace(/^`|`$/g, ""),
      area: cells[3].replace(/`/g, ""),
      origin: cells[4].replace(/`/g, ""),
      fw: cells[5].replace(/`/g, ""),
      priority: cells[6].replace(/`/g, ""),
    });
  }
  return stories;
}

const args = parseArgs(process.argv.slice(2));
const prefixes = loadPrefixes();
const hasRegistry = fs.existsSync(REGISTRY);

if (args["from-study"] && args["from-study"] !== "true") {
  const studyFile = args["from-study"];
  const stories = parseStudy(path.isAbsolute(studyFile) ? studyFile : path.join(REPO_ROOT, studyFile));
  if (stories.length === 0) die(`no rows with "Decision: implement" in ${studyFile}`);

  let registry = hasRegistry ? readText(REGISTRY) : null;
  const results = [];
  for (const st of stories) {
    const r = registerOne(st, registry, prefixes, args.dryRun);
    registry = r.registry;
    results.push(r);
  }
  if (!args.dryRun && hasRegistry) fs.writeFileSync(REGISTRY, registry);

  console.log([
    "",
    `── Batch from study: ${studyFile} ──`,
    args.dryRun ? "[dry-run] nothing written." : "Stories registered.",
    "",
    ...results.map((r) => r.summary),
    "",
    `Total: ${results.length} stories${args.dryRun ? " (preview)" : ""}.`,
    "Next: paste each STORY-LOG entry block into Cursor Agent.",
    "",
  ].join("\n"));
  process.exit(0);
}

let registry = hasRegistry ? readText(REGISTRY) : null;
const r = registerOne(args, registry, prefixes, args.dryRun);
if (!args.dryRun && hasRegistry) fs.writeFileSync(REGISTRY, r.registry);

const s = r.story;
console.log([
  "",
  args.dryRun ? "[dry-run] nothing written." : "── Story registered ──",
  `Ticket:     ${s.ticket}`,
  `Area:       ${s.area}  →  cursor/analysis/features/${s.area}/${s.slug}/`,
  `Slug:       ${s.slug}`,
  `FW:         ${s.fw}${s.fwPending ? "  ⚠ pending creation" : ""}`,
  `Stack:      ${s.stack}`,
  r.logFile ? `Story log:  ${path.relative(REPO_ROOT, r.logFile).replaceAll("\\", "/")}` : "Story log:  (no cursor/company/future-work — block below only)",
  `Branch:     ${s.branch}`,
  "",
  "Optional:",
  `  node cursor/scripts/start-feature.mjs --slug ${s.slug}`,
  "",
  "Next step (orchestrator) — paste into Cursor Agent:",
  "",
  lifecycleBlock(s),
  "",
].join("\n"));

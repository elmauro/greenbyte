#!/usr/bin/env node
/**
 * Mechanical gates for the feature lifecycle.
 * Agent judgment stays in prompts; this script runs repeatable checks only.
 *
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase package
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase analysis
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase implementation
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase validation
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase review
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase close-readiness
 *   node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase sync --dry-run
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FEATURES_DIR = path.join(REPO_ROOT, "cursor/analysis/features");
const SYNC_SCRIPT = path.join(__dirname, "sync-github-feature.mjs");

const PHASES = [
  "package",
  "analysis",
  "implementation",
  "validation",
  "review",
  "close-readiness",
  "sync",
];

function parseArgs(argv) {
  const opts = {
    slug: null,
    phase: null,
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") opts.slug = argv[++i];
    else if (a === "--phase") opts.phase = argv[++i];
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

function extractField(content, field) {
  const re = new RegExp(`^-\\s*${field}:\\s*(.+)$`, "m");
  const m = content.match(re);
  if (!m) return null;
  return m[1].replace(/`/g, "").trim();
}

function extractStage(manifest) {
  const m = manifest.match(/^- Current stage:\s*(.+)$/m);
  if (!m) return null;
  const raw = m[1].replace(/\*\*/g, "").trim().toLowerCase();
  if (raw.includes("|")) return null;
  return raw.split(/\s+/)[0];
}

function findFeatureRelDir(slug) {
  if (!fs.existsSync(FEATURES_DIR)) return null;

  function walk(relBase) {
    const abs = path.join(FEATURES_DIR, relBase);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
      const rel = relBase ? path.join(relBase, ent.name) : ent.name;
      const userStory = path.join(FEATURES_DIR, rel, "user-story.md");
      if (fs.existsSync(userStory)) {
        const content = fs.readFileSync(userStory, "utf8");
        const s = extractField(content, "Slug");
        const normalized = (s || ent.name).replace(/^`|`$/g, "").trim();
        if (normalized === slug || ent.name === slug) return rel;
      }
      const nested = walk(rel);
      if (nested) return nested;
    }
    return null;
  }

  return walk("");
}

function loadPackage(slug) {
  const relDir = findFeatureRelDir(slug);
  if (!relDir) throw new Error(`Feature package not found for slug: ${slug}`);
  const dir = path.join(FEATURES_DIR, relDir);
  const read = (name) => {
    const p = path.join(dir, name);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  };
  const userStory = read("user-story.md");
  if (!userStory) throw new Error(`Missing user-story.md for slug: ${slug}`);
  const manifest = read("feature-manifest.md");

  return {
    relDir,
    dir,
    slug,
    name: extractField(userStory, "Name"),
    stackScope: (extractField(userStory, "Stack scope") || extractField(manifest || "", "Stack scope") || "").toLowerCase(),
    ticket: extractField(userStory, "Ticket/story"),
    backlogId: extractField(userStory, "Backlog ID") || extractField(manifest || "", "Backlog ID"),
    userStory,
    analysis: read("analysis.md"),
    manifest,
    implementationNotes: read("implementation-notes.md"),
    testChecklist: read("test-checklist.md"),
    stage: manifest ? extractStage(manifest) : null,
  };
}

function run(cmd, args, { cwd = REPO_ROOT, label, shell } = {}) {
  const useShell = shell ?? process.platform === "win32";
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    shell: useShell,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    ok: r.status === 0,
    label: label || [cmd, ...args].join(" "),
    exitCode: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function runShell(command, label) {
  return run(command, [], { label: label || command, shell: true });
}

function requireFiles(pkg, files, results) {
  for (const file of files) {
    const exists = fs.existsSync(path.join(pkg.dir, file));
    results.checks.push({ id: `file:${file}`, ok: exists, detail: exists ? "present" : "missing" });
    if (!exists) results.pass = false;
  }
}

function hasReviewPass(checklist) {
  if (!checklist) return false;
  return /Review:\s*\*\*pass\*\*/i.test(checklist);
}

function hasValidationEvidence(checklist) {
  if (!checklist) return false;
  const hasAutomated =
    /## Automated Checks/i.test(checklist) &&
    (/\|\s*\[x\]/i.test(checklist) || /\[x\]/i.test(checklist) || /pass/i.test(checklist));
  const hasSignOff = /sign-off:/i.test(checklist) || /validation complete/i.test(checklist);
  return hasAutomated || hasSignOff;
}

function parseYesNo(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v || v === "n/a" || v === "na") return "n/a";
  if (v === "yes" || v === "true") return "yes";
  if (v === "no" || v === "false") return "no";
  return v;
}

function parseValidationPlan(manifest) {
  const plan = {
    runTests: "no",
    frontendTests: "n/a",
    backendTests: "n/a",
    infrastructureValidate: "n/a",
    extraCommands: [],
  };
  if (!manifest) return plan;
  const idx = manifest.search(/^## Validation plan\s*$/m);
  if (idx < 0) return plan;
  const rest = manifest.slice(idx);
  const next = rest.search(/\n## /);
  const section = next < 0 ? rest : rest.slice(0, next);

  const field = (label) => {
    const m = section.match(new RegExp(`^-\\s*${label}:\\s*(.+)$`, "im"));
    return m ? parseYesNo(m[1].replace(/`/g, "").split("|")[0]) : "n/a";
  };
  plan.runTests = field("Run tests") === "n/a" ? "no" : field("Run tests");
  plan.frontendTests = field("Frontend tests");
  plan.backendTests = field("Backend tests");
  plan.infrastructureValidate = field("Infrastructure validate");

  const extraIdx = section.indexOf("- Extra commands:");
  if (extraIdx >= 0) {
    const extraBlock = section.slice(extraIdx);
    for (const line of extraBlock.split("\n").slice(1)) {
      if (/^- /.test(line) && !/^\s+- /.test(line)) break;
      const cmd = line.match(/`([^`]+)`/);
      if (cmd && cmd[1].trim().toLowerCase() !== "n/a") plan.extraCommands.push(cmd[1].trim());
    }
  }
  return plan;
}

function pushCommand(results, cmdResult, id) {
  results.commands.push(cmdResult);
  results.checks.push({
    id,
    ok: cmdResult.ok,
    detail: cmdResult.ok ? "exit 0" : cmdResult.stderr || cmdResult.stdout || `exit ${cmdResult.exitCode}`,
  });
  if (!cmdResult.ok) results.pass = false;
}

function gatePackage(pkg) {
  const results = { phase: "package", pass: true, checks: [] };
  requireFiles(pkg, ["user-story.md"], results);
  for (const [id, value] of [
    ["Name", pkg.name],
    ["Ticket/story", pkg.ticket],
  ]) {
    const ok = Boolean(value);
    results.checks.push({
      id: `user-story:${id}`,
      ok,
      detail: ok ? value : `missing "- ${id}: …"`,
    });
    if (!ok) results.pass = false;
  }
  return results;
}

function gateAnalysis(pkg) {
  const results = gatePackage(pkg);
  results.phase = "analysis";
  requireFiles(pkg, ["analysis.md", "feature-manifest.md"], results);
  return results;
}

function gateImplementation(pkg) {
  const results = gateAnalysis(pkg);
  results.phase = "implementation";
  requireFiles(pkg, ["implementation-notes.md", "test-checklist.md"], results);
  return results;
}

function gateValidation(pkg) {
  const results = gateImplementation(pkg);
  results.phase = "validation";
  results.commands = [];
  const plan = parseValidationPlan(pkg.manifest);
  results.validationPlan = plan;

  if (plan.runTests !== "yes") {
    results.checks.push({
      id: "validation:skipped-commands",
      ok: true,
      detail: "Run tests: no — file checks only",
    });
    return results;
  }

  if (plan.frontendTests === "yes") {
    const cwd = path.join(REPO_ROOT, "frontend");
    if (!fs.existsSync(path.join(cwd, "package.json"))) {
      results.checks.push({ id: "frontend:test", ok: false, detail: "frontend/package.json missing" });
      results.pass = false;
    } else {
      pushCommand(results, run("npm", ["test", "--", "--run"], { cwd, label: "npm test -- --run (frontend/)" }), "frontend:test");
    }
  }

  if (plan.backendTests === "yes") {
    const cwd = path.join(REPO_ROOT, "backend");
    if (!fs.existsSync(path.join(cwd, "package.json"))) {
      results.checks.push({ id: "backend:test", ok: false, detail: "backend/package.json missing" });
      results.pass = false;
    } else {
      pushCommand(results, run("npm", ["test"], { cwd, label: "npm test (backend/)" }), "backend:test");
    }
  }

  if (plan.infrastructureValidate === "yes") {
    const cwd = path.join(REPO_ROOT, "infrastructure");
    if (!fs.existsSync(cwd)) {
      results.checks.push({ id: "infra:validate", ok: false, detail: "infrastructure/ missing" });
      results.pass = false;
    } else {
      pushCommand(results, run("terraform", ["fmt", "-check", "-recursive"], { cwd, label: "terraform fmt -check (infrastructure/)" }), "infra:fmt");
      pushCommand(results, run("terraform", ["validate"], { cwd, label: "terraform validate (infrastructure/)" }), "infra:validate");
    }
  }

  plan.extraCommands.forEach((cmd, i) => {
    pushCommand(results, runShell(cmd, cmd), `extra:${i + 1}`);
  });

  return results;
}

function gateReview(pkg) {
  const results = gateImplementation(pkg);
  results.phase = "review";
  const reviewOk = hasReviewPass(pkg.testChecklist);
  const evidenceOk = hasValidationEvidence(pkg.testChecklist);
  results.checks.push({
    id: "checklist:validation-evidence",
    ok: evidenceOk,
    detail: evidenceOk ? "present" : "missing Automated Checks / sign-off",
  });
  results.checks.push({
    id: "checklist:review-pass",
    ok: reviewOk,
    detail: reviewOk ? "Review: pass" : "missing Review: **pass** in test-checklist.md",
  });
  if (!evidenceOk || !reviewOk) results.pass = false;
  return results;
}

function gateCloseReadiness(pkg) {
  const results = gateReview(pkg);
  results.phase = "close-readiness";
  if (pkg.stage === "closed" || pkg.stage === "done") {
    results.checks.push({
      id: "manifest:already-closed",
      ok: true,
      detail: `manifest already ${pkg.stage} — use sync phase for re-sync`,
    });
  } else if (pkg.stage !== "review" && pkg.stage !== "validation") {
    results.checks.push({
      id: "manifest:stage",
      ok: false,
      detail: `expected stage review or validation before close; got ${pkg.stage || "unknown"}`,
    });
    results.pass = false;
  } else {
    results.checks.push({
      id: "manifest:stage",
      ok: true,
      detail: `stage=${pkg.stage}`,
    });
  }
  return results;
}

function gateSync(pkg, { dryRun }) {
  const results = gatePackage(pkg);
  results.phase = "sync";
  results.commands = [];
  if (!fs.existsSync(SYNC_SCRIPT)) {
    results.checks.push({ id: "github:sync", ok: false, detail: "sync-github-feature.mjs missing" });
    results.pass = false;
    return results;
  }
  const args = [SYNC_SCRIPT, "--slug", pkg.slug];
  if (dryRun) args.push("--dry-run");
  const sync = run("node", args, {
    label: `node cursor/scripts/sync-github-feature.mjs --slug ${pkg.slug}${dryRun ? " --dry-run" : ""}`,
  });
  results.commands.push(sync);
  results.checks.push({
    id: "github:sync",
    ok: sync.ok,
    detail: sync.ok ? "ok" : sync.stderr || sync.stdout || `exit ${sync.exitCode}`,
  });
  if (!sync.ok) results.pass = false;
  return results;
}

function printResults(results, { json }) {
  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  console.log(`\n→ ${results.phase} gate — ${results.pass ? "PASS" : "FAIL"}`);
  console.log(`  Feature: ${results.feature?.slug || "?"} (${results.feature?.name || "?"})`);
  if (results.feature?.stage) console.log(`  Manifest stage: ${results.feature.stage}`);
  if (results.validationPlan) {
    const p = results.validationPlan;
    console.log(`  Validation plan: Run tests=${p.runTests}, frontend=${p.frontendTests}, backend=${p.backendTests}, infra=${p.infrastructureValidate}`);
  }
  for (const c of results.checks) {
    console.log(`  [${c.ok ? "ok" : "FAIL"}] ${c.id}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (results.commands?.length) {
    console.log("\n  Commands:");
    for (const cmd of results.commands) {
      console.log(`    ${cmd.ok ? "✓" : "✗"} ${cmd.label}`);
    }
  }
  console.log("");
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.slug || !opts.phase) {
    console.log(`Usage:
  node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase <phase> [options]

Phases:
  package           user-story.md exists (Name + Ticket/story)
  analysis          + analysis.md, feature-manifest.md
  implementation    + implementation-notes.md, test-checklist.md
  validation        + commands from manifest Validation plan (when Run tests: yes)
  review            + validation evidence and Review: **pass**
  close-readiness   + manifest stage review|validation
  sync              run sync-github-feature.mjs

Options:
  --dry-run         With sync phase: dry-run GitHub sync
  --json            Machine-readable output
`);
    process.exit(opts.help ? 0 : 2);
  }

  if (!PHASES.includes(opts.phase)) {
    console.error(`Unknown phase: ${opts.phase}. Valid: ${PHASES.join(", ")}`);
    process.exit(2);
  }

  let pkg;
  try {
    pkg = loadPackage(opts.slug);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  let results;
  switch (opts.phase) {
    case "package":
      results = gatePackage(pkg);
      break;
    case "analysis":
      results = gateAnalysis(pkg);
      break;
    case "implementation":
      results = gateImplementation(pkg);
      break;
    case "validation":
      results = gateValidation(pkg);
      break;
    case "review":
      results = gateReview(pkg);
      break;
    case "close-readiness":
      results = gateCloseReadiness(pkg);
      break;
    case "sync":
      results = gateSync(pkg, { dryRun: opts.dryRun });
      break;
    default:
      process.exit(2);
  }

  results.feature = {
    slug: pkg.slug,
    name: pkg.name,
    relDir: pkg.relDir,
    stage: pkg.stage,
    stackScope: pkg.stackScope,
    ticket: pkg.ticket,
  };

  printResults(results, { json: opts.json });
  process.exit(results.pass ? 0 : 1);
}

main();

#!/usr/bin/env node
/**
 * Sync a feature package to a GitHub Issue (create or update).
 *
 * Usage:
 *   node cursor/scripts/sync-github-feature.mjs --slug my-feature-slug
 *   node cursor/scripts/sync-github-feature.mjs --name "My feature"
 *   node cursor/scripts/sync-github-feature.mjs --all
 *   node cursor/scripts/sync-github-feature.mjs --setup-project
 *
 * Requires: GitHub CLI (`gh`) authenticated for this repo.
 * Config: cursor/scripts/github-story.config.json (copy from .example.json)
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FEATURES_DIR = path.join(REPO_ROOT, "cursor/analysis/features");
const CONFIG_PATH = path.join(__dirname, "github-story.config.json");
const CONFIG_EXAMPLE = path.join(__dirname, "github-story.config.example.json");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_EXAMPLE, "utf8"));
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function resolveGhBin() {
  if (process.env.GH_BIN) return process.env.GH_BIN;
  const winPath = "C:\\Program Files\\GitHub CLI\\gh.exe";
  if (process.platform === "win32" && fs.existsSync(winPath)) return winPath;
  const r = spawnSync("gh", ["--version"], { encoding: "utf8", shell: true });
  if (r.status === 0) return "gh";
  return winPath;
}

const GH_BIN = resolveGhBin();

function ghAvailable() {
  const r = spawnSync(GH_BIN, ["--version"], { encoding: "utf8", shell: false });
  return r.status === 0;
}

function runGh(args, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${[GH_BIN, ...args].join(" ")}`);
    return "";
  }
  const r = spawnSync(GH_BIN, args, {
    encoding: "utf8",
    cwd: REPO_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });
  if (r.status !== 0) {
    const err = new Error(r.stderr?.trim() || `gh exit ${r.status}`);
    err.stderr = r.stderr;
    err.output = [null, r.stdout, r.stderr];
    throw err;
  }
  return (r.stdout || "").trim();
}

function runGhJson(args, opts = {}) {
  const out = runGh([...args, "--format", "json"], opts);
  if (!out) return null;
  return JSON.parse(out);
}

let projectContextCache = null;

function getProjectContext(config) {
  if (projectContextCache) return projectContextCache;
  if (!config.projectNumber) return null;

  const owner = config.projectOwner || "your-org";
  const num = String(config.projectNumber);

  const view = runGhJson(["project", "view", num, "--owner", owner]);
  if (!view?.id) return null;

  const fields = runGhJson(["project", "field-list", num, "--owner", owner]);
  const fieldName = config.projectStatusFieldName || "Status";
  const statusField = fields?.fields?.find((f) => f.name === fieldName);
  if (!statusField) {
    throw new Error(`Status field "${fieldName}" not found on project #${num}`);
  }

  const statusOptions = {};
  for (const opt of statusField.options || []) {
    statusOptions[opt.name] = opt.id;
  }

  projectContextCache = {
    owner,
    number: config.projectNumber,
    projectId: view.id,
    statusFieldId: statusField.id,
    statusOptions,
  };
  return projectContextCache;
}

function mapStageToProjectStatus(stage, config) {
  if (!stage) return config.defaultProjectStatus || "Backlog";
  const lower = stage.toLowerCase();
  const map = config.manifestStageToProjectStatus || {};
  for (const [key, status] of Object.entries(map)) {
    if (lower.includes(key)) return status;
  }
  return config.defaultProjectStatus || "Backlog";
}

function findProjectItemId(ctx, issueNumber) {
  const data = runGhJson([
    "project",
    "item-list",
    String(ctx.number),
    "--owner",
    ctx.owner,
    "--limit",
    "200",
  ]);
  if (!data?.items) return null;
  for (const item of data.items) {
    const url = item.content?.url || "";
    if (url.includes(`/issues/${issueNumber}`)) return item.id;
  }
  return null;
}

function ensureProjectItem(ctx, issueNumber, issueUrl) {
  let itemId = findProjectItemId(ctx, issueNumber);
  if (itemId) return itemId;
  try {
    const added = runGhJson([
      "project",
      "item-add",
      String(ctx.number),
      "--owner",
      ctx.owner,
      "--url",
      issueUrl,
    ]);
    return added?.id || null;
  } catch {
    return findProjectItemId(ctx, issueNumber);
  }
}

function syncProjectStatus({ issueNumber, issueUrl, meta, config, dryRun }) {
  if (!config.projectNumber) return;

  let ctx;
  try {
    ctx = getProjectContext(config);
  } catch (e) {
    console.warn(`  Project sync skipped: ${e.message}`);
    return;
  }
  if (!ctx) return;

  const statusName = mapStageToProjectStatus(meta.stage, config);
  const optionId = ctx.statusOptions[statusName];
  if (!optionId) {
    console.warn(
      `  Project status "${statusName}" not in board. Available: ${Object.keys(ctx.statusOptions).join(", ")}`
    );
    return;
  }

  if (dryRun) {
    console.log(
      `[dry-run] project #${ctx.number} status → ${statusName} (issue #${issueNumber})`
    );
    return;
  }

  const itemId = ensureProjectItem(ctx, issueNumber, issueUrl);
  if (!itemId) {
    console.warn("  Could not find or add project item");
    return;
  }

  runGh([
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    ctx.projectId,
    "--field-id",
    ctx.statusFieldId,
    "--single-select-option-id",
    optionId,
  ]);
  console.log(`  Project status → ${statusName}`);
}

function getIssueNodeId(issueNumber) {
  const out = runGh([
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "id",
  ]);
  return JSON.parse(out).id || null;
}

function linkSubIssue(parentNumber, childNumber, { dryRun = false } = {}) {
  if (!parentNumber || !childNumber) return;
  if (dryRun) {
    console.log(
      `[dry-run] link sub-issue #${childNumber} under parent #${parentNumber}`
    );
    return;
  }
  try {
    const parentId = getIssueNodeId(parentNumber);
    const childId = getIssueNodeId(childNumber);
    if (!parentId || !childId) {
      console.warn("  Sub-issue link skipped: could not resolve issue node IDs");
      return;
    }
    const query = `
      mutation($parent: ID!, $child: ID!) {
        addSubIssue(input: { issueId: $parent, subIssueId: $child }) {
          issue { number }
        }
      }`;
    runGh([
      "api",
      "graphql",
      "-f",
      `query=${query}`,
      "-f",
      `parent=${parentId}`,
      "-f",
      `child=${childId}`,
    ]);
    console.log(`  Linked as sub-issue of #${parentNumber}`);
  } catch (e) {
    const msg = e.stderr?.toString() || e.message || String(e);
    console.warn(`  Sub-issue link skipped: ${msg.split("\n")[0]}`);
    console.warn(
      `  Link manually in GitHub: issue #${childNumber} → parent #${parentNumber}`
    );
  }
}

function isProjectScopeError(err) {
  const text = `${err.message || ""}${err.stderr || ""}${err.output?.[2] || ""}`;
  return text.includes("read:project") || text.includes("project");
}

function printProjectScopeHelp() {
  console.error(`
GitHub token missing project scopes. Run in PowerShell:

  gh auth refresh -s read:project,project

Then re-run sync.
`);
}

function setupProject(config) {
  if (!ghAvailable()) {
    console.error("Install gh: https://cli.github.com/");
    process.exit(1);
  }
  const owner = config.projectOwner || "your-org";
  console.log(`Projects for ${owner}:\n`);
  let list;
  try {
    list = runGhJson(["project", "list", "--owner", owner, "--limit", "20"]);
    for (const p of list?.projects || []) {
      console.log(`  #${p.number}  ${p.title}  (${p.id})`);
    }
  } catch (e) {
    if (isProjectScopeError(e)) {
      printProjectScopeHelp();
      process.exit(1);
    }
    throw e;
  }
  if (!config.projectNumber) {
    console.log(
      "\nSet projectNumber in cursor/scripts/github-story.config.json then re-run --setup-project"
    );
    return;
  }
  const ctx = getProjectContext(config);
  console.log(`\nProject #${config.projectNumber} (${ctx.projectId})`);
  console.log(`Status field: ${config.projectStatusFieldName || "Status"}`);
  console.log("Status options:");
  for (const name of Object.keys(ctx.statusOptions)) {
    console.log(`  - ${name}`);
  }
  console.log("\nManifest stage → Project Status mapping:");
  for (const [stage, status] of Object.entries(
    config.manifestStageToProjectStatus || {}
  )) {
    const ok = ctx.statusOptions[status] ? "ok" : "MISSING";
    console.log(`  ${stage} → ${status}  [${ok}]`);
  }
}

function extractField(content, field) {
  const re = new RegExp(`^-\\s*${field}:\\s*(.+)$`, "m");
  const m = content.match(re);
  if (!m) return null;
  return m[1].replace(/`/g, "").trim();
}

function extractSection(content, heading) {
  const re = new RegExp(
    `^## ${heading}\\s*$([\\s\\S]*?)(?=^## |\\Z)`,
    "m"
  );
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

function extractNumberedList(section) {
  if (!section) return [];
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim());
}

function extractAcceptanceCriteria(userStory) {
  return extractNumberedList(extractSection(userStory, "Acceptance Criteria"));
}

/** Bullets under `- <label>…:` in TARGET SCOPE (indented `  -` lines). */
function extractTargetScopeBullets(userStory, labelPrefix) {
  const target = extractSection(userStory, "TARGET SCOPE");
  if (!target) return [];
  const lines = target.split("\n");
  const items = [];
  let capture = false;
  const prefix = labelPrefix.toLowerCase();
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^- [A-Za-z]/.test(trimmed) && !line.startsWith("  ")) {
      if (trimmed.toLowerCase().startsWith(`- ${prefix}`)) {
        capture = true;
        continue;
      }
      if (capture) break;
    }
    if (capture && trimmed.startsWith("- ")) {
      const item = trimmed.replace(/^- /, "").trim();
      if (item && !/^none$/i.test(item)) items.push(item);
    }
  }
  return items;
}

function extractOutOfScopeItems(userStory) {
  const target = extractSection(userStory, "TARGET SCOPE");
  const items = [];
  let inOut = false;
  for (const line of target.split("\n")) {
    if (/^- Out of scope:/i.test(line.trim())) {
      inOut = true;
      continue;
    }
    if (inOut && /^- [A-Za-z][^:]*:/.test(line.trim()) && !line.startsWith("  ")) {
      break;
    }
    if (inOut && line.trim().startsWith("- ")) {
      items.push(line.trim().replace(/^- /, ""));
    }
  }
  if (items.length > 0) return items.slice(0, 8);
  const gaps = extractSection(userStory, "GAPS");
  return gaps
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") && /reason:/i.test(l))
    .map((l) => l.replace(/^- /, ""))
    .slice(0, 6);
}

function formatChecklist(items, fallback) {
  if (!items.length) return fallback;
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

function formatBulletList(items, fallback) {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join("\n");
}

function extractStage(manifest) {
  const m = manifest.match(/^- Current stage:\s*\*\*(.+?)\*\*/m);
  return m ? m[1].trim() : null;
}

function extractTicketNumber(ticketStory, config) {
  if (!ticketStory) return null;
  const prefix = (config.ticketPrefix || "STORY").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixed = ticketStory.match(new RegExp(`${prefix}-(\\d+)`, "i"));
  if (prefixed) return prefixed[1].padStart(3, "0");
  const digits = ticketStory.match(/(\d+)/);
  return digits ? digits[1].padStart(3, "0") : null;
}

function repoSlug() {
  try {
    const json = runGh(["repo", "view", "--json", "nameWithOwner"]);
    return JSON.parse(json).nameWithOwner;
  } catch {
    return "owner/repo";
  }
}

function githubPath(relPath) {
  const repo = repoSlug();
  let branch = "master";
  try {
    branch = runGh(["repo", "view", "--json", "defaultBranchRef"]);
    branch = JSON.parse(branch).defaultBranchRef?.name || "master";
  } catch {
    /* use default */
  }
  return `https://github.com/${repo}/blob/${branch}/${relPath.replace(/\\/g, "/")}`;
}

/** Relative path from FEATURES_DIR to package dir (e.g. sqs/simulith-create-queue). */
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

function listFeatureSlugs() {
  if (!fs.existsSync(FEATURES_DIR)) return [];
  const slugs = [];

  function walk(relBase) {
    const abs = path.join(FEATURES_DIR, relBase);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
      const rel = relBase ? path.join(relBase, ent.name) : ent.name;
      const userStory = path.join(FEATURES_DIR, rel, "user-story.md");
      if (fs.existsSync(userStory)) {
        const content = fs.readFileSync(userStory, "utf8");
        const s = extractField(content, "Slug");
        const slug = (s || ent.name).replace(/^`|`$/g, "").trim();
        if (!slugs.includes(slug)) slugs.push(slug);
        continue;
      }
      walk(rel);
    }
  }

  walk("");
  return slugs.sort();
}

function resolveSlug({ slug, name }) {
  if (slug) {
    const rel = findFeatureRelDir(slug);
    if (!rel) {
      throw new Error(`No user-story.md for slug: ${slug}`);
    }
    return slug;
  }
  if (name) {
    for (const s of listFeatureSlugs()) {
      const rel = findFeatureRelDir(s);
      const content = fs.readFileSync(
        path.join(FEATURES_DIR, rel, "user-story.md"),
        "utf8"
      );
      const n = extractField(content, "Name");
      if (n && n.toLowerCase() === name.toLowerCase()) return s;
    }
    throw new Error(`No feature found with name: ${name}`);
  }
  throw new Error("Provide --slug or --name");
}

function loadFeature(slug, config = {}) {
  const relDir = findFeatureRelDir(slug);
  if (!relDir) {
    throw new Error(`Feature package not found for slug: ${slug}`);
  }
  const dir = path.join(FEATURES_DIR, relDir);
  const userStoryPath = path.join(dir, "user-story.md");
  const manifestPath = path.join(dir, "feature-manifest.md");
  const syncPath = path.join(dir, "github.sync.json");

  const userStory = fs.readFileSync(userStoryPath, "utf8");
  const manifest = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, "utf8")
    : "";

  const meta = {
    slug,
    name: extractField(userStory, "Name"),
    ticketStory: extractField(userStory, "Ticket/story"),
    backlogId: extractField(userStory, "Backlog ID"),
    changeType: extractField(userStory, "Change type"),
    stackScope: extractField(userStory, "Stack scope"),
    goal: extractSection(userStory, "Goal"),
    acceptanceCriteria: extractAcceptanceCriteria(userStory),
    frontendScope: extractTargetScopeBullets(userStory, "Frontend target"),
    runtimeScope: extractTargetScopeBullets(userStory, "Runtime target"),
    backendScope: extractTargetScopeBullets(userStory, "Backend target"),
    infraScope: extractTargetScopeBullets(userStory, "Infrastructure target"),
    outOfScope: extractOutOfScopeItems(userStory),
    stage: manifest ? extractStage(manifest) : null,
    ticketNum: extractTicketNumber(extractField(userStory, "Ticket/story"), config),
    sync: fs.existsSync(syncPath)
      ? JSON.parse(fs.readFileSync(syncPath, "utf8"))
      : null,
  };

  if (!meta.name) throw new Error(`Missing Name in ${userStoryPath}`);

  return { dir, relDir, userStoryPath, manifestPath, syncPath, meta };
}

function issueTitle(meta) {
  const ticket = meta.ticketStory?.trim() || meta.slug;
  return `${ticket} — ${meta.name}`;
}

function issueBody(meta, featureRelDir) {
  const base = `cursor/analysis/features/${featureRelDir || meta.slug}`;
  const ac = formatChecklist(meta.acceptanceCriteria, "- [ ] See user-story.md");

  const goalLines = meta.goal
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .join("\n");

  const scopeBlocks = [
    ["Runtime", meta.runtimeScope],
    ["Backend", meta.backendScope],
    ["Frontend", meta.frontendScope],
    ["Infrastructure", meta.infraScope],
  ]
    .filter(([, items]) => items.length > 0)
    .map(
      ([label, items]) =>
        `### ${label}\n${formatBulletList(items, "_None._")}`
    )
    .join("\n\n");

  const outOfScope = formatBulletList(
    meta.outOfScope,
    "_See user-story.md § TARGET SCOPE._"
  );

  return `## Ticket
${meta.ticketStory || "n/a"}

## Feature
- **Name:** ${meta.name}
- **Slug:** \`${meta.slug}\`
- **Backlog:** ${meta.backlogId || "n/a"}
- **Stack:** ${meta.stackScope || "n/a"}
- **Change type:** ${meta.changeType || "n/a"}
- **Stage:** ${meta.stage || "n/a"}

## Goal
${goalLines || "_See user story._"}

## Acceptance criteria
${ac}

## Target scope
${scopeBlocks || "_See user-story.md § TARGET SCOPE._"}

## Out of scope
${outOfScope}

## Spec (source of truth)
- [user-story.md](${githubPath(`${base}/user-story.md`)})
- [feature-manifest.md](${githubPath(`${base}/feature-manifest.md`)})
- [analysis.md](${githubPath(`${base}/analysis.md`)})
- [test-checklist.md](${githubPath(`${base}/test-checklist.md`)})

---
_Synced from \`${meta.slug}\` via \`cursor/scripts/sync-github-feature.mjs\`_
`;
}

function findExistingIssue(meta, { dryRun }) {
  if (meta.sync?.issueNumber) {
    return { number: meta.sync.issueNumber, url: meta.sync.issueUrl };
  }
  const ticket = meta.ticketStory?.trim();
  if (!ticket) return null;
  if (dryRun) {
    console.log(`[dry-run] search issues: ${ticket} in:title`);
    return null;
  }
  try {
    const out = runGh([
      "issue",
      "list",
      "--search",
      `${ticket} in:title`,
      "--json",
      "number,url,title",
      "--limit",
      "5",
    ]);
    const issues = JSON.parse(out);
    const match = issues.find((i) =>
      i.title.toLowerCase().includes(ticket.toLowerCase())
    );
    return match || null;
  } catch {
    return null;
  }
}

function ensureLabels(labels, { dryRun }) {
  if (dryRun) return;
  try {
    const existing = JSON.parse(runGh(["label", "list", "--json", "name"]));
    const names = new Set(existing.map((l) => l.name));
    for (const label of labels) {
      if (!names.has(label)) {
        runGh([
          "label",
          "create",
          label,
          "--description",
          "Feature story sync",
        ]);
        console.log(`Created label: ${label}`);
      }
    }
  } catch (e) {
    console.warn(`Label warning: ${e.message}`);
  }
}

function buildLabels(meta, config) {
  const labels = [...(config.defaultLabels || ["story"])];
  if (meta.stackScope && config.stackLabels?.[meta.stackScope]) {
    labels.push(config.stackLabels[meta.stackScope]);
  }
  if (meta.ticketNum && config.ticketPhase?.[meta.ticketNum]) {
    labels.push(config.ticketPhase[meta.ticketNum]);
  }
  return [...new Set(labels)];
}

function syncFeature(slug, { dryRun = false, config } = {}) {
  const { relDir, syncPath, meta } = loadFeature(slug, config);
  const title = issueTitle(meta);
  const body = issueBody(meta, relDir);
  const labels = buildLabels(meta, config);

  console.log(`\n→ ${title} (${slug})`);

  ensureLabels(labels, { dryRun });

  let issue = findExistingIssue(meta, { dryRun });
  const shouldClose =
    meta.stage &&
    Object.keys(config.stageToIssueState || {}).some(
      (k) =>
        meta.stage.toLowerCase().includes(k) &&
        config.stageToIssueState[k] === "closed"
    );

  if (issue) {
    console.log(`  Update issue #${issue.number}`);
    if (!dryRun) {
      runGh([
        "issue",
        "edit",
        String(issue.number),
        "--title",
        title,
        "--body",
        body,
      ]);
      runGh([
        "issue",
        "edit",
        String(issue.number),
        "--add-label",
        labels.join(","),
      ]);
      if (shouldClose) {
        runGh(["issue", "close", String(issue.number)]);
      } else {
        runGh(["issue", "reopen", String(issue.number)]);
      }
      const phase =
        meta.ticketNum && config.ticketPhase?.[meta.ticketNum]
          ? config.ticketPhase[meta.ticketNum]
          : null;
      const parentIssue = phase && config.phaseParents?.[phase];
      if (parentIssue) {
        linkSubIssue(parentIssue, issue.number, { dryRun });
      }
    }
  } else {
    console.log("  Create issue");
    const createArgs = [
      "issue",
      "create",
      "--title",
      title,
      "--body",
      body,
      "--label",
      labels.join(","),
    ];
    const phase =
      meta.ticketNum && config.ticketPhase?.[meta.ticketNum]
        ? config.ticketPhase[meta.ticketNum]
        : null;
    const parentIssue = phase && config.phaseParents?.[phase];
    if (dryRun) {
      runGh(createArgs, { dryRun: true });
      if (parentIssue) {
        linkSubIssue(parentIssue, 0, { dryRun: true });
      }
      issue = { number: 0, url: "https://github.com/example/issues/0" };
    } else {
      const url = runGh(createArgs);
      const num = url.match(/\/issues\/(\d+)/)?.[1];
      issue = { number: Number(num), url };
      if (parentIssue && issue.number) {
        linkSubIssue(parentIssue, issue.number, { dryRun });
      }
    }
  }

  if (config.projectNumber && issue?.number) {
    try {
      if (!dryRun) {
        syncProjectStatus({
          issueNumber: issue.number,
          issueUrl:
            issue.url ||
            `https://github.com/${repoSlug()}/issues/${issue.number}`,
          meta,
          config,
          dryRun,
        });
      } else {
        syncProjectStatus({
          issueNumber: issue?.number || 0,
          issueUrl: issue?.url,
          meta,
          config,
          dryRun: true,
        });
      }
    } catch (e) {
      if (isProjectScopeError(e)) {
        console.warn("  Project board sync skipped (missing scopes).");
        printProjectScopeHelp();
      } else {
        throw e;
      }
    }
  }

  if (!dryRun && issue?.number) {
    const sync = {
      issueNumber: issue.number,
      issueUrl:
        issue.url ||
        `https://github.com/${repoSlug()}/issues/${issue.number}`,
      featureSlug: meta.slug,
      featureName: meta.name,
      ticket: meta.ticketStory,
      lastSyncedAt: new Date().toISOString(),
    };
    fs.writeFileSync(syncPath, JSON.stringify(sync, null, 2) + "\n");
    console.log(`  Wrote ${path.relative(REPO_ROOT, syncPath)}`);
  }

  return issue;
}

function parseArgs(argv) {
  const opts = { dryRun: false, all: false, fromHook: false, setupProject: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--all") opts.all = true;
    else if (a === "--from-hook") opts.fromHook = true;
    else if (a === "--setup-project") opts.setupProject = true;
    else if (a === "--slug") opts.slug = argv[++i];
    else if (a === "--name") opts.name = argv[++i];
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

function slugFromHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    const input = JSON.parse(raw);
    const filePath =
      input.file_path ||
      input.path ||
      input.filePath ||
      input?.edit?.path ||
      "";
    const normalized = filePath.replace(/\\/g, "/");
    const m = normalized.match(
      /cursor\/analysis\/features\/(.+)\/(user-story|feature-manifest)\.md$/
    );
    if (!m) return null;
    const relDir = m[1];
    const userStoryPath = path.join(FEATURES_DIR, relDir, "user-story.md");
    if (!fs.existsSync(userStoryPath)) return null;
    const content = fs.readFileSync(userStoryPath, "utf8");
    const slugField = extractField(content, "Slug");
    if (slugField) return slugField.replace(/^`|`$/g, "").trim();
    return path.basename(relDir);
  } catch {
    return null;
  }
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(`Usage:
  node cursor/scripts/sync-github-feature.mjs --slug <feature-slug>
  node cursor/scripts/sync-github-feature.mjs --name "<feature-name>"
  node cursor/scripts/sync-github-feature.mjs --all
  node cursor/scripts/sync-github-feature.mjs --slug <slug> --dry-run
  node cursor/scripts/sync-github-feature.mjs --setup-project

Hook mode: --from-hook (reads Cursor afterFileEdit JSON from stdin)
`);
    process.exit(0);
  }

  const config = loadConfig();

  if (opts.setupProject) {
    setupProject(config);
    return;
  }

  if (opts.fromHook) {
    if (!config.hookEnabled) {
      process.exit(0);
    }
    const slug = slugFromHookInput();
    if (!slug) process.exit(0);
    opts.slug = slug;
  }

  if (!opts.fromHook && !opts.dryRun && !ghAvailable()) {
    console.error(`
GitHub CLI (gh) not found in PATH.

Install: https://cli.github.com/
Then: gh auth login
`);
    process.exit(1);
  }

  if (opts.all) {
    const slugs = listFeatureSlugs();
    console.log(`Syncing ${slugs.length} feature(s)...`);
    for (const slug of slugs) {
      syncFeature(slug, { dryRun: opts.dryRun, config });
    }
    return;
  }

  const slug = resolveSlug(opts);
  syncFeature(slug, { dryRun: opts.dryRun, config });
}

main();

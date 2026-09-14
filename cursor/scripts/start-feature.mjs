#!/usr/bin/env node
/**
 * Start feature work: create a git branch from a feature package.
 *
 * Usage:
 *   node cursor/scripts/start-feature.mjs --slug <feature-slug>
 *   node cursor/scripts/start-feature.mjs --slug <feature-slug> --dry-run
 *   node cursor/scripts/start-feature.mjs --slug <feature-slug> --branch-prefix hotfix
 *
 * Reads Ticket/story and Name from cursor/analysis/features/.../user-story.md
 * Config (optional): cursor/scripts/github-story.config.json → branchPrefix, defaultBranch
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FEATURES_DIR = path.join(REPO_ROOT, "cursor/analysis/features");
const CONFIG_PATH = path.join(__dirname, "github-story.config.json");
const CONFIG_EXAMPLE = path.join(__dirname, "github-story.config.example.json");

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
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

function loadConfig() {
  const file = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function extractField(content, field) {
  const re = new RegExp(`^-\\s*${field}:\\s*(.+)$`, "m");
  const m = content.match(re);
  return m ? m[1].replace(/`/g, "").trim() : null;
}

function findFeatureDir(slug) {
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
      if (ent.name === slug) {
        const userStory = path.join(FEATURES_DIR, rel, "user-story.md");
        if (fs.existsSync(userStory)) return rel;
      }
      const userStory = path.join(FEATURES_DIR, rel, "user-story.md");
      if (fs.existsSync(userStory)) {
        const content = fs.readFileSync(userStory, "utf8");
        const s = extractField(content, "Slug");
        const normalized = (s || ent.name).replace(/^`|`$/g, "").trim();
        if (normalized === slug) return rel;
      }
      const nested = walk(rel);
      if (nested) return nested;
    }
    return null;
  }

  return walk("");
}

function sanitizeBranchPart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function branchName(ticket, slug, config) {
  const prefix = sanitizeBranchPart(config.branchPrefix || "feature");
  const ticketPart = sanitizeBranchPart(ticket || slug);
  return `${prefix}/${ticketPart}`;
}

const args = parseArgs(process.argv.slice(2));
const slug = (args.slug || "").trim();
if (!slug) die("usa --slug <feature-slug>");

const relDir = findFeatureDir(slug);
if (!relDir) {
  die(`no encontré user-story.md para slug \`${slug}\` bajo cursor/analysis/features/`);
}

const userStoryPath = path.join(FEATURES_DIR, relDir, "user-story.md");
const userStory = fs.readFileSync(userStoryPath, "utf8");
const name = extractField(userStory, "Name") || slug;
const ticket = extractField(userStory, "Ticket/story") || slug;
const config = loadConfig();
const branch = branchName(ticket, slug, config);
const title = `${ticket} — ${name}`;

if (args.dryRun) {
  console.log(`[dry-run] git checkout -b ${branch}`);
} else {
  try {
    execSync(`git checkout -b ${branch}`, { stdio: "inherit", cwd: REPO_ROOT });
  } catch (e) {
    die(`git checkout -b falló (¿el branch ya existe?): ${e.message}`);
  }
}

console.log([
  "",
  args.dryRun ? "[dry-run] no se creó el branch." : "── Branch creado ──",
  `Feature:     ${name}`,
  `Slug:        ${slug}`,
  `Ticket:      ${ticket}`,
  `Branch:      ${branch}`,
  "",
  "Al terminar:",
  `  git commit -m "feat: ${name}"`,
  `  git push -u origin ${branch}`,
  `  gh pr create --base ${config.defaultBranch || "main"} --fill --title "${title}"`,
  "",
  "Sync issue/board (opcional):",
  `  node cursor/scripts/sync-github-feature.mjs --slug ${slug}`,
  "",
].join("\n"));

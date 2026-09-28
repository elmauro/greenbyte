#!/usr/bin/env node
/**
 * Sync cursor/analysis/features/INDEX.md with the feature packages on disk.
 *
 * Scans cursor/analysis/features/ for packages, detects missing entries or
 * stage changes in feature-manifest.md, and updates INDEX.md.
 *
 * Usage:
 *   node cursor/scripts/sync-features-index.mjs
 *   node cursor/scripts/sync-features-index.mjs --apply
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FEATURES_DIR = path.join(REPO_ROOT, "cursor/analysis/features");
const INDEX = path.join(FEATURES_DIR, "INDEX.md");
const REGISTRY = path.join(
  REPO_ROOT,
  "cursor/company/future-work/STORY-REGISTRY.md",
);

const APPLY = process.argv.includes("--apply");

function extractField(content, fieldName) {
  const re = new RegExp(`^-\\s*${fieldName}:\\s*(.+)$`, "m");
  const m = content.match(re);
  if (!m) return "";
  return m[1].replace(/`/g, "").trim();
}

function extractStage(content) {
  const m = content.match(/^- Current stage:\s*(.+)$/m);
  if (!m) return "planned";
  const raw = m[1].replace(/\*\*/g, "").trim().toLowerCase();
  if (raw.includes("|")) return "planned";
  return raw.split(/\s+/)[0];
}

function readRegistryTitles() {
  const titles = new Map();
  if (!fs.existsSync(REGISTRY)) return titles;
  const content = fs.readFileSync(REGISTRY, "utf8");
  const rows = content.matchAll(/^\|\s*([A-Za-z0-9_-]+)\s*\|[^|]*\|[^|]*\|([^|]+)\|/gm);
  for (const [, ticket, name] of rows) {
    const t = ticket.trim();
    const title = name.trim();
    if (t && title && !titles.has(t)) titles.set(t, title);
  }
  return titles;
}

function scanPackages(registryTitles) {
  if (!fs.existsSync(FEATURES_DIR)) return [];

  const pkgs = [];
  const entries = fs.readdirSync(FEATURES_DIR, { withFileTypes: true });

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;

    const entPath = path.join(FEATURES_DIR, ent.name);
    const directManifest = path.join(entPath, "feature-manifest.md");
    const directStory = path.join(entPath, "user-story.md");

    if (fs.existsSync(directManifest) || fs.existsSync(directStory)) {
      // Direct package without area
      const pkg = parsePackage(entPath, ent.name, "n/a", registryTitles);
      if (pkg) pkgs.push(pkg);
    } else {
      // Area directory
      const area = ent.name;
      const subEntries = fs.readdirSync(entPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
        const subPath = path.join(entPath, sub.name);
        const subManifest = path.join(subPath, "feature-manifest.md");
        const subStory = path.join(subPath, "user-story.md");
        if (fs.existsSync(subManifest) || fs.existsSync(subStory)) {
          const pkg = parsePackage(subPath, sub.name, area, registryTitles);
          if (pkg) pkgs.push(pkg);
        }
      }
    }
  }

  return pkgs;
}

function parsePackage(pkgDir, dirSlug, area, registryTitles) {
  const manifestPath = path.join(pkgDir, "feature-manifest.md");
  const storyPath = path.join(pkgDir, "user-story.md");

  const manifestContent = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, "utf8")
    : "";
  const storyContent = fs.existsSync(storyPath)
    ? fs.readFileSync(storyPath, "utf8")
    : "";

  const ticket =
    extractField(manifestContent, "Ticket/story") ||
    extractField(storyContent, "Ticket/story") ||
    "—";

  const backlog =
    extractField(manifestContent, "Backlog ID") ||
    extractField(storyContent, "Backlog ID") ||
    "n/a";

  const slug =
    extractField(manifestContent, "Slug") ||
    extractField(storyContent, "Slug") ||
    dirSlug;

  const name =
    extractField(manifestContent, "Name") ||
    extractField(storyContent, "Name") ||
    registryTitles.get(ticket) ||
    slug;

  const stage = manifestContent
    ? extractStage(manifestContent)
    : "planned";

  return {
    ticket,
    backlog: backlog.includes("—") ? "n/a" : backlog,
    slug,
    name,
    area,
    stage,
  };
}

function parseIndexTable(indexContent) {
  const lines = indexContent.split(/\r?\n/);
  const rows = [];
  let inTable = false;
  let tableHeaderIdx = -1;
  let tableEndIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\|\s*Ticket\s*\|\s*Backlog ID\s*\|/i.test(line)) {
      inTable = true;
      tableHeaderIdx = i;
      continue;
    }

    if (inTable) {
      if (line.startsWith("| ---")) continue;
      if (!line.startsWith("|")) {
        tableEndIdx = i;
        break;
      }

      const parts = line.split("|").map((p) => p.trim());
      // parts[0] is empty, 1: Ticket, 2: Backlog ID, 3: Slug, 4: Name, 5: Area, 6: Stage
      if (parts.length >= 7) {
        rows.push({
          lineIdx: i,
          ticket: parts[1],
          backlog: parts[2],
          slug: parts[3].replace(/`/g, ""),
          name: parts[4],
          area: parts[5],
          stage: parts[6],
        });
      }
    }
  }

  if (tableEndIdx === -1 && inTable) tableEndIdx = lines.length;

  return { lines, rows, tableHeaderIdx, tableEndIdx };
}

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error(`ERROR: ${INDEX} not found`);
    process.exit(1);
  }

  const registryTitles = readRegistryTitles();
  const packages = scanPackages(registryTitles);
  const indexContent = fs.readFileSync(INDEX, "utf8");
  const { lines, rows, tableHeaderIdx, tableEndIdx } = parseIndexTable(indexContent);

  if (tableHeaderIdx === -1) {
    console.error("ERROR: Table header '| Ticket | Backlog ID |' not found in INDEX.md");
    process.exit(1);
  }

  const indexMap = new Map();
  for (const row of rows) {
    indexMap.set(row.slug, row);
  }

  const missing = [];
  const updated = [];

  for (const pkg of packages) {
    const existing = indexMap.get(pkg.slug);
    if (!existing) {
      missing.push(pkg);
    } else if (existing.stage !== pkg.stage) {
      updated.push({ pkg, oldStage: existing.stage });
    }
  }

  console.log(`Packages found on disk: ${packages.length}`);
  console.log(`Rows in INDEX.md:       ${rows.length}`);
  console.log(`Missing from index:     ${missing.length}`);
  console.log(`Stage mismatches:       ${updated.length}`);

  if (missing.length === 0 && updated.length === 0) {
    console.log("\nINDEX.md is already up to date.");
    return;
  }

  if (missing.length > 0) {
    console.log("\nPackages to add to INDEX.md:");
    for (const m of missing) {
      console.log(`  + ${m.ticket} | ${m.slug} (${m.area}) [${m.stage}]`);
    }
  }

  if (updated.length > 0) {
    console.log("\nStage updates:");
    for (const u of updated) {
      console.log(`  ~ ${u.pkg.slug}: ${u.oldStage} → ${u.pkg.stage}`);
    }
  }

  if (!APPLY) {
    console.log("\n[dry-run] Run with --apply to write changes to INDEX.md.");
    return;
  }

  // Build unified table rows
  const allEntries = new Map();
  for (const r of rows) {
    allEntries.set(r.slug, {
      ticket: r.ticket,
      backlog: r.backlog,
      slug: r.slug,
      name: r.name,
      area: r.area,
      stage: r.stage,
    });
  }

  for (const u of updated) {
    const item = allEntries.get(u.pkg.slug);
    if (item) item.stage = u.pkg.stage;
  }

  for (const m of missing) {
    allEntries.set(m.slug, m);
  }

  // Sort rows cleanly: known ticket numbers first
  const sorted = Array.from(allEntries.values()).sort((a, b) => {
    const numA = parseInt((a.ticket.match(/\d+/) || ["0"])[0], 10);
    const numB = parseInt((b.ticket.match(/\d+/) || ["0"])[0], 10);
    return numA - numB;
  });

  const formattedRows = sorted.map(
    (item) =>
      `| ${item.ticket} | ${item.backlog} | \`${item.slug}\` | ${item.name} | ${item.area} | ${item.stage} |`
  );

  const beforeTable = lines.slice(0, tableHeaderIdx + 2); // includes header + separator
  const afterTable = lines.slice(tableEndIdx);

  const finalLines = [...beforeTable, ...formattedRows, ...afterTable];
  fs.writeFileSync(INDEX, finalLines.join("\n"), "utf8");

  console.log("\nINDEX.md has been successfully updated.");
}

main();

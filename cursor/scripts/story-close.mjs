#!/usr/bin/env node
/**
 * Automated story close helper for GreenByte.
 *
 * Updates:
 *   1) feature-manifest.md (stage: done, review: done)
 *   2) STORY-REGISTRY.md (status: shipped)
 *   3) future-work/<area>/STORY-LOG.md (status: shipped · Shipped: YYYY-MM-DD)
 *   4) cursor/analysis/features/INDEX.md (via sync-features-index)
 *
 * Usage:
 *   node cursor/scripts/story-close.mjs --slug <slug> [--dry-run]
 *   node cursor/scripts/story-close.mjs --ticket <ticket> [--dry-run]
 *   node cursor/scripts/story-close.mjs --slug <slug> --apply
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FEATURES_DIR = path.join(REPO_ROOT, "cursor/analysis/features");
const FW_ROOT = path.join(REPO_ROOT, "cursor/company/future-work");
const REGISTRY = path.join(FW_ROOT, "STORY-REGISTRY.md");
const SYNC_INDEX_SCRIPT = path.join(__dirname, "sync-features-index.mjs");

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    slug: null,
    ticket: null,
    dryRun: false,
    apply: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") opts.slug = argv[++i];
    else if (a === "--ticket") opts.ticket = argv[++i];
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--apply") opts.apply = true;
    else if (a === "--force") opts.force = true;
  }
  return opts;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function extractField(content, fieldName) {
  const re = new RegExp(`^-\\s*${fieldName}:\\s*(.+)$`, "m");
  const m = content.match(re);
  if (!m) return "";
  return m[1].replace(/`/g, "").trim();
}

function findPackage(slugOrTicket) {
  if (!fs.existsSync(FEATURES_DIR)) return null;

  const target = slugOrTicket.toLowerCase();
  const entries = fs.readdirSync(FEATURES_DIR, { withFileTypes: true });

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const directPath = path.join(FEATURES_DIR, ent.name);
    const manifestPath = path.join(directPath, "feature-manifest.md");

    if (fs.existsSync(manifestPath)) {
      const manifest = fs.readFileSync(manifestPath, "utf8");
      const slug = extractField(manifest, "Slug") || ent.name;
      const ticket = extractField(manifest, "Ticket/story");
      if (
        slug.toLowerCase() === target ||
        ticket.toLowerCase() === target ||
        ticket.replace(/^GREENBYTE-/i, "") === target
      ) {
        return { dir: directPath, area: "n/a", slug, ticket };
      }
    } else {
      const subEntries = fs.readdirSync(directPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
        const subPath = path.join(directPath, sub.name);
        const subManifest = path.join(subPath, "feature-manifest.md");
        if (fs.existsSync(subManifest)) {
          const manifest = fs.readFileSync(subManifest, "utf8");
          const slug = extractField(manifest, "Slug") || sub.name;
          const ticket = extractField(manifest, "Ticket/story");
          if (
            slug.toLowerCase() === target ||
            ticket.toLowerCase() === target ||
            ticket.replace(/^GREENBYTE-/i, "") === target
          ) {
            return { dir: subPath, area: ent.name, slug, ticket };
          }
        }
      }
    }
  }

  return null;
}

function updateManifest(manifestPath, dryRun) {
  let content = fs.readFileSync(manifestPath, "utf8");
  const today = todayIso();

  // Update Status fields
  content = content.replace(/^- Current stage:\s*.*$/m, "- Current stage: done");
  content = content.replace(/^- Review:\s*.*$/m, "- Review: done");
  content = content.replace(/^- Testing:\s*.*$/m, "- Testing: done");
  content = content.replace(/^- Last updated:\s*.*$/m, `- Last updated: ${today}`);

  if (dryRun) {
    console.log(`[dry-run] Would update ${manifestPath}`);
  } else {
    fs.writeFileSync(manifestPath, content, "utf8");
    console.log(`[ok] Updated ${manifestPath}`);
  }
}

function updateRegistry(ticket, slug, dryRun) {
  if (!fs.existsSync(REGISTRY)) return;

  let content = fs.readFileSync(REGISTRY, "utf8");
  const lines = content.split(/\r?\n/);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(`| ${ticket} |`) || line.includes(`\`${slug}\``)) {
      if (line.includes("| planned |") || line.includes("| active |")) {
        lines[i] = line
          .replace("| planned |", "| shipped |")
          .replace("| active |", "| shipped |");
        updated = true;
        break;
      }
    }
  }

  if (updated) {
    if (dryRun) {
      console.log(`[dry-run] Would update row in ${REGISTRY} to 'shipped'`);
    } else {
      fs.writeFileSync(REGISTRY, lines.join("\n"), "utf8");
      console.log(`[ok] Updated ${REGISTRY} row to 'shipped'`);
    }
  } else {
    console.log(`[info] No pending registry row found for ${ticket} in ${REGISTRY}`);
  }
}

function updateStoryLog(area, ticket, dryRun) {
  if (area === "n/a") return;
  const logPath = path.join(FW_ROOT, area, "STORY-LOG.md");
  if (!fs.existsSync(logPath)) return;

  let content = fs.readFileSync(logPath, "utf8");
  const today = todayIso();
  const ticketHeader = `### ${ticket} —`;

  const idx = content.indexOf(ticketHeader);
  if (idx === -1) {
    console.log(`[info] Ticket ${ticket} not found in ${logPath}`);
    return;
  }

  const nextEntryIdx = content.indexOf("\n### ", idx + ticketHeader.length);
  const blockEnd = nextEntryIdx === -1 ? content.length : nextEntryIdx;
  let block = content.slice(idx, blockEnd);

  if (block.includes("- Status: planned") || block.includes("- Status: active")) {
    block = block
      .replace(/- Status:\s*planned/, `- Status: shipped · Shipped: ${today}`)
      .replace(/- Status:\s*active/, `- Status: shipped · Shipped: ${today}`);

    content = content.slice(0, idx) + block + content.slice(blockEnd);

    if (dryRun) {
      console.log(`[dry-run] Would mark ${ticket} shipped in ${logPath}`);
    } else {
      fs.writeFileSync(logPath, content, "utf8");
      console.log(`[ok] Marked ${ticket} shipped in ${logPath}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const target = args.slug || args.ticket;

  if (!target) {
    die("Please specify --slug <slug> or --ticket <ticket>");
  }

  const pkg = findPackage(target);
  if (!pkg) {
    die(`Package not found for "${target}" under ${FEATURES_DIR}`);
  }

  const manifestPath = path.join(pkg.dir, "feature-manifest.md");
  const checklistPath = path.join(pkg.dir, "test-checklist.md");

  console.log(`Target package: ${pkg.slug} (${pkg.ticket}) in ${pkg.area}`);

  // Validation
  if (fs.existsSync(checklistPath)) {
    const checklist = fs.readFileSync(checklistPath, "utf8");
    const hasReviewPass = /Review:\s*\*\*pass\*\*/i.test(checklist);
    if (!hasReviewPass && !args.force) {
      console.warn(
        "WARNING: test-checklist.md does not contain 'Review: **pass**'."
      );
      console.warn("Complete feature review or use --force to override.");
      if (!args.dryRun) process.exit(1);
    }
  }

  const dryRun = !args.apply || args.dryRun;

  updateManifest(manifestPath, dryRun);
  updateRegistry(pkg.ticket, pkg.slug, dryRun);
  updateStoryLog(pkg.area, pkg.ticket, dryRun);

  if (fs.existsSync(SYNC_INDEX_SCRIPT)) {
    if (dryRun) {
      console.log("[dry-run] Would run sync-features-index.mjs --apply");
    } else {
      execSync(`node "${SYNC_INDEX_SCRIPT}" --apply`, { stdio: "inherit" });
    }
  }

  if (dryRun) {
    console.log("\n[dry-run] Preview complete. Run with --apply to commit changes.");
  } else {
    console.log(`\nStory ${pkg.ticket} (${pkg.slug}) has been successfully closed!`);
  }
}

main();

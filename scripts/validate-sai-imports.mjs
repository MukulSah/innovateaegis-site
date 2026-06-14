#!/usr/bin/env node
/**
 * Build-time guard: ensure closeSession/finalizeSession are never called without imports.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(process.cwd(), "lib", "sai");
const ALLOWED_CALLERS = new Set([
  "session-finalization-engine.ts",
  "session-manager.ts",
  "session-recovery.ts",
]);

const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!name.endsWith(".ts")) continue;
    const rel = full.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "");
    const content = readFileSync(full, "utf8");
    const callsClose = /\bcloseSession\s*\(/.test(content);
    const importsClose =
      /import\s*\{[^}]*closeSession[^}]*\}\s*from/.test(content) ||
      /import\s*\(\s*["'].*session-manager["']\s*\)/.test(content) ||
      /import\s*\(\s*["'].*session-finalization-engine["']\s*\)/.test(content);

    if (callsClose && !importsClose && !ALLOWED_CALLERS.has(name)) {
      violations.push(`${rel}: calls closeSession() without import`);
    }

    const callsFinalize = /\bfinalizeSession\s*\(/.test(content);
    const importsFinalize =
      /import\s*\{[^}]*finalizeSession[^}]*\}\s*from/.test(content) ||
      /import\s*\(\s*["'].*session-finalization-engine["']\s*\)/.test(content) ||
      /import\s*\(\s*["'].*session-finalization["']\s*\)/.test(content);

    if (callsFinalize && !importsFinalize && name !== "session-finalization-engine.ts") {
      violations.push(`${rel}: calls finalizeSession() without import`);
    }
  }
}

walk(ROOT);

if (violations.length) {
  console.error("SAI import validation failed:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log("SAI import validation passed.");

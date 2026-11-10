#!/usr/bin/env node
// Validates that every skill directory contributed by the vendored
// upstreams (see dsh/upstreams.mjs) is loadable by
// @deepseek-ai/dsh-skill-filesystem.
//
// dsh discovers skills one level deep: <root>/<name>/SKILL.md or a flat
// <root>/<name>.md. Entries with invalid frontmatter are skipped with a
// warning and never reach the model catalog, so this script fails loudly on
// anything dsh would silently drop. It also fails on duplicate skill names
// across ALL roots, because dsh resolves cross-root collisions silently.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import upstreams from '../upstreams.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const roots = upstreams.flatMap((u) => u.skillDirs.map((dir) => `${u.prefix}/${dir}`));

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BOOL_WORDS = /^(true|false|yes|no|on|off|1|0)$/i;
const INVOCATION_KEYS = ['disable-model-invocation', 'user-invocable'];

let errors = 0;
let warnings = 0;
const seen = new Map();

function fail(msg) {
  errors++;
  console.error(`error: ${msg}`);
}
function warn(msg) {
  warnings++;
  console.warn(`warning: ${msg}`);
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function checkSkillFile(file, source) {
  const fields = parseFrontmatter(file);
  const rel = path.relative(repoRoot, file);
  if (!fields) {
    fail(`${rel}: missing YAML frontmatter; dsh will skip this entry.`);
    return;
  }
  const { name, description } = fields;
  if (!name) {
    fail(`${rel}: frontmatter "name" is required.`);
  } else if (!KEBAB.test(name)) {
    fail(`${rel}: name "${name}" is not kebab-case; dsh will skip this skill.`);
  } else if (seen.has(name)) {
    fail(`${rel}: duplicate skill name "${name}" (also in ${seen.get(name)}).`);
  } else {
    seen.set(name, source);
  }
  if (!description) fail(`${rel}: frontmatter "description" is required.`);
  for (const key of INVOCATION_KEYS) {
    if (key in fields && !BOOL_WORDS.test(fields[key])) {
      fail(`${rel}: ${key} value "${fields[key]}" is not a strict boolean spelling; dsh will drop the skill.`);
    }
  }
}

for (const root of roots) {
  const dir = path.join(repoRoot, root);
  if (!fs.existsSync(dir)) {
    fail(`${root}: directory not found.`);
    continue;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skillFile = path.join(p, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        warn(`${root}/${entry.name}: no SKILL.md; dsh ignores this directory.`);
        continue;
      }
      checkSkillFile(skillFile, `${root}/${entry.name}`);
      for (const sub of fs.readdirSync(p)) {
        if (sub === 'SKILL.md') continue;
        const nested = path.join(p, sub, 'SKILL.md');
        if (fs.existsSync(nested)) {
          fail(`${path.relative(repoRoot, nested)}: nested SKILL.md is never discovered by dsh (one level only).`);
        }
      }
    } else if (entry.name.endsWith('.md')) {
      // Flat files are skills too. A bucket README.md without frontmatter is
      // skipped by dsh with a warning, so only flag it here as a warning.
      const fields = parseFrontmatter(p);
      if (entry.name === 'README.md' && !fields) {
        warn(`${root}/README.md: no frontmatter; dsh reports a skipped entry. Harmless but noisy.`);
        continue;
      }
      checkSkillFile(p, `${root}/${entry.name}`);
    }
  }
}

console.log(`\n${seen.size} skills validated, ${warnings} warnings, ${errors} errors.`);
process.exit(errors ? 1 : 0);

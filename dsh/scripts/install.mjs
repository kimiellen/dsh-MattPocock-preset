#!/usr/bin/env node
// Generates dsh/cordis.patch.yml from the locally installed dsh's shipped
// standard preset, injecting the Matt Pocock skill roots, then installs this
// repository as a bundle into the chosen dsh profile.
//
// Usage:
//   node dsh/scripts/install.mjs [--profile <name>] [--generate-only] [--dsh <path>]
//
// --profile <name>   target dsh profile, default "web"
// --generate-only    only (re)generate dsh/cordis.patch.yml, skip installation
// --dsh <path>       path to the @deepseek-ai/dsh package directory, overrides
//                    auto-detection via the dsh executable on PATH

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const patchPath = path.join(scriptDir, '..', 'cordis.patch.yml');

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}
const profile = argValue('--profile') ?? 'web';
const generateOnly = args.includes('--generate-only');
const dshDirOverride = argValue('--dsh');

class JsExpr {
  constructor(code) {
    this.code = code;
  }
}
const jsTag = {
  identify: (v) => v instanceof JsExpr,
  tag: 'tag:yaml.org,2002:js',
  resolve: (str) => new JsExpr(str),
  stringify: (item) => item.value.code,
};

// A skill root expression resolved at mount time. Bundle patches are merged
// into the profile's root include, so `baseUrl` is the profile directory, NOT
// this patch file: an expression anchored at the patch file location resolves
// one level above ~/.dsh and silently yields an empty skill catalog. Instead,
// locate this package through Node resolution from baseUrl, mirroring the
// official cordis preset; link installs resolve to the real clone path, so the
// preset works regardless of where the repository is installed.
const packageName = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).name;

function skillDirExpr(...segments) {
  const parts = segments.map((s) => `'${s}'`).join(', ');
  return new JsExpr(
    `(function(u){var p=process.getBuiltinModule('node:path');var m=process.getBuiltinModule('node:module');return p.join(p.dirname(m.createRequire(u).resolve('${packageName}/package.json')),${parts})})(baseUrl)`,
  );
}

function findDshPackageDir() {
  if (dshDirOverride) return path.resolve(dshDirOverride);
  const which = process.platform === 'win32' ? 'where' : 'which';
  let bin;
  try {
    bin = execFileSync(which, ['dsh'], { encoding: 'utf8' }).trim().split('\n')[0];
  } catch {
    throw new Error('dsh executable not found on PATH. Pass --dsh <path to @deepseek-ai/dsh package>.');
  }
  let dir = path.dirname(fs.realpathSync(bin));
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, 'utf8')).name === '@deepseek-ai/dsh') return dir;
      } catch {}
    }
    dir = path.dirname(dir);
  }
  throw new Error(`could not locate the @deepseek-ai/dsh package from ${bin}. Pass --dsh <path>.`);
}

function generate() {
  const dshDir = findDshPackageDir();
  const requireFromDsh = createRequire(path.join(dshDir, 'package.json'));
  let webAppPkg;
  try {
    webAppPkg = requireFromDsh.resolve('@deepseek-ai/dsh-web-app/package.json');
  } catch {
    throw new Error(`@deepseek-ai/dsh-web-app not resolvable from ${dshDir}. Desktop (asar) installs are not readable; use the checked-in dsh/cordis.patch.yml instead.`);
  }
  const standardPath = path.join(path.dirname(webAppPkg), 'presets', 'standard.patch.yml');
  const YAML = requireFromDsh('yaml');
  const text = fs.readFileSync(standardPath, 'utf8');
  const ops = YAML.parse(text, { customTags: [jsTag], version: '1.2' });
  if (!Array.isArray(ops)) throw new Error(`${standardPath}: expected a list of patch operations.`);

  let presetConfig;
  for (const op of ops) {
    const rows = op && Array.isArray(op.insert) ? op.insert : [];
    const row = rows.find((r) => r && r.id === 'preset-standard');
    if (row) presetConfig = row.config;
  }
  if (!presetConfig) throw new Error(`${standardPath}: no preset-standard row found.`);

  const clone = (v) =>
    v instanceof JsExpr
      ? v
      : Array.isArray(v)
        ? v.map(clone)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))
          : v;
  const config = clone(presetConfig);
  config.id = 'mattpocock';
  config.name = 'MattPocock';
  config.description =
    "The standard preset plus Matt Pocock's engineering and productivity skills, scoped to this preset.";
  config.order = 20;

  const skillRow = config.plugins?.find((r) => r && r.id === 'skill-filesystem');
  if (!skillRow) throw new Error('standard preset: no skill-filesystem row found.');
  skillRow.config = {
    ...(skillRow.config ?? {}),
    customSkillDirs: [
      skillDirExpr('skills', 'engineering'),
      skillDirExpr('skills', 'productivity'),
    ],
  };

  const doc = [{ insert: [{ id: 'preset-mattpocock', name: '@deepseek-ai/dsh-agent-preset', config }] }];
  const header =
    '# Generated by dsh/scripts/install.mjs from the locally installed dsh\n' +
    `# (${dshDir}). Regenerate with: npm run dsh:install -- --generate-only\n` +
    '# Do not edit by hand; manual edits are overwritten on the next run.\n';
  fs.writeFileSync(patchPath, header + YAML.stringify(doc, { customTags: [jsTag], lineWidth: 0 }));
  console.log(`wrote ${path.relative(repoRoot, patchPath)} (based on ${standardPath})`);
}

try {
  generate();
} catch (err) {
  if (!fs.existsSync(patchPath)) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  console.warn(`warning: ${err.message}`);
  console.warn('falling back to the checked-in dsh/cordis.patch.yml; verify your dsh version matches.');
}

if (generateOnly) process.exit(0);

const result = spawnSync('dsh', ['plugin', '--profile', profile, 'add', repoRoot], { stdio: 'inherit' });
if (result.error) {
  console.error(`error: failed to run dsh: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 0);

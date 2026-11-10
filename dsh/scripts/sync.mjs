#!/usr/bin/env node
// Syncs every vendored upstream in dsh/upstreams.mjs with its remote using
// git subtree, validates the whole skill set, and records the synced SHAs
// in dsh/UPSTREAMS.
//
// First sync of an entry does `git subtree add`; later syncs do
// `git subtree pull`. Both require a clean working tree.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import upstreams from '../upstreams.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function gitOut(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

if (gitOut('status', '--porcelain')) {
  console.error('error: working tree is not clean; commit or stash first.');
  process.exit(1);
}

const records = [];
for (const u of upstreams) {
  const exists = fs.existsSync(path.join(repoRoot, u.prefix));
  const op = exists ? 'pull' : 'add';
  const message = exists
    ? `Sync ${u.name} from ${u.repo} ${u.ref}`
    : `Vendor ${u.name} from ${u.repo} as a git subtree`;
  console.log(`\n==> ${u.name}: git subtree ${op} ${u.repo} ${u.ref}`);
  execFileSync(
    'git',
    ['subtree', op, `--prefix=${u.prefix}`, u.repo, u.ref, '--squash', '-m', message],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  const sha = gitOut('ls-remote', u.repo, u.ref).split(/\s+/)[0];
  records.push({ ...u, sha });
}

execFileSync(process.execPath, [path.join(repoRoot, 'dsh', 'scripts', 'validate.mjs')], {
  stdio: 'inherit',
});

const synced = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const blocks = records.map((r) =>
  [`name: ${r.name}`, `repo: ${r.repo}`, `ref: ${r.ref}`, `prefix: ${r.prefix}`, `sha: ${r.sha}`, `synced: ${synced}`].join('\n'),
);
fs.writeFileSync(path.join(repoRoot, 'dsh', 'UPSTREAMS'), blocks.join('\n\n') + '\n');
console.log(`\nrecorded ${records.length} upstream(s) in dsh/UPSTREAMS`);

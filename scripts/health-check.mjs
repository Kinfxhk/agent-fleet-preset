#!/usr/bin/env node
/**
 * Health-check for agent-fleet-preset M0.
 *   node scripts/health-check.mjs
 *   node scripts/health-check.mjs --dry
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dry = process.argv.includes('--dry');
const presetPath = join(root, 'profiles/default/preset.json');

function fail(msg) {
  console.error(`[health] FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[health] OK: ${msg}`);
}

if (!existsSync(presetPath)) fail(`missing ${presetPath}`);
const preset = JSON.parse(readFileSync(presetPath, 'utf8'));
const expectedHost = preset.host?.version ?? '0.2.1-rc.5';
const requiredPkgs = (preset.plugins ?? []).map((p) => p.package);

ok(`preset loaded (${requiredPkgs.length} plugins, host ${preset.host?.package}@${expectedHost})`);

for (const rel of [
  'profiles/default/COMPATIBILITY.md',
  'docs/theme-placeholder.md',
  'docs/images/fleet-placeholder.svg',
]) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`);
}
ok('scaffold files present');

const wraps = (preset.plugins ?? []).filter((p) => p.role === 'resolve-wrap');
if (wraps.length !== 1) fail(`resolve-wrap count must be 1, got ${wraps.length}`);
ok('exactly one resolve-wrap in preset');

if (dry) {
  ok('dry-run complete (skipped live dsh)');
  process.exit(0);
}

const which = spawnSync('sh', ['-c', 'command -v dsh'], { encoding: 'utf8' });
if (which.status !== 0 || !which.stdout.trim()) {
  fail('`dsh` not found on PATH. Install @deepseek-ai/dsh@0.2.1-rc.5 or re-run with --dry');
}

const ver = spawnSync('dsh', ['--version'], { encoding: 'utf8' });
const version = (ver.stdout || ver.stderr || '').trim();
if (ver.status !== 0) fail(`dsh --version failed: ${version}`);
ok(`dsh version: ${version}`);
if (!version.includes(expectedHost)) {
  console.warn(`[health] WARN: expected host tip ${expectedHost}, got ${version}`);
}

const env = { ...process.env };
if (!env.DSH_HOME) {
  console.warn('[health] WARN: DSH_HOME unset; dump-config uses default home');
}

const dump = spawnSync('dsh', ['web', '--dump-config'], {
  encoding: 'utf8',
  env,
  maxBuffer: 8 * 1024 * 1024,
});
if (dump.status !== 0) {
  fail(`dsh web --dump-config failed:\n${dump.stderr || dump.stdout}`);
}
const tree = dump.stdout || '';
ok('dump-config succeeded');

const missing = [];
for (const pkg of requiredPkgs) {
  if (!tree.includes(pkg) && !tree.includes(pkg.replace(/^@[^/]+\//, ''))) {
    missing.push(pkg);
  }
}
if (missing.length) {
  console.warn(
    `[health] WARN: required plugins not seen in dump-config (install with npm run install:preset): ${missing.join(', ')}`,
  );
} else {
  ok('required plugin names appear in dump-config');
}

if (tree.includes('@omdp/dsh-key-fallback') && tree.includes('@goodandready/dsh-key-rotation')) {
  console.warn('[health] WARN: dual resolve-wrap detected. Prefer exactly one.');
}
if (tree.includes('dsh-subagent-progress') || tree.includes('dsh-bridges')) {
  console.warn('[health] WARN: blocked plugin appears in dump-config');
}

ok('health-check finished');
process.exit(0);

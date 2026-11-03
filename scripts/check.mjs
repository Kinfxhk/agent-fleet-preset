#!/usr/bin/env node
/**
 * Local M0 gate: files, preset policy, health --dry, no secrets.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function fail(m) {
  console.error(`[check] FAIL: ${m}`);
  process.exit(1);
}
function ok(m) {
  console.log(`[check] OK: ${m}`);
}

const required = [
  'LICENSE',
  'NOTICE',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'THIRD_PARTY_NOTICES.md',
  '.env.example',
  'package.json',
  'profiles/default/preset.json',
  'profiles/default/COMPATIBILITY.md',
  'docs/theme-placeholder.md',
  'docs/images/fleet-placeholder.svg',
  'scripts/health-check.mjs',
  'scripts/install-preset.mjs',
  'scripts/check.mjs',
];
for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`);
}
ok('required files');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'agent-fleet-preset') fail(`package.json name is ${pkg.name}`);
if (pkg.license !== 'MIT') fail('license must be MIT');
if (!pkg.engines?.node?.includes('22')) fail('engines.node must require >=22');
ok('package.json');

const preset = JSON.parse(readFileSync(join(root, 'profiles/default/preset.json'), 'utf8'));
if (preset.host?.version !== '0.2.1-rc.5') fail('host pin must be 0.2.1-rc.5');

const wraps = (preset.plugins ?? []).filter((p) => p.role === 'resolve-wrap');
if (wraps.length !== 1 || wraps[0].package !== '@omdp/dsh-key-fallback') {
  fail('resolve-wrap must be exactly @omdp/dsh-key-fallback');
}
const names = (preset.plugins ?? []).map((p) => p.package);
for (const need of ['dsh-soul-md', '@omdp/dsh-key-fallback', 'dsh-llm-fallbacks', '@nanmicoder/dsh-agent-teams']) {
  if (!names.includes(need)) fail(`preset missing ${need}`);
}
if (names.includes('@goodandready/dsh-key-rotation')) fail('key-rotation must not be in default plugins');
if (names.includes('dsh-subagent-progress') || names.includes('dsh-bridges')) fail('blocked plugin in preset');
if (preset.policies?.banDualResolveWrap !== true) fail('banDualResolveWrap required');
if (preset.policies?.banAllowVersionInProduct !== true) fail('banAllowVersionInProduct required');

const refNames = (preset.references?.kinfxRepos ?? []).map((r) => r.name);
for (const need of ['agent-home-recipes', 'agent-quota-router', 'agent-soul-pack', 'agent-progress-dock']) {
  if (!refNames.includes(need)) fail(`references.kinfxRepos missing ${need}`);
}
ok('preset policy');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const needle of [
  'M0',
  '白標',
  '0.2.1-rc.5',
  'MIT',
  '無隸屬',
  'Not affiliated',
  'allow-version',
  'agent-home-recipes',
  'dsh-soul-md',
  '@omdp/dsh-key-fallback',
]) {
  if (!readme.includes(needle)) fail(`README missing needle: ${needle}`);
}
// naming bans: product title / marketing as vendor brands
if (/\b(?:Grok Bot UI|pixel[- ]?perfect Grok)\b/i.test(readme)) {
  fail('README must not market Grok UI clone');
}
ok('README needles');

const suspicious =
  /(?:sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/i;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(md|json|ya?ml|mjs|js|svg|example|toml|txt)$/i.test(name) || name === 'LICENSE' || name === 'NOTICE')
      out.push(p);
  }
  return out;
}
for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  if (suspicious.test(text)) fail(`suspicious secret-like material in ${file}`);
  if (/allow-version/i.test(text) && file.endsWith('preset.json') && !text.includes('banAllowVersion')) {
    // preset.json should ban, not recommend
  }
}
// product must not recommend allow-version as install step
const installSrc = readFileSync(join(root, 'scripts/install-preset.mjs'), 'utf8');
if (/--allow-version|allowVersion\s*[:=]\s*true/i.test(installSrc)) {
  fail('install-preset must not invoke allow-version');
}
ok('no obvious secrets / no allow-version install');

const health = spawnSync(process.execPath, [join(root, 'scripts/health-check.mjs'), '--dry'], {
  encoding: 'utf8',
});
if (health.status !== 0) {
  console.error(health.stdout);
  console.error(health.stderr);
  fail('health --dry failed');
}
ok('health --dry');

const dryInstall = spawnSync(process.execPath, [join(root, 'scripts/install-preset.mjs'), '--dry'], {
  encoding: 'utf8',
});
if (dryInstall.status !== 0) {
  console.error(dryInstall.stdout);
  console.error(dryInstall.stderr);
  fail('install-preset --dry failed');
}
ok('install-preset --dry');

console.log('[check] all green');

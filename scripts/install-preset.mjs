#!/usr/bin/env node
/**
 * Print / optionally run reversible plugin install for the fleet default preset.
 * Never writes secrets. Requires DSH_HOME for real installs.
 *
 *   node scripts/install-preset.mjs
 *   node scripts/install-preset.mjs --dry
 *   node scripts/install-preset.mjs --apply
 *   node scripts/install-preset.mjs --uninstall --apply
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const apply = process.argv.includes('--apply');
const uninstall = process.argv.includes('--uninstall');
const dry = process.argv.includes('--dry') || !apply;
const preset = JSON.parse(readFileSync(join(root, 'profiles/default/preset.json'), 'utf8'));
const profile = preset.profile || 'web';
const pkgs = (preset.plugins ?? []).map((p) => p.package);
const host = `${preset.host.package}@${preset.host.version}`;

console.log(`# agent-fleet-preset · ${uninstall ? 'uninstall' : 'install'} (${profile})`);
console.log(`# Host tip: ${host}`);
console.log(`# Resolve-wrap policy: exactly-one → default ${preset.resolveWrap.default}`);
console.log('# Ban: dual resolve-wrap; ban productizing allow-version.');
console.log('# Credentials: set in $DSH_HOME/.credentials.yaml — never in this repo.');
console.log('');
console.log('# 0) Dedicated home (reversible: delete the directory)');
console.log('export DSH_HOME="${DSH_HOME:-$HOME/.agent-fleet-preset-dsh}"');
console.log('mkdir -p "$DSH_HOME"');
console.log('');
console.log('# 1) Ensure host');
console.log(`npm i -g ${host}`);
console.log('');
console.log('# Optional: copy soul templates from sibling agent-soul-pack');
console.log('#   (cd ../agent-soul-pack && npm run install:templates -- --apply)');
console.log('');

const action = uninstall ? 'remove' : 'add';
for (const pkg of pkgs) {
  console.log(`dsh plugin --profile ${profile} ${action} ${pkg}`);
}

console.log('');
console.log('# 2) Verify');
console.log('dsh web --dump-config | head');
console.log('npm run healthcheck');
console.log('');
console.log('# Reverse: npm run uninstall:preset -- --apply');
console.log('# or: rm -rf "$DSH_HOME"');
console.log('');
console.log('# Optional alternative resolve-wrap (NOT with key-fallback):');
for (const alt of preset.resolveWrap?.optionalAlternatives ?? []) {
  console.log(`#   dsh plugin --profile ${profile} remove ${preset.resolveWrap.default}`);
  console.log(`#   dsh plugin --profile ${profile} add ${alt.package}`);
  console.log(`#   # ${alt.note}`);
}
console.log('');
console.log('# Do NOT install: ' + (preset.doNotInstall ?? []).map((d) => d.package).join(', '));
console.log('# progress: optional/interim via agent-progress-dock / teams — not in default plugins.');

if (dry && !apply) {
  console.log('\n# Dry print only. Re-run with --apply to execute plugin ' + action + '.');
  process.exit(0);
}

if (!process.env.DSH_HOME) {
  console.error('[install] Refusing --apply without DSH_HOME (set a dedicated directory).');
  process.exit(1);
}

const which = spawnSync('sh', ['-c', 'command -v dsh'], { encoding: 'utf8' });
if (which.status !== 0) {
  console.error('[install] dsh not on PATH. Install host first, then retry --apply.');
  process.exit(1);
}

for (const pkg of pkgs) {
  console.log(`[install] ${action} ${pkg} …`);
  const r = spawnSync('dsh', ['plugin', '--profile', profile, action, pkg], {
    encoding: 'utf8',
    env: process.env,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error(`[install] failed on ${pkg}`);
    process.exit(r.status ?? 1);
  }
}
console.log(`[install] done (${action}). Run: npm run healthcheck`);

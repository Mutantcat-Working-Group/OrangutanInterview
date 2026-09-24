#!/usr/bin/env node
// Sync the release version from a git tag (for example v1.0.20260920) into every
// version field: package.json, package-lock.json, src-tauri/Cargo.toml,
// src-tauri/tauri.conf.json and the local package entry in Cargo.lock.
// Non-version refs (branch names on workflow_dispatch) keep the current version.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const write = (rel, data) => writeFileSync(path.join(root, rel), data);

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;
const requested = (process.argv[2] ?? '').trim().replace(/^v/, '');

const pkgPath = 'package.json';
const pkg = JSON.parse(read(pkgPath));

if (!SEMVER.test(requested)) {
  console.log(`[sync-version] "${process.argv[2] ?? ''}" is not a version tag; keeping ${pkg.version}`);
  process.exit(0);
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cargoToml = read('src-tauri/Cargo.toml');
const packageSection = /\[package\]([\s\S]*?)(?:\n\[|$)/.exec(cargoToml);
const cargoName = packageSection
  ? /^\s*name\s*=\s*"([^"]+)"/m.exec(packageSection[1])?.[1]
  : null;

const updated = [];

pkg.version = requested;
write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
updated.push(pkgPath);

const lockPath = 'package-lock.json';
const lock = JSON.parse(read(lockPath));
lock.version = requested;
if (lock.packages?.['']) lock.packages[''].version = requested;
write(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
updated.push(lockPath);

const confPath = 'src-tauri/tauri.conf.json';
const conf = JSON.parse(read(confPath));
conf.version = requested;
write(confPath, `${JSON.stringify(conf, null, 2)}\n`);
updated.push(confPath);

if (packageSection && cargoName) {
  const patchedToml = cargoToml.replace(
    /\[package\]([\s\S]*?)(\n\[|$)/,
    (match, body, tail) =>
      `[package]${body.replace(/^(\s*version\s*=\s*)"[^"]*"/m, `$1"${requested}"`)}${tail ?? ''}`,
  );
  write('src-tauri/Cargo.toml', patchedToml);
  updated.push('src-tauri/Cargo.toml');

  const lockToml = read('src-tauri/Cargo.lock');
  const namePattern = new RegExp(`^name = "${escapeRegExp(cargoName)}"$`, 'm');
  const patched = lockToml
    .split(/(?=^\[\[package\]\]$)/m)
    .map((block) =>
      namePattern.test(block)
        ? block.replace(/^version = "[^"]*"$/m, `version = "${requested}"`)
        : block,
    )
    .join('');
  write('src-tauri/Cargo.lock', patched);
  updated.push('src-tauri/Cargo.lock');
}

console.log(`[sync-version] ${requested} -> ${updated.join(', ')}`);

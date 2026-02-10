#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    tag: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (arg === '--tag') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --tag');
      }
      args.tag = next;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    cwd: options.cwd ?? process.cwd(),
  });

  return result;
}

function readWorkspacePackages(rootDir) {
  const packagesDir = path.join(rootDir, 'packages');
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

  const packages = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.private === true) continue;

    packages.set(packageJson.name, {
      name: packageJson.name,
      version: packageJson.version,
      dir,
      dependencies: packageJson.dependencies ?? {},
      optionalDependencies: packageJson.optionalDependencies ?? {},
    });
  }

  return packages;
}

function topologicalSort(packages) {
  const visited = new Set();
  const visiting = new Set();
  const ordered = [];

  function visit(packageName) {
    if (visited.has(packageName)) return;
    if (visiting.has(packageName)) {
      throw new Error(`Dependency cycle detected at ${packageName}`);
    }

    const pkg = packages.get(packageName);
    if (!pkg) return;

    visiting.add(packageName);

    const internalDeps = new Set([
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.optionalDependencies),
    ]);

    for (const depName of internalDeps) {
      if (!packages.has(depName)) continue;
      visit(depName);
    }

    visiting.delete(packageName);
    visited.add(packageName);
    ordered.push(pkg);
  }

  for (const packageName of packages.keys()) {
    visit(packageName);
  }

  return ordered;
}

function isVersionPublished(pkg) {
  const spec = `${pkg.name}@${pkg.version}`;
  const result = run('npm', ['view', spec, 'version', '--json'], {
    capture: true,
  });

  if (result.status === 0) {
    return true;
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (output.includes('E404')) {
    return false;
  }

  throw new Error(`Failed to query npm for ${spec}:\n${output.trim()}`);
}

function publishPackage(pkg, { dryRun, tag }) {
  const effectiveTag = tag ?? inferTagFromVersion(pkg.version);
  const args = ['--filter', pkg.name, 'publish', '--access', 'public', '--no-git-checks'];
  if (effectiveTag) {
    args.push('--tag', effectiveTag);
  }
  if (dryRun) {
    args.push('--dry-run');
  }

  const result = run('pnpm', args);
  if (result.status !== 0) {
    throw new Error(`Publish failed for ${pkg.name}@${pkg.version}`);
  }
}

function inferTagFromVersion(version) {
  const prereleasePart = version.split('-')[1];
  if (!prereleasePart) return undefined;
  const firstIdentifier = prereleasePart.split('.')[0];
  if (!firstIdentifier) return undefined;
  return firstIdentifier;
}

function main() {
  const rootDir = process.cwd();
  const { dryRun, tag } = parseArgs(process.argv.slice(2));

  const packages = readWorkspacePackages(rootDir);
  const ordered = topologicalSort(packages);

  if (ordered.length === 0) {
    console.log('No publishable packages found under packages/*');
    return;
  }

  console.log('Publish order:');
  for (const pkg of ordered) {
    console.log(`- ${pkg.name}@${pkg.version}`);
  }

  let publishedCount = 0;
  let skippedCount = 0;

  for (const pkg of ordered) {
    const exists = isVersionPublished(pkg);
    if (exists) {
      console.log(`skip ${pkg.name}@${pkg.version} (already published)`);
      skippedCount += 1;
      continue;
    }

    const inferredTag = tag ?? inferTagFromVersion(pkg.version);
    const tagMessage = inferredTag ? ` [tag=${inferredTag}]` : '';
    console.log(`publish ${pkg.name}@${pkg.version}${tagMessage}${dryRun ? ' (dry-run)' : ''}`);
    publishPackage(pkg, { dryRun, tag });
    publishedCount += 1;
  }

  console.log(
    `Done. Published: ${publishedCount}, skipped: ${skippedCount}, total: ${ordered.length}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

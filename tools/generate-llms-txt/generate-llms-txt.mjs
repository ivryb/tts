#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function getAllFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const cwd = process.cwd();
  const root = cwd.endsWith('tools/generate-llms-txt')
    ? join(cwd, '../..')
    : cwd;
  const contentDir = join(root, 'content');
  const files = await getAllFiles(contentDir);

  files.sort((a, b) => a.localeCompare(b));

  let output = '# TTS SDK Documentation Corpus\n\n';

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    output += `\n\n---\n\n## ${relative(root, file)}\n\n${content}\n`;
  }

  await writeFile(join(root, 'llms.txt'), output, 'utf8');
  console.log(`Generated llms.txt with ${files.length} documents.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

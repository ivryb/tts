import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRealTestEnv(): void {
  const repoRoot = resolve(process.cwd(), '../..');
  const envPaths = [resolve(repoRoot, '.env.local'), resolve(repoRoot, '.env')];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
}

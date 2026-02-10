import { defineConfig } from 'vitest/config';
import { loadRealTestEnv } from '../../tools/vitest/load-real-test-env';

loadRealTestEnv();

export default defineConfig({
  test: {
    include: ['src/**/*.real.test.ts'],
    testTimeout: 180000,
    hookTimeout: 180000,
  },
});

import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

/**
 * Is this a coverage run (`npm run test:cov`, or any `--coverage` flag)? v8 instrumentation makes
 * a few timing-sensitive tests 10 to 20x slower, so those tests read NAIJA_COVERAGE and skip only
 * their wall-clock bound (their deterministic checks always run).
 */
const coverageRun =
  process.argv.some((a) => a.startsWith('--coverage')) || process.env.NAIJA_COVERAGE === '1';

export default defineConfig({
  define: { __NAIJA_TEST__: 'true' },
  test: {
    environment: 'jsdom',
    env: { NAIJA_COVERAGE: coverageRun ? '1' : '0' },
    // The simulation, planner and audio-render tests run thousands of full games or synth renders.
    // The 5 s default is right for unit tests but fails them on a loaded laptop or under v8
    // coverage (10 to 20x slower). Slow tests also carry their own explicit timeout; this is the
    // safety floor for the rest. Worker count stays modest so the heavy files do not starve each
    // other (starved workers also time out the vitest RPC channel).
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: Math.max(2, Math.min(4, Math.floor(availableParallelism() / 3))),
    include: ['packages/*/src/**/*.test.ts', 'games/*/src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      include: ['packages/core/src/**/*.ts', 'games/*/src/rules/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        // barrels that only re-export (module code lives in index.ts files elsewhere)
        'packages/core/src/index.ts',
        'packages/core/src/audio/index.ts',
        'packages/core/src/ui-kit/index.ts',
        'games/*/src/rules/index.ts',
        'packages/core/src/env.d.ts',
        '**/types.ts',
        'packages/core/src/audio/instruments.ts',
        'packages/core/src/audio/core-sfx.ts',
      ],
      // Rules engines must keep >= 90% line coverage (Definition of Done).
      thresholds: {
        'games/*/src/rules/**': { lines: 90, statements: 90, functions: 90 },
        'packages/core/src/**': { lines: 90, functions: 90 },
      },
    },
  },
});

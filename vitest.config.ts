import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __NAIJA_TEST__: 'true' },
  test: {
    environment: 'jsdom',
    include: ['packages/*/src/**/*.test.ts', 'games/*/src/**/*.test.ts'],
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

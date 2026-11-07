import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-e2e/**',
      'coverage/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'packages/core/assets/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/**/*.ts', 'games/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Never touch storage directly: use @naija/core/storage (namespaced, MSISDN-safe).
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use @naija/core/storage.' },
        { name: 'sessionStorage', message: 'Use @naija/core/storage.' },
      ],
    },
  },
  {
    files: ['packages/core/src/storage/**', 'packages/core/src/**/*.test.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'tools/**/*.mjs', '*.config.{js,ts}', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['packages/core/src/sw/sw-template.js'],
    languageOptions: { globals: { ...globals.serviceworker, __FILES__: 'readonly' } },
  },
  prettier,
);

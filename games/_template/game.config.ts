/** Static metadata for the game. Read by main.ts and by the portal catalogue tooling. */
export const gameConfig = {
  slug: '_template',
  title: 'Tap the Agogo',
  version: '0.1.0',
  /** design tokens theme class from packages/core/src/styles/tokens.css */
  theme: 'theme-naija-green',
  orientation: 'any',
  defaultDifficulty: 'medium',
} as const;

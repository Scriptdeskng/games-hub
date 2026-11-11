// Usage: node scripts/content-release-check.mjs [--root <dir>]      (npm run content:release-check)
// RELEASE GATE: runs every content check AND fails if any learning or quiz item under
// games/akoni-dike/content has reviewed:false. Not part of `npm run check` (content is still being
// reviewed during development). `npm run build` runs it automatically when NAIJA_RELEASE=1.
import { main } from './content-run.mjs';

process.exit(await main({ argv: process.argv.slice(2), env: process.env, forceRelease: true }));

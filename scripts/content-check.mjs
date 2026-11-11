// Usage: node scripts/content-check.mjs [--release] [--root <dir>]
// Structure, guardrails and cross-references of games/akoni-dike/content (part of `npm run check`).
// A missing content folder is a no-op. DEV/PREVIEW mode (default) tolerates reviewed:false and only
// reports it; NAIJA_RELEASE=1 (or --release) makes reviewed:false fail, exactly like
// `npm run content:release-check`. NAIJA_RELEASE must be 1/true/yes or 0/false/no: other values fail.
import { main } from './content-run.mjs';

process.exit(await main({ argv: process.argv.slice(2), env: process.env }));

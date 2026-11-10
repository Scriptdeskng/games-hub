import { flowTests } from './draughts-naija.flow';
import { inputTests } from './draughts-naija.input';
import { layoutTests } from './draughts-naija.layout';
import { systemTests } from './draughts-naija.system';

// One spec per game (scripts/e2e.mjs runs tests/e2e/<slug>.spec.ts); the tests live in modules by area.
flowTests();
inputTests();
systemTests();
layoutTests();

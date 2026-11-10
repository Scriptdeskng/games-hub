import { flowTests } from './penalty-king.flow';
import { inputTests } from './penalty-king.input';
import { layoutTests } from './penalty-king.layout';
import { systemTests } from './penalty-king.system';

// One spec per game (scripts/e2e.mjs runs tests/e2e/<slug>.spec.ts); the tests live in modules by area.
flowTests();
inputTests();
systemTests();
layoutTests();

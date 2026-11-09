import { flowTests } from './sabi-words.flow';
import { inputTests } from './sabi-words.input';
import { layoutTests } from './sabi-words.layout';
import { systemTests } from './sabi-words.system';
import { packTests } from './sabi-words.packs';

// One spec per game (scripts/e2e.mjs runs tests/e2e/<slug>.spec.ts); the tests live in modules
// by area so each file stays small.
flowTests();
inputTests();
packTests();
layoutTests();
systemTests();

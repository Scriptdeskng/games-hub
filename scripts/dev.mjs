// Usage: npm run dev <slug>
import { createServer } from 'vite';
import path from 'node:path';
import { listGames, ROOT } from './lib.mjs';

const slug = process.argv[2];
if (!slug || !listGames().includes(slug)) {
  console.error(`Usage: npm run dev <slug>\nAvailable: ${listGames().join(', ')}`);
  process.exit(1);
}
process.env.NAIJA_GAME = slug;
const server = await createServer({
  configFile: path.join(ROOT, 'vite.config.ts'),
  mode: 'development',
});
await server.listen();
server.printUrls();

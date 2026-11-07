// Dev static servers for the mock portal. Two origins, like production:
//   portal origin  http://localhost:4180   serves tools/ (mock-portal.html) + fake progress API
//   game origin    http://localhost:4181   serves dist/<slug>/ (or --dist dist-e2e)
// Usage: npm run mock-portal [-- --dist dist-e2e]   then open
//   http://localhost:4180/?game=_template&token=tok_demo&lang=pcm
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const distName = args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist';
const DIST = path.join(ROOT, distName);
const TOOLS = path.join(ROOT, 'tools');
const PORTAL_PORT = 4180;
const GAME_PORT = 4181;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

function serveFile(res, root, urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  let file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, CORS).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    ...CORS,
  });
  fs.createReadStream(file).pipe(res);
}

// In-memory progress store keyed by opaque token. Never persisted, never logged.
const progress = new Map();

const portal = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTAL_PORT}`);
  if (req.method === 'OPTIONS') return void res.writeHead(204, CORS).end();
  const m = url.pathname.match(/^\/api\/games\/([\w-]+)\/progress$/);
  if (m) {
    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return void res.writeHead(401, CORS).end('no token');
    const key = `${token}|${m[1]}`;
    if (req.method === 'GET') {
      if (!progress.has(key)) return void res.writeHead(404, CORS).end('none');
      return void res
        .writeHead(200, { ...CORS, 'Content-Type': MIME['.json'] })
        .end(JSON.stringify({ data: progress.get(key) }));
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          progress.set(key, JSON.parse(body).data);
          res.writeHead(204, CORS).end();
        } catch {
          res.writeHead(400, CORS).end('bad json');
        }
      });
      return;
    }
  }
  if (url.pathname === '/') return serveFile(res, TOOLS, 'mock-portal.html');
  serveFile(res, TOOLS, url.pathname);
});

const games = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${GAME_PORT}`);
  if (url.pathname === '/__games') {
    const list = fs.existsSync(DIST)
      ? fs.readdirSync(DIST).filter((d) => fs.existsSync(path.join(DIST, d, 'index.html')))
      : [];
    return void res
      .writeHead(200, { ...CORS, 'Content-Type': MIME['.json'] })
      .end(JSON.stringify(list));
  }
  if (url.pathname === '/')
    return void res.writeHead(200, { 'Content-Type': 'text/plain' }).end('naija games dev server');
  serveFile(res, DIST, url.pathname);
});

portal.listen(PORTAL_PORT);
games.listen(GAME_PORT);
process.stdout.write(
  `mock portal  http://localhost:${PORTAL_PORT}/?game=_template\ngame server  http://localhost:${GAME_PORT}/ (${distName}/)\n`,
);

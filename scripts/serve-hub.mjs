// Usage: node scripts/serve-hub.mjs [--dir dist-hub] [--port 4190]
// Local preview of the deploy folder that behaves like Netlify / Cloudflare Pages: applies the rules
// from dist-hub/_headers, redirects /slug to /slug/, serves /404.html for unknown paths, and has
// NO SPA catch-all. For local checks only (the real hosts serve the same folder).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const DIR = path.resolve(ROOT, opt('--dir', 'dist-hub'));
const PORT = Number(opt('--port', '4190'));
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

/** Parse a Netlify-style _headers file into [{ re, headers }] (supports a trailing `*` splat). */
export function parseHeaders(textBody) {
  const rules = [];
  let cur = null;
  for (const line of textBody.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      const esc = line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      cur = { re: new RegExp(`^${esc.replace(/\*/g, '.*')}$`), headers: {} };
      rules.push(cur);
    } else if (cur) {
      const i = line.indexOf(':');
      cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

export function headersFor(rules, pathname) {
  const out = {};
  for (const r of rules) {
    if (!r.re.test(pathname)) continue;
    for (const [k, v] of Object.entries(r.headers)) out[k] = k in out ? `${out[k]}, ${v}` : v;
  }
  return out;
}

const rules = parseHeaders(fs.readFileSync(path.join(DIR, '_headers'), 'utf8'));
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const pathname = decodeURIComponent(url.pathname);
  let file = path.resolve(DIR, '.' + pathname);
  if (file !== DIR && !file.startsWith(DIR + path.sep)) return void res.writeHead(403).end();
  const isDir = fs.existsSync(file) && fs.statSync(file).isDirectory();
  if (isDir && !pathname.endsWith('/')) {
    res.writeHead(301, { Location: pathname + '/' + url.search }).end();
    return;
  }
  if (isDir) file = path.join(file, 'index.html');
  const found = fs.existsSync(file) && !path.basename(file).startsWith('_headers');
  const target = found ? file : path.join(DIR, '404.html');
  res.writeHead(found ? 200 : 404, {
    'Content-Type': MIME[path.extname(target)] ?? 'application/octet-stream',
    ...headersFor(rules, pathname),
  });
  if (req.method === 'HEAD') return void res.end();
  fs.createReadStream(target).pipe(res);
});
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  server.listen(PORT, () =>
    console.log(`serving ${path.relative(ROOT, DIR)}/ at http://localhost:${PORT}/`),
  );
}

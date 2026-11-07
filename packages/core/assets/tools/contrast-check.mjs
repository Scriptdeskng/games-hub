// Usage: node packages/core/assets/tools/contrast-check.mjs [--md]
// WCAG 2.1 contrast for every named palette. Exit 1 if any text pair < 4.5 or ring < 3.
import { readFileSync } from 'node:fs';
const P = JSON.parse(readFileSync(new URL('./palettes.json', import.meta.url)));
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pairs = [
  ['ink', 'bg', 4.5, 'body text on background'],
  ['ink', 'bg2', 4.5, 'body text on gradient end'],
  ['ink2', 'bg', 4.5, 'secondary text on background'],
  ['ink2', 'bg2', 4.5, 'secondary text on gradient end'],
  ['inkS', 'surface', 4.5, 'text on card/modal'],
  ['inkS', 'surface2', 4.5, 'text on inset surface'],
  ['inkS2', 'surface', 4.5, 'secondary text on card'],
  ['inkS2', 'surface2', 4.5, 'secondary text on inset'],
  ['onPrimary', 'primary', 4.5, 'primary button label'],
  ['onAccent', 'accent', 4.5, 'accent button/badge label'],
  ['good', 'surface', 4.5, 'success text on card'],
  ['bad', 'surface', 4.5, 'error text on card'],
  ['primary', 'bg', 3, 'primary button edge vs bg (non-text)'],
  ['focus', 'bg', 3, 'focus ring vs bg (non-text)'],
  ['bg', 'surface', 3, 'focus ring inner band (bg colour) vs card (non-text)'],
];
let fail = 0; const md = process.argv.includes('--md');
for (const [k, t] of Object.entries(P)) {
  if (md) console.log(`\n**${t.label}**\n\n| Pair | Ratio | Need | Result |\n|---|---|---|---|`); else console.log(`\n${t.label}`);
  for (const [f, b, min, note] of pairs) {
    const r = ratio(t[f], t[b]); const ok = r >= min; if (!ok) fail++;
    const line = md ? `| ${f} ${t[f]} on ${b} ${t[b]} (${note}) | ${r.toFixed(2)} | ${min} | ${ok ? 'pass' : 'FAIL'} |` : `${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} >= ${min}  ${f} on ${b}  ${note}`;
    console.log(line);
  }
}
console.log(fail ? `\n${fail} FAILURES` : '\nALL PAIRS PASS'); process.exit(fail ? 1 : 0);

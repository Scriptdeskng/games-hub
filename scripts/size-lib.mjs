// Size rules (pure, unit-tested; used by scripts/size-budget.mjs).
//
//   EVERY game:        total gzip <= 3 MB, core chunks <= 60 KB. A folder called `packs/` is just files.
//   `akoni-dike` only: INITIAL (everything outside its declared chapter packs) <= 3 MB, PLUS each declared
//                      pack <= 1 MB, so the whole game may exceed 3 MB.
//
// A pack is declared in games/akoni-dike/packs.json:
//   { "version": 1, "packs": [ { "id": "ch02", "dir": "packs/ch02", "budgetKb": 900 } ] }
// `dir` must be exactly `packs/<id>` and `id` must look like `chNN`. `budgetKb` can only LOWER the
// 1 MB cap. The limits live in this file, not in the manifest, so editing the manifest can never
// relax a budget. Files under `packs/` that no manifest entry declares count as INITIAL bytes.
import fs from 'node:fs';
import path from 'node:path';

export const MB = 1024 * 1024;
export const GAME_LIMIT = 3 * MB;
export const GAME_TARGET = 1.5 * MB;
export const PACK_LIMIT = 1 * MB;
export const CORE_LIMIT = 60 * 1024;
/** The ONLY games allowed to declare chapter packs. Approved exception: docs/GAMES.md section 11. */
export const PACK_GAMES = ['akoni-dike'];
const PACK_ID_RE = /^ch\d{2}$/;

/** @returns {{ ok: boolean, manifest?: object|null, missing?: boolean, error?: string }} */
export function readPackManifest(root, slug) {
  const file = path.join(root, 'games', slug, 'packs.json');
  if (!fs.existsSync(file)) return { ok: true, manifest: null, missing: true };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { ok: false, error: `packs.json is not valid JSON (${e.message})` };
  }
  const bad = (msg) => ({ ok: false, error: `packs.json: ${msg}` });
  if (!data || typeof data !== 'object' || data.version !== 1) return bad('version must be 1');
  if (!Array.isArray(data.packs)) return bad('packs must be an array');
  const seen = new Set();
  for (const [i, p] of data.packs.entries()) {
    const at = `packs[${i}]`;
    if (!p || typeof p !== 'object') return bad(`${at} must be an object`);
    if (Object.keys(p).some((k) => !['id', 'dir', 'budgetKb'].includes(k)))
      return bad(`${at} has an unknown field`);
    if (typeof p.id !== 'string' || !PACK_ID_RE.test(p.id))
      return bad(`${at}.id must look like ch02`);
    if (p.dir !== `packs/${p.id}`) return bad(`${at}.dir must be "packs/${p.id}"`);
    if (
      p.budgetKb !== undefined &&
      !(Number.isInteger(p.budgetKb) && p.budgetKb >= 1 && p.budgetKb <= PACK_LIMIT / 1024)
    ) {
      return bad(`${at}.budgetKb must be an integer 1-${PACK_LIMIT / 1024}`);
    }
    if (seen.has(p.id)) return bad(`${at}.id "${p.id}" is declared twice`);
    seen.add(p.id);
  }
  return { ok: true, manifest: data, missing: false };
}

/**
 * @param {{ slug: string, rows: Array<{ file: string, gzip: number }>, manifest: { ok: boolean, manifest?: object|null, missing?: boolean, error?: string } }} o
 *   rows: every file of dist/<slug>, `file` relative with forward slashes. `manifest`: result of
 *   readPackManifest (use `{ ok: true, manifest: null, missing: true }` when there is none).
 */
export function evaluateGame({ slug, rows, manifest }) {
  const sum = (arr) => arr.reduce((s, r) => s + r.gzip, 0);
  const problems = [];
  const warnings = [];
  const total = sum(rows);
  const core = rows.filter((r) => /(^|\/)core-[^/]*\.(js|css)$/.test(r.file));
  const coreGz = sum(core);
  if (coreGz > CORE_LIMIT) problems.push(`core ${(coreGz / 1024).toFixed(1)} KB > 60 KB`);
  if (!core.length) warnings.push('no core-*.js chunk found, core budget not measured');

  const allowsPacks = PACK_GAMES.includes(slug);
  if (!allowsPacks) {
    if (!manifest.missing)
      problems.push(`only ${PACK_GAMES.join(', ')} may declare chapter packs (packs.json found)`);
    if (total > GAME_LIMIT) problems.push(`game total ${(total / 1024).toFixed(1)} KB > 3 MB`);
    if (total > GAME_TARGET) warnings.push('above the 1.5 MB target');
    return { total, initial: total, packs: [], coreGz, problems, warnings, packGame: false };
  }

  let declared = [];
  if (!manifest.ok) problems.push(manifest.error);
  else if (manifest.missing) {
    warnings.push(
      'no games/akoni-dike/packs.json: every file counts as INITIAL (3 MB cap, no pack allowance)',
    );
  } else declared = manifest.manifest.packs;

  const packs = declared.map((p) => {
    const files = rows.filter((r) => r.file.startsWith(`${p.dir}/`));
    const limit = Math.min(PACK_LIMIT, (p.budgetKb ?? PACK_LIMIT / 1024) * 1024);
    const gzip = sum(files);
    if (!files.length) problems.push(`declared pack ${p.id} has no files under ${p.dir}/`);
    if (gzip > limit)
      problems.push(
        `pack ${p.id} ${(gzip / 1024).toFixed(1)} KB > ${(limit / 1024).toFixed(0)} KB`,
      );
    return { id: p.id, dir: p.dir, gzip, limit, files: files.length };
  });
  const inPack = (r) => declared.some((p) => r.file.startsWith(`${p.dir}/`));
  const initial = sum(rows.filter((r) => !inPack(r)));
  if (initial > GAME_LIMIT)
    problems.push(`initial download ${(initial / 1024).toFixed(1)} KB > 3 MB`);
  if (initial > GAME_TARGET) warnings.push('initial download above the 1.5 MB target');
  return { total, initial, packs, coreGz, problems, warnings, packGame: true };
}

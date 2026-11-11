/**
 * The two-way ship.json check (QA SL-15).
 *
 * `assets/ship.json`:
 *   { "include": [...], "dynamic": [...], "keep": [...] }
 *  - include: globs of files that ship (`*` stays inside a folder, `**` crosses folders);
 *  - dynamic: globs for files whose names the code builds at run time (`die-${n}.svg`). The text
 *    before the first `*` (e.g. `dice/die-`) must appear in the built code, so a stale pattern fails;
 *  - keep: globs shipped on purpose although nothing in the code names them (portal catalogue
 *    thumbnails, files another tool fetches). Every `keep` pattern must still match a shipped file.
 *
 * One way (existing): code names a literal `./assets/x` that is not shipped -> build fails.
 * The other way (this file): a shipped file that no built code mentions, and that is neither
 * `dynamic` nor `keep`, fails the build: dead weight on a metered connection.
 *
 * DESIGN NOTE (Phase A1, not implemented): chapter packs. `akoni-dike` packs live in `packs/chNN/`
 * outside `assets/`, so `checkShipped` does not see them. A sibling check, `checkPacks(declared,
 * shipped, manifests)`, will apply the same two-way rule per pack: every file in `packs/chNN/` must be
 * listed by that pack's `pack.<hash>.json`, and every listed file must exist with the recorded size
 * and sha-256. A pack file is "referenced" by its manifest, not by the code, and the manifest by a
 * literal path in the generated catalogue, which keeps the dead-weight guarantee without `dynamic`
 * globs. See docs/games/akoni-dike/ARCHITECTURE.md.
 */
export interface ShipConfig {
  include: string[];
  dynamic?: string[];
  keep?: string[];
}

export const globToRegExp = (g: string): RegExp => {
  const parts = g.split('**').map((part) =>
    part
      .split('*')
      .map((lit) => lit.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
      .join('[^/]*'),
  );
  return new RegExp(`^${parts.join('.*')}$`);
};

export interface ShipProblems {
  /** shipped but never referenced, not dynamic, not kept */
  unreferenced: string[];
  /** a `dynamic` or `keep` pattern that matches no shipped file */
  staleKeep: string[];
  /** a `dynamic` pattern whose literal prefix appears nowhere in the built code */
  staleDynamic: string[];
}

/**
 * @param shipped paths relative to `assets/` of every file that was copied to the output
 * @param code    the text of every built js / css / html file
 */
export function checkShipped(
  shipped: readonly string[],
  code: string,
  ship: ShipConfig,
): ShipProblems {
  const dynamic = (ship.dynamic ?? []).map((g) => ({ g, re: globToRegExp(g) }));
  const keep = (ship.keep ?? []).map((g) => ({ g, re: globToRegExp(g) }));
  const out: ShipProblems = { unreferenced: [], staleKeep: [], staleDynamic: [] };
  for (const f of shipped) {
    if (code.includes(f)) continue; // `./assets/board/board.svg` or `${ASSETS}/board/board.svg`
    if (dynamic.some((d) => d.re.test(f))) continue;
    if (keep.some((k) => k.re.test(f))) continue;
    out.unreferenced.push(f);
  }
  for (const { g, re } of keep) if (!shipped.some((f) => re.test(f))) out.staleKeep.push(g);
  for (const { g, re } of dynamic) {
    if (!shipped.some((f) => re.test(f))) out.staleKeep.push(g);
    else if (!code.includes(g.split('*')[0] as string)) out.staleDynamic.push(g);
  }
  return out;
}

export function describeProblems(p: ShipProblems): string[] {
  return [
    ...p.unreferenced.map((f) => `shipped but never referenced by the code: ${f}`),
    ...p.staleKeep.map((g) => `ship.json pattern matches no shipped file: ${g}`),
    ...p.staleDynamic.map((g) => `ship.json "dynamic" pattern not found in the built code: ${g}`),
  ];
}

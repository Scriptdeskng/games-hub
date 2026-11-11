/**
 * A tiny JSON Schema (2020-12 subset) checker used by tests to prove the shipped `*.schema.json`
 * files agree with the TypeScript validators. Supports: type, const, enum, pattern, minLength,
 * maxLength, minimum, maximum, minItems, maxItems, uniqueItems, contains, required, properties,
 * additionalProperties:false, items, $ref (local #/$defs/x), allOf, anyOf, not, if/then.
 */
type Schema = Record<string, unknown>;

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const isObj = (v: unknown): v is Record<string, unknown> => typeOf(v) === 'object';

export function validateSchema(schema: Schema, value: unknown, root: Schema = schema): string[] {
  const out: string[] = [];
  const run = (sc: Schema, v: unknown, at: string): void => {
    if (typeof sc.$ref === 'string') {
      const name = sc.$ref.replace('#/$defs/', '');
      const target = (root.$defs as Record<string, Schema> | undefined)?.[name];
      if (!target) return void out.push(`${at}: unresolved ${sc.$ref}`);
      return run(target, v, at);
    }
    if ('const' in sc && v !== sc.const) out.push(`${at}: must be ${String(sc.const)}`);
    if (Array.isArray(sc.enum) && !sc.enum.includes(v)) out.push(`${at}: not in enum`);
    if (typeof sc.type === 'string') {
      const t = typeOf(v);
      if (!(t === sc.type || (sc.type === 'number' && t === 'integer'))) {
        return void out.push(`${at}: must be ${sc.type}`);
      }
    }
    if (typeof v === 'string') {
      if (typeof sc.minLength === 'number' && v.trim().length < sc.minLength)
        out.push(`${at}: empty`);
      if (typeof sc.maxLength === 'number' && v.length > sc.maxLength) out.push(`${at}: too long`);
      if (typeof sc.pattern === 'string' && !new RegExp(sc.pattern, 'u').test(v))
        out.push(`${at}: pattern`);
    }
    if (typeof v === 'number') {
      if (typeof sc.minimum === 'number' && v < sc.minimum) out.push(`${at}: below minimum`);
      if (typeof sc.maximum === 'number' && v > sc.maximum) out.push(`${at}: above maximum`);
    }
    if (Array.isArray(v)) {
      if (typeof sc.minItems === 'number' && v.length < sc.minItems)
        out.push(`${at}: too few items`);
      if (typeof sc.maxItems === 'number' && v.length > sc.maxItems)
        out.push(`${at}: too many items`);
      if (sc.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size < v.length) {
        out.push(`${at}: items must be distinct`);
      }
      if (
        isObj(sc.contains) &&
        !v.some((x) => validateSchema(sc.contains as Schema, x, root).length === 0)
      ) {
        out.push(`${at}: contains nothing matching`);
      }
      if (isObj(sc.items)) v.forEach((x, i) => run(sc.items as Schema, x, `${at}[${i}]`));
    }
    if (isObj(v)) {
      for (const k of (sc.required as string[] | undefined) ?? [])
        if (!(k in v)) out.push(`${at}: missing ${k}`);
      const props = (sc.properties ?? {}) as Record<string, Schema>;
      for (const [k, val] of Object.entries(v)) {
        if (props[k]) run(props[k], val, `${at}.${k}`);
        else if (sc.additionalProperties === false) out.push(`${at}: unknown field ${k}`);
      }
    }
    for (const sub of (sc.allOf as Schema[] | undefined) ?? []) run(sub, v, at);
    if (
      Array.isArray(sc.anyOf) &&
      !sc.anyOf.some((s) => validateSchema(s as Schema, v, root).length === 0)
    ) {
      out.push(`${at}: matches none of anyOf`);
    }
    if (isObj(sc.not) && validateSchema(sc.not, v, root).length === 0)
      out.push(`${at}: matches "not"`);
    if (isObj(sc.if) && isObj(sc.then) && validateSchema(sc.if, v, root).length === 0) {
      run(sc.then, v, at);
    }
  };
  run(schema, value, '$');
  return out;
}

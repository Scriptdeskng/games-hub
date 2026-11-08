import { describe, expect, it } from 'vitest';
import { instruments, LONG_VOICES } from './instruments';
import { coreSfx, softSfx } from './core-sfx';
import { CORE_SFX_EVENTS, type CueStep, type InstrumentPreset, type VoiceLayer } from './types';

const SR = 22050;
const VOICE_CAP = 0.6; // engine MAX_VOICE_GAIN
const REQUIRED = [
  'talkingDrum',
  'agogo',
  'ogene',
  'shekere',
  'udu',
  'ekwe',
  'danfoHorn',
  'crowd',
  'fanfare',
];
const LONG_CUES = ['win', 'lose', 'unlock', 'crowd'];

/** Offline mini-renderer that mirrors engine.ts layer maths (no Web Audio in node). Returns the mixed buffer. */
function renderLayer(
  L: VoiceLayer,
  pitch: number,
  buf: Float32Array,
  t0: number,
  seed: { s: number },
): void {
  const start = t0 + (L.delay ?? 0);
  const atk = L.env.attack ?? 0.003;
  const end = start + atk + L.env.decay;
  const peak = Math.max(0.0001, L.gain ?? 1);
  const i0 = Math.floor(start * SR);
  const i1 = Math.min(buf.length, Math.ceil((end + 0.02) * SR));
  let ph = 0;
  let mph = 0;
  let lph = 0;
  // biquad state
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    a1 = 0,
    a2 = 0;
  if (L.kind === 'noise') {
    const w = (2 * Math.PI * Math.min(L.freq * pitch, SR / 2.2)) / SR;
    const q = L.q ?? 1;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const a0 = 1 + al;
    if (L.filter === 'bandpass') {
      b0 = al;
      b1 = 0;
      b2 = -al;
    } else if (L.filter === 'lowpass') {
      b0 = (1 - c) / 2;
      b1 = 1 - c;
      b2 = (1 - c) / 2;
    } else {
      b0 = (1 + c) / 2;
      b1 = -(1 + c);
      b2 = (1 + c) / 2;
    }
    a1 = (-2 * c) / a0;
    a2 = (1 - al) / a0;
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
  }
  for (let i = i0; i < i1; i++) {
    const t = i / SR - start;
    if (t < 0) continue;
    const env =
      t < atk
        ? 0.0001 + (peak - 0.0001) * (t / atk)
        : Math.max(0.0001, peak * Math.pow(0.0001 / peak, (t - atk) / L.env.decay));
    let s = 0;
    let g = env;
    if (L.kind === 'noise') {
      seed.s = (Math.imul(seed.s, 1664525) + 1013904223) >>> 0;
      const x0 = seed.s / 2147483648 - 1;
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      s = y0;
    } else if (L.kind === 'fm') {
      const f = L.freq * pitch;
      const dec = L.indexDecay ?? L.env.decay;
      const dev = Math.max(
        0.01,
        L.index * f * L.ratio * Math.pow(0.01 / (L.index * f * L.ratio), Math.min(1, t / dec)),
      );
      mph += (2 * Math.PI * f * L.ratio) / SR;
      ph += (2 * Math.PI * (f + dev * Math.sin(mph))) / SR;
      s = Math.sin(ph);
    } else {
      let f = L.freq * pitch;
      if (L.freqEnd)
        f *= Math.pow(
          (L.freqEnd * pitch) / (L.freq * pitch),
          Math.min(1, t / (L.glide ?? L.env.decay)),
        );
      if (L.lfo) {
        lph += (2 * Math.PI * L.lfo.rate) / SR;
        if (L.lfo.target === 'pitch') f += L.lfo.depth * pitch * Math.sin(lph);
        else g += L.lfo.depth * Math.sin(lph);
      }
      ph += (2 * Math.PI * f) / SR;
      s =
        L.wave === 'sine'
          ? Math.sin(ph)
          : L.wave === 'triangle'
            ? (2 / Math.PI) * Math.asin(Math.sin(ph))
            : L.wave === 'square'
              ? Math.sign(Math.sin(ph))
              : 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    }
    buf[i] += s * g;
  }
}

function renderCue(steps: CueStep[]): Float32Array {
  const buf = new Float32Array(Math.ceil(2 * SR));
  const seed = { s: 1 };
  for (const st of steps) {
    const p: InstrumentPreset = instruments[st.voice]!;
    const tmp = new Float32Array(buf.length);
    const t0 = st.when ?? 0;
    for (const L of p.layers) renderLayer(L, st.pitch ?? 1, tmp, t0, seed);
    const stopAt = Math.floor((t0 + p.duration + 0.02) * SR);
    const out = Math.min(VOICE_CAP, (st.gain ?? 1) * VOICE_CAP);
    for (let i = 0; i < Math.min(stopAt, buf.length); i++) buf[i] += tmp[i]! * out;
  }
  return buf;
}
const peak = (b: Float32Array): number => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const asSteps = (c: CueStep | CueStep[]): CueStep[] => (Array.isArray(c) ? c : [c]);
const span = (steps: CueStep[]): number =>
  Math.max(...steps.map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));

describe('Nigerian instrument family', () => {
  it('has every required voice', () => {
    for (const id of REQUIRED) expect(instruments[id], id).toBeDefined();
    for (const [k, p] of Object.entries(instruments)) expect(p.id).toBe(k);
  });

  it('keeps SFX voices <= 0.3 s and fanfare-class voices <= 1.5 s', () => {
    for (const [id, p] of Object.entries(instruments)) {
      const limit = LONG_VOICES.includes(id) ? 1.5 : 0.3;
      expect(p.duration, id).toBeLessThanOrEqual(limit);
      for (const L of p.layers) {
        expect(
          (L.delay ?? 0) + (L.env.attack ?? 0.003) + L.env.decay,
          `${id} layer ends`,
        ).toBeLessThanOrEqual(p.duration + 0.5);
      }
    }
  });

  it('covers every core event with known voices and respects cue spans', () => {
    for (const ev of CORE_SFX_EVENTS) {
      const steps = asSteps(coreSfx[ev]!);
      expect(steps.length, ev).toBeGreaterThan(0);
      for (const s of steps) expect(instruments[s.voice], `${ev}:${s.voice}`).toBeDefined();
      expect(span(steps), ev).toBeLessThanOrEqual(LONG_CUES.includes(ev) ? 1.5 : 0.3 + 1e-9);
    }
    for (const [ev, cue] of Object.entries(coreSfx)) {
      const steps = asSteps(cue);
      for (const s of steps) expect(instruments[s.voice], `${ev}:${s.voice}`).toBeDefined();
      expect(span(steps), ev).toBeLessThanOrEqual(
        LONG_CUES.includes(ev) || ev === 'build' ? 1.5 : 0.3 + 1e-9,
      );
    }
  });

  it('never clips: offline-rendered peak of every voice and every cue stays below 0.9 (full) and below 0.45 (soft)', () => {
    const rows: string[] = [];
    for (const [id] of Object.entries(instruments)) {
      const p = peak(renderCue([{ voice: id }]));
      rows.push(`voice ${id}: ${p.toFixed(2)}`);
      expect(p, id).toBeLessThan(0.9);
      expect(p, id).toBeGreaterThan(0.02); // audible
    }
    for (const [ev, cue] of Object.entries(coreSfx)) {
      const p = peak(renderCue(asSteps(cue)));
      rows.push(`cue ${ev}: ${p.toFixed(2)}`);
      expect(p, ev).toBeLessThan(0.9);
      const soft = peak(renderCue(asSteps(softSfx(coreSfx)[ev]!)));
      expect(soft, `soft ${ev}`).toBeLessThan(0.45);
    }
    // eslint-disable-next-line no-console
    if (process.env.SFX_REPORT) console.log(rows.join('\n'));
  }, 60000);

  it('pitch shifts (seed runs, rising combos) stay within headroom', () => {
    for (const pitch of [0.6, 1.5, 2])
      expect(
        peak(
          renderCue([
            { voice: 'udu', pitch },
            { voice: 'agogoTing', pitch },
          ]),
        ),
      ).toBeLessThan(0.9);
  });

  it('softSfx halves every gain and keeps the shape', () => {
    const soft = softSfx(coreSfx);
    expect(Object.keys(soft)).toEqual(Object.keys(coreSfx));
    expect(asSteps(soft.tap!)[0]!.gain).toBeCloseTo(0.5);
  });
});

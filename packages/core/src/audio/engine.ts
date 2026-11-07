import { createScope } from '../lifecycle';
import type { Settings } from '../settings';
import type {
  CueStep,
  InstrumentPreset,
  MusicTrack,
  PlayOptions,
  SfxCue,
  SfxMap,
  VoiceLayer,
} from './types';
import { instruments as builtInInstruments } from './instruments';
import { coreSfx } from './core-sfx';

export interface AudioEngine {
  /** 'locked' until the first user gesture creates and resumes the AudioContext. */
  readonly state: 'locked' | 'running' | 'unsupported';
  /** Call from any user gesture (done automatically by `autoUnlock`). */
  unlock(): void;
  playVoice(name: string, opts?: PlayOptions): void;
  /** Play a named event cue (tap, success, ...). Unknown events are ignored. */
  playSfx(event: string, opts?: PlayOptions): void;
  registerInstruments(map: Record<string, InstrumentPreset>): void;
  registerSfx(map: SfxMap): void;
  playMusic(track: MusicTrack): void;
  stopMusic(): void;
  destroy(): void;
}

export interface AudioOptions {
  settings: Settings;
  /** injectable for tests */
  contextFactory?: () => AudioContext;
  /** listen for the first gesture on `window` (default true) */
  autoUnlock?: boolean;
}

const MAX_VOICES = 20;
const MAX_VOICE_GAIN = 0.6;

export function createAudio(options: AudioOptions): AudioEngine {
  const { settings } = options;
  const scope = createScope();
  const presets: Record<string, InstrumentPreset> = { ...builtInInstruments };
  const cues: SfxMap = { ...coreSfx };
  let ctx: AudioContext | null = null;
  let state: AudioEngine['state'] = 'locked';
  let master: GainNode;
  let sfxBus: GainNode;
  let musicBus: GainNode;
  let noiseBuf: AudioBuffer | null = null;
  let active = 0;
  const keyed = new Map<string, () => void>();
  let pendingMusic: MusicTrack | null = null;
  let stopMusicFn: (() => void) | null = null;

  const applyVolumes = (): void => {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(settings.get('masterVolume'), t, 0.02);
    sfxBus.gain.setTargetAtTime(settings.get('sound') ? settings.get('sfxVolume') : 0, t, 0.02);
    musicBus.gain.setTargetAtTime(settings.get('music') ? settings.get('musicVolume') : 0, t, 0.05);
  };

  const noise = (c: AudioContext): AudioBuffer => {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let s = 1;
      for (let i = 0; i < d.length; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0; // deterministic noise, no Math.random
        d[i] = s / 2147483648 - 1;
      }
    }
    return noiseBuf;
  };

  /** Build one layer; returns the time (s) at which it ends. */
  const layer = (
    c: AudioContext,
    L: VoiceLayer,
    t0: number,
    pitch: number,
    out: AudioNode,
    nodes: AudioScheduledSourceNode[],
  ): number => {
    const start = t0 + (L.delay ?? 0);
    const atk = L.env.attack ?? 0.003;
    const end = start + atk + L.env.decay;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, L.gain ?? 1), start + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(out);
    let src: AudioScheduledSourceNode;
    if (L.kind === 'noise') {
      const s = c.createBufferSource();
      s.buffer = noise(c);
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = L.filter;
      f.Q.value = L.q ?? 1;
      f.frequency.setValueAtTime(L.freq * pitch, start);
      if (L.freqEnd) f.frequency.exponentialRampToValueAtTime(L.freqEnd * pitch, end);
      s.connect(f).connect(g);
      src = s;
    } else if (L.kind === 'fm') {
      const car = c.createOscillator();
      const mod = c.createOscillator();
      const mg = c.createGain();
      const f = L.freq * pitch;
      car.frequency.value = f;
      mod.frequency.value = f * L.ratio;
      mg.gain.setValueAtTime(L.index * f * L.ratio, start);
      mg.gain.exponentialRampToValueAtTime(0.01, start + (L.indexDecay ?? L.env.decay));
      mod.connect(mg).connect(car.frequency);
      car.connect(g);
      mod.start(start);
      mod.stop(end + 0.02);
      nodes.push(mod);
      src = car;
    } else {
      const o = c.createOscillator();
      o.type = L.wave;
      o.frequency.setValueAtTime(L.freq * pitch, start);
      if (L.freqEnd) {
        o.frequency.exponentialRampToValueAtTime(
          L.freqEnd * pitch,
          start + (L.glide ?? L.env.decay),
        );
      }
      if (L.lfo) {
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = L.lfo.rate;
        lg.gain.value = L.lfo.depth * (L.lfo.target === 'pitch' ? pitch : 1);
        lfo.connect(lg).connect(L.lfo.target === 'pitch' ? o.frequency : g.gain);
        lfo.start(start);
        lfo.stop(end + 0.02);
        nodes.push(lfo);
      }
      o.connect(g);
      src = o;
    }
    src.start(start);
    src.stop(end + 0.02);
    nodes.push(src);
    return end;
  };

  const voice = (name: string, o: PlayOptions, bus: GainNode): void => {
    const p = presets[name];
    if (!ctx || !p || state !== 'running') return;
    if (active >= MAX_VOICES) return;
    keyed.get(o.key ?? '')?.();
    const c = ctx;
    const t0 = c.currentTime + (o.when ?? 0);
    const out = c.createGain();
    out.gain.value = Math.min(MAX_VOICE_GAIN, (o.gain ?? 1) * MAX_VOICE_GAIN);
    out.connect(bus);
    const nodes: AudioScheduledSourceNode[] = [];
    let last = t0;
    for (const L of p.layers) last = Math.max(last, layer(c, L, t0, o.pitch ?? 1, out, nodes));
    last = Math.min(last, t0 + p.duration);
    active++;
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      active--;
      out.disconnect();
      if (o.key) keyed.delete(o.key);
    };
    nodes[nodes.length - 1]?.addEventListener('ended', finish);
    if (o.key) {
      keyed.set(o.key, () => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
        finish();
      });
    }
    // Hard stop so a voice can never ring past its declared duration.
    nodes.forEach((n) => {
      try {
        n.stop(last + 0.02);
      } catch {
        /* ignore */
      }
    });
  };

  const runCue = (cue: SfxCue, base: PlayOptions, bus: GainNode): void => {
    for (const s of Array.isArray(cue) ? cue : [cue]) {
      voice(
        s.voice,
        {
          pitch: (s.pitch ?? 1) * (base.pitch ?? 1),
          gain: (s.gain ?? 1) * (base.gain ?? 1),
          when: (s.when ?? 0) + (base.when ?? 0),
          key: s.key ?? base.key,
        },
        bus,
      );
    }
  };

  const startMusic = (track: MusicTrack): void => {
    stopMusicFn?.();
    stopMusicFn = null;
    if (!ctx || state !== 'running') {
      pendingMusic = track;
      return;
    }
    pendingMusic = null;
    const c = ctx;
    if (track.kind === 'file') {
      let src: AudioBufferSourceNode | null = null;
      let cancelled = false;
      fetch(track.url)
        .then((r) => r.arrayBuffer())
        .then((b) => c.decodeAudioData(b))
        .then((buf) => {
          if (cancelled) return;
          src = c.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(musicBus);
          src.start();
        })
        .catch(() => undefined); // missing/unsupported music file must never break the game
      stopMusicFn = () => {
        cancelled = true;
        try {
          src?.stop();
        } catch {
          /* ignore */
        }
      };
      return;
    }
    const stepLen = 60 / track.bpm / 2;
    let i = 0;
    let nextT = c.currentTime + 0.1;
    const pump = (): void => {
      while (nextT < c.currentTime + 0.35) {
        const step = track.steps[i % track.steps.length];
        if (step) {
          const wait = nextT - c.currentTime;
          for (const s of Array.isArray(step) ? step : [step]) {
            voice(s.voice, { ...s, when: wait + (s.when ?? 0) }, musicBus);
          }
        }
        i++;
        nextT += stepLen;
      }
    };
    pump();
    const off = scope.interval(pump, 120);
    stopMusicFn = off;
  };

  const unlock = (): void => {
    if (state === 'running' || state === 'unsupported') {
      void ctx?.resume?.();
      return;
    }
    try {
      ctx = options.contextFactory
        ? options.contextFactory()
        : new (
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          )();
    } catch {
      state = 'unsupported';
      return;
    }
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus.connect(master);
    // Safety limiter: several overlapping cues plus music must never clip the output.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    state = 'running';
    applyVolumes();
    void ctx.resume?.();
    if (pendingMusic) startMusic(pendingMusic);
  };

  scope.add(settings.subscribe(applyVolumes));
  if (options.autoUnlock !== false) {
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) {
      scope.on(window, ev, unlock, { capture: true, passive: true });
    }
  }
  scope.on(document, 'visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend?.();
    else void ctx.resume?.();
  });

  return {
    get state() {
      return state;
    },
    unlock,
    playVoice: (name, o = {}) => voice(name, o, sfxBus),
    playSfx(event, o = {}) {
      const cue = cues[event];
      if (cue && state === 'running') runCue(cue, o, sfxBus);
    },
    registerInstruments: (map) => void Object.assign(presets, map),
    registerSfx: (map) => void Object.assign(cues, map),
    playMusic: startMusic,
    stopMusic() {
      pendingMusic = null;
      stopMusicFn?.();
      stopMusicFn = null;
    },
    destroy() {
      stopMusicFn?.();
      keyed.clear();
      scope.destroy();
      void ctx?.close?.();
      ctx = null;
    },
  };
}

export type { CueStep };

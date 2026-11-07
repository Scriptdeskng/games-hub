import { afterEach, describe, expect, it, vi } from 'vitest';
import { leakCounters } from '../lifecycle';
import { createSettings } from '../settings';
import { createStorage } from '../storage';
import { createAudio } from './engine';
import type { InstrumentPreset } from './types';

class Param {
  value = 1;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn((v: number) => void (this.value = v));
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  type = '';
  buffer: unknown = null;
  loop = false;
  started = 0;
  stopped = 0;
  listeners: Record<string, () => void> = {};
  connect = vi.fn((n: Node) => n);
  disconnect = vi.fn();
  start = vi.fn(() => void this.started++);
  stop = vi.fn(() => void this.stopped++);
  addEventListener = vi.fn((t: string, fn: () => void) => void (this.listeners[t] = fn));
}
class FakeCtx {
  currentTime = 0;
  sampleRate = 100;
  destination = new Node();
  nodes: Node[] = [];
  created: Record<string, number> = {};
  resume = vi.fn(async () => undefined);
  suspend = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);
  decodeAudioData = vi.fn(async () => ({}));
  private make(kind: string): Node {
    this.created[kind] = (this.created[kind] ?? 0) + 1;
    const n = new Node();
    this.nodes.push(n);
    return n;
  }
  createGain = () => this.make('gain');
  createOscillator = () => this.make('osc');
  createBiquadFilter = () => this.make('filter');
  createBufferSource = () => this.make('source');
  createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
}

const setup = (opts: { auto?: boolean } = {}) => {
  const ctx = new FakeCtx();
  const settings = createSettings(createStorage('audio-test'));
  const audio = createAudio({
    settings,
    contextFactory: () => ctx as unknown as AudioContext,
    autoUnlock: opts.auto ?? false,
  });
  return { ctx, settings, audio };
};

const preset = (id: string, layers: InstrumentPreset['layers']): InstrumentPreset => ({
  id,
  description: id,
  duration: 1,
  layers,
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('audio engine', () => {
  it('stays locked and silent until a user gesture unlocks it', () => {
    const { ctx, audio } = setup({ auto: true });
    audio.playSfx('tap');
    expect(audio.state).toBe('locked');
    expect(ctx.nodes).toHaveLength(0);
    window.dispatchEvent(new Event('pointerdown'));
    expect(audio.state).toBe('running');
    expect(ctx.resume).toHaveBeenCalled();
    audio.destroy();
  });
  it('plays core sfx cues through instrument presets', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    audio.registerInstruments({
      testOsc: preset('testOsc', [
        { kind: 'osc', wave: 'sine', freq: 440, freqEnd: 220, glide: 0.1, env: { decay: 0.1 } },
      ]),
      testFm: preset('testFm', [
        { kind: 'fm', freq: 300, ratio: 1.5, index: 2, env: { decay: 0.2 } },
      ]),
      testNoise: preset('testNoise', [
        { kind: 'noise', filter: 'bandpass', freq: 2000, freqEnd: 1000, env: { decay: 0.1 } },
      ]),
      testLfo: preset('testLfo', [
        {
          kind: 'osc',
          wave: 'square',
          freq: 100,
          lfo: { rate: 5, depth: 3, target: 'pitch' },
          env: { decay: 0.1 },
        },
      ]),
      testLfoGain: preset('testLfoGain', [
        {
          kind: 'osc',
          wave: 'square',
          freq: 100,
          lfo: { rate: 5, depth: 0.2, target: 'gain' },
          env: { decay: 0.1 },
        },
      ]),
    });
    audio.registerSfx({ multi: [{ voice: 'testOsc' }, { voice: 'testFm', when: 0.1, pitch: 2 }] });
    audio.playSfx('multi', { gain: 0.5 });
    audio.playVoice('testNoise');
    audio.playVoice('testLfo');
    audio.playVoice('testLfoGain');
    expect(ctx.created.osc).toBeGreaterThanOrEqual(5);
    expect(ctx.created.filter).toBe(1);
    expect(ctx.nodes.filter((n) => n.started > 0).length).toBeGreaterThan(6);
    audio.playSfx('does-not-exist');
    audio.playVoice('does-not-exist');
    audio.destroy();
  });
  it('default core events all map to known voices', () => {
    const { audio } = setup();
    audio.unlock();
    for (const e of [
      'tap',
      'select',
      'back',
      'success',
      'fail',
      'coin',
      'card',
      'dice',
      'move',
      'drop',
      'turn',
      'tick',
      'start',
      'win',
      'lose',
      'unlock',
    ]) {
      expect(() => audio.playSfx(e)).not.toThrow();
    }
    audio.destroy();
  });
  it('mute and volume come from persisted settings', () => {
    const { ctx, settings, audio } = setup();
    audio.unlock();
    settings.set('sound', false);
    const sfxBus = ctx.nodes[1]!; // master, sfx, music
    expect(sfxBus.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.02);
    settings.set('sound', true);
    expect(sfxBus.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
    settings.set('music', false);
    expect(ctx.nodes[2]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.05);
    settings.set('masterVolume', 0.4);
    expect(ctx.nodes[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 0, 0.02);
    audio.destroy();
  });
  it('caps polyphony and retriggers keyed voices', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    audio.playVoice('agogo');
    const oscPerVoice = ctx.created.osc; // real agogo = FM bells (2 oscillators per layer)
    ctx.nodes.forEach((n) => n.listeners.ended?.());
    for (let i = 0; i < 40; i++) audio.playVoice('agogo');
    expect(ctx.created.osc).toBeLessThanOrEqual(20 * oscPerVoice + oscPerVoice);
    const before = ctx.nodes.length;
    const a = setup();
    a.audio.unlock();
    a.audio.playVoice('agogo', { key: 'k' });
    const first = a.ctx.nodes.filter((n) => n.stop.mock.calls.length > 0).length;
    a.audio.playVoice('agogo', { key: 'k' });
    expect(a.ctx.nodes.filter((n) => n.stopped > 0).length).toBeGreaterThanOrEqual(first);
    expect(before).toBeGreaterThan(0);
    a.audio.destroy();
    audio.destroy();
  });
  it('voice end releases polyphony slots', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 15; i++) audio.playVoice('agogo');
      ctx.nodes.forEach((n) => n.listeners.ended?.());
    }
    expect(ctx.created.osc).toBeGreaterThan(20);
    audio.destroy();
  });
  it('pattern music loops with a scheduler that stops with the music', () => {
    vi.useFakeTimers();
    const { ctx, audio } = setup();
    const base = leakCounters().timers;
    audio.playMusic({
      kind: 'pattern',
      bpm: 120,
      steps: [{ voice: 'ekwe' }, null, { voice: 'agogo' }],
    });
    expect(ctx.nodes).toHaveLength(0); // locked: queued
    audio.unlock();
    expect(ctx.created.osc).toBeGreaterThan(0);
    expect(leakCounters().timers).toBe(base + 1);
    ctx.currentTime = 5;
    vi.advanceTimersByTime(500);
    expect(ctx.created.osc).toBeGreaterThan(2);
    audio.stopMusic();
    expect(leakCounters().timers).toBe(base);
    audio.destroy();
  });
  it('file music is fetched and decoded; failures are swallowed', async () => {
    const { ctx, audio } = setup();
    audio.unlock();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    audio.playMusic({ kind: 'file', url: './m.ogg' });
    await vi.waitFor(() => expect(ctx.created.source).toBe(1));
    audio.stopMusic();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('404')));
    audio.playMusic({ kind: 'file', url: './missing.ogg' });
    await Promise.resolve();
    audio.stopMusic();
    vi.unstubAllGlobals();
    audio.destroy();
  });
  it('suspends when the tab is hidden and resumes when visible', () => {
    const { ctx, audio } = setup({ auto: true });
    audio.unlock();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.suspend).toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    audio.destroy();
    expect(ctx.close).toHaveBeenCalled();
  });
  it('reports unsupported when no AudioContext can be created', () => {
    const audio = createAudio({
      settings: createSettings(createStorage('audio-test')),
      contextFactory: () => {
        throw new Error('nope');
      },
      autoUnlock: false,
    });
    audio.unlock();
    expect(audio.state).toBe('unsupported');
    expect(() => audio.playSfx('tap')).not.toThrow();
    audio.unlock();
    audio.destroy();
  });
});

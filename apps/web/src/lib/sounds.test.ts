import { beforeEach, describe, expect, it, vi } from 'vitest';

// happy-dom has no Web Audio: a fake context records the voices a sound starts.
const started = vi.fn();

class FakeNode {
  gain = { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  frequency = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  Q = { value: 0 };
  type = '';
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect = vi.fn((to: FakeNode) => to);
  disconnect = vi.fn();
  start = started;
  stop = vi.fn();
}

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode();
  createGain = () => new FakeNode();
  createOscillator = () => new FakeNode();
  createBiquadFilter = () => new FakeNode();
  createBufferSource = () => new FakeNode();
  createBuffer = (_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  });
  resume = vi.fn();
}

const prefersReducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({ matches }));

// A fresh module per test, so no audio context or listener carries over.
const loadSounds = async () => {
  vi.resetModules();
  return import('@/lib/sounds');
};

describe('sounds', () => {
  beforeEach(() => {
    localStorage.clear();
    started.mockClear();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    prefersReducedMotion(false);
  });

  it('plays by default', async () => {
    const { sounds } = await loadSounds();
    sounds.click();
    expect(started).toHaveBeenCalledOnce();
  });

  it('stays silent once the user turns sounds off', async () => {
    const { sounds, setSoundEnabled } = await loadSounds();
    setSoundEnabled(false);
    sounds.click();
    sounds.error();
    expect(started).not.toHaveBeenCalled();
  });

  it('remembers the choice on the device', async () => {
    (await loadSounds()).setSoundEnabled(false);
    const { isSoundEnabled } = await loadSounds();
    expect(isSoundEnabled()).toBe(false);
  });

  it('stays silent when the user asks for less motion', async () => {
    prefersReducedMotion(true);
    const { sounds } = await loadSounds();
    sounds.warning();
    expect(started).not.toHaveBeenCalled();
  });

  it('tells subscribers when the choice changes', async () => {
    const { setSoundEnabled, subscribeToSoundPreference } = await loadSounds();
    const listener = vi.fn();
    subscribeToSoundPreference(listener);
    setSoundEnabled(false);
    expect(listener).toHaveBeenCalledOnce();
  });
});

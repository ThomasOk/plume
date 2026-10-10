// Sound is a layer over feedback that is always visible too: a user who turns it off, or
// asks for less motion, loses nothing. The choice belongs to the device, not the account,
// so it lives in localStorage like the theme.
const STORAGE_KEY = 'sounds';
// One gain for every sound keeps them quiet together and lets one knob tune them all.
const MASTER_GAIN = 0.6;

let audioContext: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Without storage the choice cannot be kept; sounds stay at their default
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToSoundPreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// There is no prefers-reduced-audio: a user who asks for less motion is taken to want
// less stimulation of every kind.
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function getMaster(ctx: AudioContext): GainNode {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  }
  return master;
}

interface Voice {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
}

// Connects the nodes in order into the master gain and returns them for cleanup.
function chain(ctx: AudioContext, ...nodes: AudioNode[]): AudioNode[] {
  nodes.reduce((from, to) => from.connect(to));
  nodes[nodes.length - 1]!.connect(getMaster(ctx));
  return nodes;
}

function play(build: (ctx: AudioContext, t: number) => Voice): void {
  if (!isSoundEnabled() || prefersReducedMotion()) return;
  try {
    const ctx = getAudioContext();
    const { sources, nodes } = build(ctx, ctx.currentTime);
    let playing = sources.length;
    sources.forEach((source) => {
      source.onended = () => {
        playing -= 1;
        if (playing === 0) nodes.forEach((node) => node.disconnect());
      };
    });
  } catch {
    // Audio errors are non-fatal — silently ignored
  }
}

// A burst of white noise decaying over `decay` samples: the body of a click.
function noiseBurst(ctx: AudioContext, seconds: number, decay: number) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay);
  }
  noise.buffer = buf;
  return noise;
}

interface Sweep {
  from: number;
  to: number;
  /** When the pitch reaches `to`, and when the sound has died away, in seconds. */
  glide: number;
  duration: number;
  peak: number;
}

// A sine that glides between two pitches: rising opens, falling closes.
function sweep(ctx: AudioContext, t: number, { from, to, glide, duration, peak }: Sweep): Voice {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + glide);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.start(t);
  osc.stop(t + duration);
  return { sources: [osc], nodes: chain(ctx, osc, gain) };
}

// Entering focus mode is a big change; unfolding a menu or a branch of tags is the same
// gesture at a smaller scale, so its pair sits higher, shorter and quieter.
const FOCUS = { low: 300, high: 800, glide: 0.1, duration: 0.12, peak: 0.3 };
const UNFOLD = { low: 780, high: 1170, glide: 0.048, duration: 0.06, peak: 0.13 };
// A reaction is a playful gesture: a bubble that swells fast and pops. Taking it back is
// the same bubble, smaller, falling.
const REACT = { from: 330, to: 760, glide: 0.03, duration: 0.08, peak: 0.2 };
const UNREACT = { from: 620, to: 380, glide: 0.04, duration: 0.05, peak: 0.11 };

export const sounds = {
  pop: () =>
    play((ctx, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.start(t);
      osc.stop(t + 0.05);
      return { sources: [osc], nodes: chain(ctx, osc, gain) };
    }),

  tick: () =>
    play((ctx, t) => {
      const noise = noiseBurst(ctx, 0.004, 20);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;

      const gain = ctx.createGain();
      gain.gain.value = 0.3;

      noise.start(t);
      return { sources: [noise], nodes: chain(ctx, noise, filter, gain) };
    }),

  click: () =>
    play((ctx, t) => {
      const noise = noiseBurst(ctx, 0.008, 50);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4000 + Math.random() * 1000;
      filter.Q.value = 3;

      const gain = ctx.createGain();
      gain.gain.value = 0.5 + Math.random() * 0.15;

      noise.start(t);
      return { sources: [noise], nodes: chain(ctx, noise, filter, gain) };
    }),

  expand: () => play((ctx, t) => sweep(ctx, t, { ...FOCUS, from: FOCUS.low, to: FOCUS.high })),

  collapse: () => play((ctx, t) => sweep(ctx, t, { ...FOCUS, from: FOCUS.high, to: FOCUS.low })),

  unfold: () => play((ctx, t) => sweep(ctx, t, { ...UNFOLD, from: UNFOLD.low, to: UNFOLD.high })),

  fold: () => play((ctx, t) => sweep(ctx, t, { ...UNFOLD, from: UNFOLD.high, to: UNFOLD.low })),

  react: () => play((ctx, t) => sweep(ctx, t, REACT)),

  unreact: () => play((ctx, t) => sweep(ctx, t, UNREACT)),

  warning: () =>
    play((ctx, t) => {
      const voice: Voice = { sources: [], nodes: [] };

      [0, 0.225].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 704 : 558;

        const start = t + delay;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.21, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.start(start);
        osc.stop(start + 0.18);
        voice.sources.push(osc);
        voice.nodes.push(...chain(ctx, osc, gain));
      });
      return voice;
    }),

  // Informs without punishing: a low falling tone, its edge taken off by a lowpass.
  error: () =>
    play((ctx, t) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.2);
      return { sources: [osc], nodes: chain(ctx, osc, filter, gain) };
    }),
};

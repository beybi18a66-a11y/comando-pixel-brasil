// Tiny WebAudio arcade SFX synth — no assets, all procedural.
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}
export function unlockAudio() {
  ac();
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

export function tone({ freq, to, dur = 0.1, type = "square", gain = 0.05, delay = 0 }: ToneOpts) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function noise(dur = 0.2, gain = 0.08, filter = 1200, delay = 0) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "lowpass";
  bp.frequency.setValueAtTime(filter, t);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  pistol: () => {
    tone({ freq: 900, to: 200, dur: 0.06, type: "square", gain: 0.04 });
    noise(0.05, 0.05, 3000);
  },
  heavy: () => {
    tone({ freq: 700, to: 240, dur: 0.05, type: "sawtooth", gain: 0.035 });
    noise(0.04, 0.04, 2500);
  },
  shotgun: () => {
    noise(0.22, 0.12, 1400);
    tone({ freq: 220, to: 60, dur: 0.2, type: "square", gain: 0.05 });
  },
  rocket: () => {
    tone({ freq: 160, to: 700, dur: 0.3, type: "sawtooth", gain: 0.05 });
    noise(0.3, 0.05, 900);
  },
  flame: () => {
    noise(0.12, 0.03, 700);
  },
  explosion: () => {
    noise(0.6, 0.16, 700);
    tone({ freq: 120, to: 40, dur: 0.5, type: "sawtooth", gain: 0.07 });
  },
  jump: () => tone({ freq: 320, to: 620, dur: 0.12, type: "square", gain: 0.035 }),
  hurt: () => {
    tone({ freq: 300, to: 90, dur: 0.25, type: "sawtooth", gain: 0.06 });
  },
  pickup: () => {
    tone({ freq: 660, dur: 0.07, type: "square", gain: 0.05 });
    tone({ freq: 990, dur: 0.09, type: "square", gain: 0.05, delay: 0.07 });
    tone({ freq: 1320, dur: 0.12, type: "square", gain: 0.05, delay: 0.15 });
  },
  pow: () => {
    tone({ freq: 520, dur: 0.1, type: "triangle", gain: 0.06 });
    tone({ freq: 780, dur: 0.14, type: "triangle", gain: 0.06, delay: 0.11 });
  },
  radio: () => {
    noise(0.12, 0.05, 2200);
    tone({ freq: 880, dur: 0.06, type: "square", gain: 0.04, delay: 0.12 });
    tone({ freq: 1180, dur: 0.06, type: "square", gain: 0.04, delay: 0.2 });
    noise(0.1, 0.04, 2200, 0.28);
  },
  beep: () => tone({ freq: 740, dur: 0.08, type: "square", gain: 0.05 }),
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: "square", gain: 0.05, delay: i * 0.13 }),
    );
  },
  defeat: () => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ freq: f, dur: 0.26, type: "sawtooth", gain: 0.05, delay: i * 0.18 }),
    );
  },
};

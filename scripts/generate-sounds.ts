#!/usr/bin/env node
/**
 * generate-sounds.ts
 *
 * Standalone script that generates WAV files for all three themes
 * (galactic, arcane, cyberpunk) with distinct sound characters per event.
 *
 * Usage:
 *   npx tsx scripts/generate-sounds.ts
 *   node --loader ts-node/esm scripts/generate-sounds.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_ROOT = path.resolve(__dirname, "..", "assets", "themes");

// ---------------------------------------------------------------------------
// Synthesis helpers
// ---------------------------------------------------------------------------

/** Generate sine-wave samples at `freq` Hz for `duration` seconds. */
function sineWave(freq: number, duration: number, sampleRate = SAMPLE_RATE): number[] {
  const len = Math.round(duration * sampleRate);
  const out: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate));
  }
  return out;
}

/** Generate square-wave samples at `freq` Hz for `duration` seconds. */
function squareWave(freq: number, duration: number, sampleRate = SAMPLE_RATE): number[] {
  const len = Math.round(duration * sampleRate);
  const out: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) >= 0 ? 1 : -1;
  }
  return out;
}

/**
 * Generate a sine chirp that sweeps from `freqStart` to `freqEnd` over
 * `duration` seconds (linear frequency sweep).
 */
function chirpWave(
  freqStart: number,
  freqEnd: number,
  duration: number,
  sampleRate = SAMPLE_RATE,
): number[] {
  const len = Math.round(duration * sampleRate);
  const out: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const freq = freqStart + (freqEnd - freqStart) * (t / duration);
    out[i] = Math.sin(2 * Math.PI * freq * t);
  }
  return out;
}

/** Generate white noise samples for `duration` seconds, amplitude in [-1,1]. */
function noise(duration: number, sampleRate = SAMPLE_RATE): number[] {
  const len = Math.round(duration * sampleRate);
  const out: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Math.random() * 2 - 1;
  }
  return out;
}

/** Create a silent gap of `duration` seconds. */
function silence(duration: number, sampleRate = SAMPLE_RATE): number[] {
  const len = Math.round(duration * sampleRate);
  return new Array(len).fill(0);
}

/**
 * Apply an attack-decay envelope (linear ramp up then linear ramp down).
 * `attack` and `decay` are in seconds. The sustain level is 1.0 for the
 * portion between attack and (total - decay).
 */
function applyEnvelope(samples: number[], attack: number, decay: number): number[] {
  const out = samples.slice();
  const attackSamples = Math.round(attack * SAMPLE_RATE);
  const decaySamples = Math.round(decay * SAMPLE_RATE);
  const len = out.length;

  for (let i = 0; i < len; i++) {
    let env = 1.0;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i > len - decaySamples) {
      env = (len - i) / decaySamples;
    }
    out[i] *= env;
  }
  return out;
}

/** Scale every sample by `gain`. */
function applyGain(samples: number[], gain: number): number[] {
  return samples.map((s) => s * gain);
}

/** Mix (add) two sample arrays. If lengths differ, the shorter is zero-padded. */
function mixSamples(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const out: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  }
  return out;
}

/** Concatenate sample arrays, with an optional `gap` (seconds) of silence between each. */
function concatenate(arrays: number[][], gap = 0): number[] {
  const gapSamples = silence(gap);
  const parts: number[][] = [];
  for (let i = 0; i < arrays.length; i++) {
    if (i > 0 && gap > 0) parts.push(gapSamples);
    parts.push(arrays[i]);
  }
  return parts.flat();
}

/** Normalize samples so the peak is at `ceiling` (default 0.95). */
function normalize(samples: number[], ceiling = 0.95): number[] {
  let peak = 0;
  for (const s of samples) {
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  if (peak === 0) return samples;
  const scale = ceiling / peak;
  return samples.map((s) => s * scale);
}

// ---------------------------------------------------------------------------
// WAV writer
// ---------------------------------------------------------------------------

function writeWav(filePath: string, samples: number[], sampleRate = SAMPLE_RATE): void {
  const numSamples = samples.length;
  const byteRate = sampleRate * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const dataSize = numSamples * (BITS_PER_SAMPLE / 8);
  const fileSize = 36 + dataSize; // 36 = header bytes before data samples

  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(fileSize, 4);
  buf.write("WAVE", 8, "ascii");

  // fmt chunk
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16); // chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(NUM_CHANNELS, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data chunk
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);

  // Write 16-bit PCM samples
  for (let i = 0; i < numSamples; i++) {
    let val = Math.max(-1, Math.min(1, samples[i]));
    val = Math.round(val * 32767);
    buf.writeInt16LE(val, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buf);
}

// ---------------------------------------------------------------------------
// Sound generators per event type
// ---------------------------------------------------------------------------

/**
 * task-complete: Bright ascending double-chime.
 * Two quick ascending sine tones, major 5th interval (freq * 1.5).
 */
function genTaskComplete(baseFreq: number): number[] {
  const toneDuration = 0.12;
  const gap = 0.04;
  const tone1 = applyEnvelope(sineWave(baseFreq, toneDuration), 0.005, 0.06);
  const tone2 = applyEnvelope(sineWave(baseFreq * 1.5, toneDuration), 0.005, 0.06);
  const raw = concatenate([tone1, tone2], gap);
  return normalize(raw, 0.8);
}

/**
 * task-complete-escalated: Same character but louder, longer, with 3 chimes.
 */
function genTaskCompleteEscalated(baseFreq: number): number[] {
  const toneDuration = 0.16;
  const gap = 0.05;
  const tone1 = applyEnvelope(sineWave(baseFreq, toneDuration), 0.005, 0.08);
  const tone2 = applyEnvelope(sineWave(baseFreq * 1.5, toneDuration), 0.005, 0.08);
  const tone3 = applyEnvelope(sineWave(baseFreq * 2.0, toneDuration), 0.005, 0.08);
  const raw = concatenate([tone1, tone2, tone3], gap);
  return normalize(raw, 0.95);
}

/**
 * needs-input: Gentle repeating pulse — 3 short soft beeps (like a question).
 */
function genNeedsInput(baseFreq: number): number[] {
  const beepDuration = 0.08;
  const gap = 0.1;
  const beeps: number[][] = [];
  for (let i = 0; i < 3; i++) {
    beeps.push(applyEnvelope(sineWave(baseFreq * 1.2, beepDuration), 0.005, 0.04));
  }
  const raw = concatenate(beeps, gap);
  return normalize(raw, 0.6);
}

/**
 * needs-input-escalated: 5 beeps, louder, slightly faster.
 */
function genNeedsInputEscalated(baseFreq: number): number[] {
  const beepDuration = 0.07;
  const gap = 0.07;
  const beeps: number[][] = [];
  for (let i = 0; i < 5; i++) {
    beeps.push(applyEnvelope(sineWave(baseFreq * 1.2, beepDuration), 0.005, 0.035));
  }
  const raw = concatenate(beeps, gap);
  return normalize(raw, 0.85);
}

/**
 * error: Low harsh buzz — square wave + noise, descending pitch.
 */
function genError(baseFreq: number): number[] {
  const duration = 0.5;
  // Descending square-wave chirp
  const sq = chirpWave(baseFreq * 0.8, baseFreq * 0.4, duration);
  // Make it square-ish by hard-clipping the chirp sine
  const sqClipped = sq.map((s) => (s >= 0 ? 0.7 : -0.7));
  // Add noise component
  const noisePart = applyGain(noise(duration), 0.3);
  const mixed = mixSamples(sqClipped, noisePart);
  const enveloped = applyEnvelope(mixed, 0.01, 0.15);
  return normalize(enveloped, 0.9);
}

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

interface ThemeConfig {
  name: string;
  baseFreq: number;
  dir: string;
}

const themes: ThemeConfig[] = [
  { name: "galactic", baseFreq: 523, dir: path.join(ASSETS_ROOT, "galactic") },
  { name: "arcane", baseFreq: 440, dir: path.join(ASSETS_ROOT, "arcane") },
  { name: "cyberpunk", baseFreq: 330, dir: path.join(ASSETS_ROOT, "cyberpunk") },
];

interface EventDef {
  filename: string;
  generate: (baseFreq: number) => number[];
}

const events: EventDef[] = [
  { filename: "task-complete.wav", generate: genTaskComplete },
  { filename: "task-complete-escalated.wav", generate: genTaskCompleteEscalated },
  { filename: "needs-input.wav", generate: genNeedsInput },
  { filename: "needs-input-escalated.wav", generate: genNeedsInputEscalated },
  { filename: "error.wav", generate: genError },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Generating WAV sound files...\n");

  let count = 0;
  for (const theme of themes) {
    console.log(`Theme: ${theme.name} (base freq ${theme.baseFreq} Hz)`);

    if (!fs.existsSync(theme.dir)) {
      fs.mkdirSync(theme.dir, { recursive: true });
    }

    for (const evt of events) {
      const filePath = path.join(theme.dir, evt.filename);
      const samples = evt.generate(theme.baseFreq);
      writeWav(filePath, samples);
      const durationSec = (samples.length / SAMPLE_RATE).toFixed(2);
      console.log(`  -> ${evt.filename}  (${durationSec}s, ${samples.length} samples)`);
      count++;
    }
    console.log();
  }

  console.log(`Done! Generated ${count} WAV files.`);
}

main();

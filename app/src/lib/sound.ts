/**
 * Лёгкий генератор звуков на Web Audio API — без аудиофайлов.
 *
 * Используется в мини-играх (рулетка): тики вращения, выигрыш, проигрыш.
 * AudioContext создаётся лениво и возобновляется по первому жесту пользователя
 * (иначе браузеры блокируют автозапуск звука). Состояние «без звука» хранится
 * в localStorage и общее для всех игр.
 */

const MUTE_KEY = 'ct-sound-muted';

let ctx: AudioContext | null = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* ignore */ }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/** Возвращает (и при необходимости создаёт/возобновляет) AudioContext, либо null. */
function getCtx(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Должен вызываться по жесту пользователя, чтобы «разбудить» аудио. */
export function primeAudio(): void {
  getCtx();
}

interface ToneOpts {
  freq: number;
  start: number;   // смещение от now, c
  dur: number;     // длительность, c
  type?: OscillatorType;
  gain?: number;
}

function tone(c: AudioContext, { freq, start, dur, type = 'sine', gain = 0.08 }: ToneOpts): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  // короткая атака + экспоненциальное затухание — мягкий «щелчок»/нота
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Одиночный «тик» (щелчок шарика по разделителю). */
export function playTick(): void {
  const c = getCtx();
  if (!c) return;
  tone(c, { freq: 880, start: 0, dur: 0.05, type: 'square', gain: 0.04 });
}

/**
 * Звук вращения колеса на duration секунд: серия тиков, которые постепенно
 * замедляются — имитация замедления шарика к остановке.
 */
export function playSpin(duration: number): void {
  const c = getCtx();
  if (!c) return;
  // лёгкий «вжух» на старте
  tone(c, { freq: 320, start: 0, dur: 0.25, type: 'sawtooth', gain: 0.05 });

  const ticks = 26;
  for (let i = 0; i < ticks; i++) {
    const p = i / (ticks - 1);           // 0..1
    // квадратичное замедление: тики гуще в начале, реже к концу
    const t = duration * (1 - Math.pow(1 - p, 2));
    const freq = 1100 - p * 480;         // тон чуть понижается
    tone(c, { freq, start: t, dur: 0.045, type: 'square', gain: 0.035 });
  }
}

/** Восходящее арпеджио — выигрыш. */
export function playWin(): void {
  const c = getCtx();
  if (!c) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(c, { freq: f, start: i * 0.09, dur: 0.22, type: 'triangle', gain: 0.09 }),
  );
}

/** Нисходящий тон — проигрыш. */
export function playLose(): void {
  const c = getCtx();
  if (!c) return;
  [392, 311.13].forEach((f, i) =>
    tone(c, { freq: f, start: i * 0.13, dur: 0.28, type: 'sine', gain: 0.07 }),
  );
}

/**
 * Every sound is synthesised at runtime — no audio files, no network cost.
 * A very quiet tactile palette: soft paper, warm wax and a distant bell.
 */

let ctx: AudioContext | null = null
let muted = localStorage.getItem('twofold:muted') !== '0'

export function isMuted() { return muted }
export function setMuted(v: boolean) {
  muted = v
  localStorage.setItem('twofold:muted', v ? '1' : '0')
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

type NoiseOpts = {
  dur: number; type?: BiquadFilterType; freq: number; q?: number
  gain?: number; sweepTo?: number; attack?: number
}

function noise(c: AudioContext, o: NoiseOpts) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, o.dur)
  const filter = c.createBiquadFilter()
  filter.type = o.type ?? 'bandpass'
  filter.frequency.setValueAtTime(o.freq, c.currentTime)
  if (o.sweepTo) filter.frequency.exponentialRampToValueAtTime(o.sweepTo, c.currentTime + o.dur)
  filter.Q.value = o.q ?? 1
  const g = c.createGain()
  const peak = o.gain ?? 0.2
  const attack = o.attack ?? 0.004
  g.gain.setValueAtTime(0.0001, c.currentTime)
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + o.dur)
  const master = c.createGain(); master.gain.value = .48
  src.connect(filter).connect(g).connect(master).connect(c.destination)
  src.start()
  src.stop(c.currentTime + o.dur)
}

type ToneOpts = {
  freq: number; dur: number; type?: OscillatorType
  gain?: number; glideTo?: number; delay?: number
}

function tone(c: AudioContext, o: ToneOpts) {
  const t0 = c.currentTime + (o.delay ?? 0)
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t0)
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + o.dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.12, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  const master = c.createGain(); master.gain.value = .42
  osc.connect(g).connect(master).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + o.dur + 0.02)
}

export type Sfx =
  | 'key' | 'rustle' | 'seal' | 'stamp' | 'chime'
  | 'tear' | 'shutter' | 'burn' | 'crumple' | 'pen' | 'thud'

export function play(name: Sfx) {
  const c = ac()
  if (!c) return
  switch (name) {
    case 'key':
      noise(c, { dur: 0.045, type: 'lowpass', freq: 1200, q: .6, gain: 0.035 })
      break
    case 'pen':
      noise(c, { dur: 0.08, type: 'bandpass', freq: 1250, q: .55, gain: 0.028 })
      break
    case 'rustle':
      noise(c, { dur: 0.36, type: 'bandpass', freq: 720, gain: 0.055, attack: 0.1, sweepTo: 1750, q: .45 })
      break
    case 'seal':
      tone(c, { freq: 165, dur: 0.3, type: 'sine', gain: 0.12, glideTo: 72 })
      noise(c, { dur: 0.26, type: 'lowpass', freq: 620, gain: 0.07, attack: 0.045 })
      tone(c, { freq: 392, dur: 0.28, type: 'sine', gain: 0.035, delay: 0.18 })
      break
    case 'stamp':
      tone(c, { freq: 105, dur: 0.16, type: 'sine', gain: 0.11, glideTo: 54 })
      noise(c, { dur: 0.09, type: 'lowpass', freq: 780, gain: 0.065 })
      break
    case 'thud':
      tone(c, { freq: 90, dur: 0.16, type: 'sine', gain: 0.14, glideTo: 45 })
      break
    case 'chime':
      tone(c, { freq: 523.25, dur: 1.1, gain: 0.055 })
      tone(c, { freq: 659.25, dur: 1.0, gain: 0.038, delay: 0.09 })
      tone(c, { freq: 783.99, dur: 0.9, gain: 0.028, delay: 0.18 })
      break
    case 'tear':
      noise(c, { dur: 0.3, freq: 900, sweepTo: 5000, q: 0.8, gain: 0.12 })
      break
    case 'shutter':
      noise(c, { dur: 0.02, freq: 3800, gain: 0.14 })
      noise(c, { dur: 0.035, freq: 1800, gain: 0.1 })
      setTimeout(() => { const cc = ac(); if (cc) noise(cc, { dur: 0.03, freq: 2600, gain: 0.1 }) }, 90)
      break
    case 'burn':
      noise(c, { dur: 0.7, type: 'lowpass', freq: 2400, sweepTo: 200, gain: 0.1, attack: 0.05 })
      tone(c, { freq: 300, dur: 0.6, type: 'sine', gain: 0.05, glideTo: 60 })
      break
    case 'crumple':
      noise(c, { dur: 0.36, type: 'bandpass', freq: 2400, sweepTo: 600, q: 0.6, gain: 0.14 })
      break
  }
}

/** Android/native vibration fallback. iOS uses a directly tapped switch in HapticButton. */
export function buzz(pattern: number | number[] = 8) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

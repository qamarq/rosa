type SoundName = "whoosh" | "pop" | "shimmer" | "tick" | "chime"

const STORAGE_KEY = "rosa-sound"
const MASTER = 0.126
const TICK_NOTES = [523.25, 587.33, 659.25, 783.99, 880]

type Engine = { ctx: AudioContext; master: GainNode; noise: AudioBuffer }

let engine: Engine | null = null
let muted: boolean | null = null
let ambient: { stop: () => void } | null = null
const listeners = new Set<() => void>()

function readMuted(): boolean {
  if (muted !== null) return muted
  if (typeof window === "undefined") return false
  muted = window.localStorage.getItem(STORAGE_KEY) === "0"
  return muted
}

function getEngine(): Engine | null {
  if (typeof window === "undefined") return null
  if (!engine) {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.2
    const master = ctx.createGain()
    master.gain.value = readMuted() ? 0 : MASTER
    master.connect(limiter).connect(ctx.destination)
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    engine = { ctx, master, noise }
  }
  if (engine.ctx.state === "suspended") void engine.ctx.resume().catch(() => undefined)
  return engine.ctx.state === "running" ? engine : null
}

export function primeJourneySound() {
  getEngine()
}

function env(ctx: AudioContext, gain: GainNode, at: number, peak: number, attack: number, release: number) {
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
}

function tone(e: Engine, freq: number, at: number, peak: number, release: number, type: OscillatorType = "sine") {
  const osc = e.ctx.createOscillator()
  const g = e.ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  env(e.ctx, g, at, peak, 0.006, release)
  osc.connect(g).connect(e.master)
  osc.start(at)
  osc.stop(at + release + 0.05)
  return osc
}

function noiseSource(e: Engine, at: number, duration: number) {
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  src.loop = true
  src.start(at)
  src.stop(at + duration)
  return src
}

const voices: Record<SoundName, (e: Engine, index: number) => void> = {
  whoosh(e) {
    const t = e.ctx.currentTime
    const filter = e.ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.Q.value = 0.9
    filter.frequency.setValueAtTime(260, t)
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.7)
    filter.frequency.exponentialRampToValueAtTime(500, t + 1.25)
    const g = e.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
    noiseSource(e, t, 1.35).connect(filter).connect(g).connect(e.master)
  },
  pop(e) {
    const t = e.ctx.currentTime
    const osc = e.ctx.createOscillator()
    const g = e.ctx.createGain()
    osc.frequency.setValueAtTime(620, t)
    osc.frequency.exponentialRampToValueAtTime(170, t + 0.12)
    env(e.ctx, g, t, 0.7, 0.004, 0.16)
    osc.connect(g).connect(e.master)
    osc.start(t)
    osc.stop(t + 0.22)
  },
  shimmer(e) {
    const t = e.ctx.currentTime
    ;[880, 1320, 1760, 2217].forEach((f, i) => {
      const osc = e.ctx.createOscillator()
      const g = e.ctx.createGain()
      osc.frequency.setValueAtTime(f, t)
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.8)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.09 / (i + 1), t + 0.35 + i * 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95)
      osc.connect(g).connect(e.master)
      osc.start(t)
      osc.stop(t + 1)
    })
  },
  tick(e, index) {
    const t = e.ctx.currentTime
    const f = TICK_NOTES[Math.min(index, TICK_NOTES.length - 1)]
    tone(e, f, t, 0.42, 0.22)
    tone(e, f * 4, t, 0.08, 0.06)
  },
  chime(e) {
    const t = e.ctx.currentTime
    ;[
      [659.25, 0],
      [880, 0.18],
    ].forEach(([f, d]) => {
      tone(e, f, t + d, 0.32, 1.1)
      tone(e, f * 2.76, t + d, 0.05, 0.4)
    })
  },
}

export const journeySound = {
  play(name: SoundName, index = 0) {
    if (readMuted()) return
    const e = getEngine()
    if (e) voices[name](e, index)
  },
  setAmbient(on: boolean) {
    if (!on) {
      ambient?.stop()
      ambient = null
      return
    }
    if (ambient || readMuted()) return
    const e = getEngine()
    if (!e) return
    const t = e.ctx.currentTime
    const filter = e.ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 420
    const bed = e.ctx.createGain()
    bed.gain.setValueAtTime(0.0001, t)
    bed.gain.exponentialRampToValueAtTime(0.22, t + 1.2)
    const lfo = e.ctx.createOscillator()
    const lfoGain = e.ctx.createGain()
    lfo.frequency.value = 0.18
    lfoGain.gain.value = 0.08
    lfo.connect(lfoGain).connect(bed.gain)
    const src = noiseSource(e, t, 600)
    src.connect(filter).connect(bed).connect(e.master)
    lfo.start(t)
    let birds = 0
    const chirp = () => {
      const now = e.ctx.currentTime
      const osc = e.ctx.createOscillator()
      const g = e.ctx.createGain()
      const base = 2600 + Math.random() * 900
      osc.frequency.setValueAtTime(base, now)
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, now + 0.07)
      env(e.ctx, g, now, 0.035, 0.01, 0.08)
      osc.connect(g).connect(e.master)
      osc.start(now)
      osc.stop(now + 0.12)
      birds = window.setTimeout(chirp, 1400 + Math.random() * 2200)
    }
    birds = window.setTimeout(chirp, 900)
    ambient = {
      stop: () => {
        window.clearTimeout(birds)
        const now = e.ctx.currentTime
        bed.gain.cancelScheduledValues(now)
        bed.gain.setValueAtTime(Math.max(bed.gain.value, 0.0001), now)
        bed.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)
        src.stop(now + 0.85)
        lfo.stop(now + 0.85)
      },
    }
  },
  isMuted: readMuted,
  setMuted(value: boolean) {
    muted = value
    window.localStorage.setItem(STORAGE_KEY, value ? "0" : "1")
    if (engine) engine.master.gain.setTargetAtTime(value ? 0 : MASTER, engine.ctx.currentTime, 0.05)
    if (value) {
      ambient?.stop()
      ambient = null
    }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

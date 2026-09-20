import { useEffect, useRef } from 'react'

/* ---------- Konami: flips the press to a random back issue ---------- */
const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
]

export function useKonami(onUnlock: () => void) {
  const progress = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const want = KONAMI[progress.current]
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key
      progress.current = got === want ? progress.current + 1 : (got === KONAMI[0] ? 1 : 0)
      if (progress.current === KONAMI.length) { progress.current = 0; onUnlock() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock])
}

/* ---------- Shake to crumple ---------- */

export async function requestMotionAccess(): Promise<boolean> {
  const DM = (window as any).DeviceMotionEvent
  if (!DM) return false
  if (typeof DM.requestPermission !== 'function') return true // non-iOS: already allowed
  try { return (await DM.requestPermission()) === 'granted' } catch { return false }
}

export function useShake(active: boolean, onShake: () => void, threshold = 26) {
  const last = useRef(0)
  useEffect(() => {
    if (!active) return
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a?.x || !a?.y || !a?.z) return
      const force = Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z)
      const now = Date.now()
      if (force > threshold && now - last.current > 1200) { last.current = now; onShake() }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [active, onShake, threshold])
}

/* ---------- Secret phrases in the letter composer ---------- */

export const SECRET_PHRASES: Record<string, { mark: string; note: string }> = {
  'i miss you': { mark: '✶', note: 'the press caught that one' },
  'best friend': { mark: '❦', note: 'set in the good typeface' },
  'remember when': { mark: '⁂', note: 'filed under: back issues' },
  'twofold': { mark: '❖', note: 'you found the colophon mark' },
}

export function findSecretPhrase(text: string) {
  const hay = text.toLowerCase()
  for (const [phrase, payload] of Object.entries(SECRET_PHRASES)) {
    if (hay.includes(phrase)) return { phrase, ...payload }
  }
  return null
}

/* ---------- Commemorative issue ---------- */

/** True when today matches the day-and-month you two first met. */
export function isAnniversary(metOn?: string | null, today = new Date()) {
  if (!metOn) return false
  const [, mm, dd] = metOn.split('-')
  if (!mm || !dd) return false
  return today.getMonth() + 1 === Number(mm) && today.getDate() === Number(dd)
}

/* ---------- Masthead long-press ---------- */

export function useRepeatedPress(count: number, onReach: () => void, windowMs = 2600) {
  const hits = useRef<number[]>([])
  return () => {
    const now = Date.now()
    hits.current = [...hits.current.filter((t) => now - t < windowMs), now]
    if (hits.current.length >= count) { hits.current = []; onReach() }
  }
}

/* ---------- Issue numbering ---------- */

export function issueNumber(startedAt?: Date | null) {
  if (!startedAt) return 1
  const weeks = Math.floor((Date.now() - startedAt.getTime()) / (7 * 864e5))
  return Math.max(1, weeks + 1)
}

export const ROMAN = (n: number) => {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let rest = Math.max(1, Math.floor(n))
  for (const [v, s] of map) while (rest >= v) { out += s; rest -= v }
  return out
}

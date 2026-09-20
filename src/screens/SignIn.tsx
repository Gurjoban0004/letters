import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSession, type Edition } from '../lib/session'
import { play } from '../lib/sound'
import { Icon } from '../components/ui'

const EDITIONS: { id: Edition; name: string; note: string; ink: string; paper: string }[] = [
  { id: 'rose', name: 'Rose Ink', note: 'Warm stock, burgundy plate, a softer cut.', ink: '#8e2f42', paper: '#f7efe7' },
  { id: 'graphite', name: 'Graphite Ink', note: 'Cool stock, black plate, a sharper cut.', ink: '#2f3a45', paper: '#f2f2ef' },
]

export default function SignIn() {
  const { user, signIn, register, claimSlot, pairing } = useSession()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [edition, setEdition] = useState<Edition>('rose')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Second friend shouldn't be able to pick a run that's already on the press.
  const taken = Object.values(pairing?.profiles ?? {}).map((p) => p.edition)
  const needsProfile = !!user

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await (mode === 'in' ? signIn(email.trim(), password) : register(email.trim(), password))
      play('seal')
    } catch (err) {
      setError(readableError(err))
      play('thud')
    } finally { setBusy(false) }
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try { await claimSlot(name.trim(), edition); play('stamp') }
    catch (err) { setError(readableError(err)) }
    finally { setBusy(false) }
  }

  return (
    <div className="stage" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: 'calc(var(--safe-top) + 3rem) 1.4rem 3rem' }}>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="kicker">Est. today</span>
            <span className="kicker">No. I</span>
          </div>
          <hr className="rule-thick" style={{ margin: '0.5rem 0 0.9rem' }} />
          <h1 className="display pressed misreg" style={{ textAlign: 'center', fontSize: 'clamp(3rem, 15vw, 5.5rem)' }}>
            Twofold
          </h1>
          <hr className="rule-double" style={{ margin: '0.9rem 0' }} />
          <p className="tac italic muted" style={{ fontSize: '1.02rem' }}>
            A private press, printed in two editions.<br />Circulation: two.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!needsProfile ? (
            <motion.form
              key="auth" onSubmit={submitAuth}
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="col gap-lg" style={{ marginTop: '3rem' }}
            >
              <div className="col gap-md">
                <label className="col gap-xs">
                  <span className="kicker">Subscriber address</span>
                  <input className="field" type="email" autoComplete="email" required inputMode="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@somewhere" />
                </label>
                <label className="col gap-xs">
                  <span className="kicker">Private key</span>
                  <input className="field" type="password" required minLength={6}
                    autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </label>
              </div>

              {error && <div className="byline" style={{ color: 'var(--accent)' }}>{error}</div>}

              <div className="col gap-sm">
                <button className="btn btn-accent" disabled={busy} style={{ width: '100%' }}>
                  {busy ? 'Pressing…' : mode === 'in' ? 'Enter the office' : 'Open an account'}
                </button>
                <button type="button" className="btn-ghost byline" style={{ padding: '0.5rem' }}
                  onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError('') }}>
                  {mode === 'in' ? 'First time here? Open an account.' : 'Already a subscriber? Sign in.'}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="profile" onSubmit={submitProfile}
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="col gap-lg" style={{ marginTop: '3rem' }}
            >
              <label className="col gap-xs">
                <span className="kicker">Your byline</span>
                <input className="field" required maxLength={24} value={name} autoFocus
                  onChange={(e) => setName(e.target.value)} placeholder="what your friend calls you" />
              </label>

              <div className="col gap-sm">
                <span className="kicker">Choose your run</span>
                <div className="col gap-sm">
                  {EDITIONS.map((ed) => {
                    const isTaken = taken.includes(ed.id) && pairing?.profiles?.[user!.uid]?.edition !== ed.id
                    return (
                      <motion.button
                        key={ed.id} type="button" disabled={isTaken}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => { setEdition(ed.id); play('key') }}
                        style={{
                          textAlign: 'left', padding: '1.05rem 1.15rem', background: ed.paper,
                          border: `1px solid ${edition === ed.id ? ed.ink : 'var(--rule)'}`,
                          boxShadow: edition === ed.id ? `inset 0 0 0 1px ${ed.ink}` : 'none',
                          opacity: isTaken ? 0.42 : 1, transition: 'all 260ms var(--ease-out)',
                        }}
                      >
                        <div className="row between" style={{ alignItems: 'center' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', color: ed.ink }}>{ed.name}</div>
                            <div className="byline" style={{ color: '#6b6258', marginTop: 2 }}>
                              {isTaken ? 'Already on the press' : ed.note}
                            </div>
                          </div>
                          <div style={{ color: ed.ink, opacity: edition === ed.id ? 1 : 0.18 }}><Icon.Check /></div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {error && <div className="byline" style={{ color: 'var(--accent)' }}>{error}</div>}
              <button className="btn btn-accent" disabled={busy || !name.trim()} style={{ width: '100%' }}>
                {busy ? 'Locking the forme…' : 'Start the press'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="tac folio" style={{ marginTop: '3.5rem' }}>Set in Instrument Serif &amp; Newsreader</div>
      </div>
    </div>
  )
}

function readableError(err: unknown) {
  const code = (err as { code?: string })?.code ?? ''
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'That key does not fit this address.'
  if (code.includes('user-not-found')) return 'No subscriber at that address yet.'
  if (code.includes('email-already-in-use')) return 'That address already has an account — sign in instead.'
  if (code.includes('weak-password')) return 'Six characters minimum, please.'
  if (code.includes('permission-denied')) return 'This address is not on the subscriber list.'
  if (code.includes('network')) return 'The wire is down. Check your connection.'
  return 'The press jammed. Try again.'
}

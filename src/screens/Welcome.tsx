import { useState, type FormEvent } from 'react'
import { useSession } from '../lib/session'

export default function Welcome({ onPreview }: { onPreview: () => void }) {
  const { user, signIn, register, claimSlot } = useSession()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (user) await claimSlot(name.trim(), 'rose')
      else await (mode === 'in' ? signIn : register)(email.trim(), password)
    } catch (e) {
      const code = (e as {code?: string}).code ?? ''
      setError(code.includes('permission') ? 'This letterbox is private to its two invited people.' : code.includes('network') ? 'We couldn’t connect. Please check your internet and try again.' : code.includes('email-already') ? 'This email already has an account. Sign in instead.' : 'We couldn’t sign you in. Check your email and password and try again.')
    } finally { setBusy(false) }
  }
  return <main className="welcome"><header><a className="brand" href="/">letters<span>♡</span></a><span>A little closer, always.</span></header>
    <section className="welcome-art"><span className="little-label">JUST BETWEEN THE TWO OF YOU</span><h1>Some things deserve<br />a <em>letter.</em></h1><p>A few words. A tiny drawing. A piece of your day.<br />Send something they’ll want to keep.</p><img src="/stationery/envelope.jpg" alt="A handmade pink envelope, sealed with a wax heart and decorated with pressed flowers" /><span className="handwritten art-caption">Small letters. Big feelings. ♡</span></section>
    <section className="welcome-form"><div className="mini-mark">♡</div><h2>{user ? 'Make yourself at home.' : 'Your little letterbox.'}</h2><p>{user ? 'What should your letters be signed with?' : 'A quiet place for you and your favorite person.'}</p>
      <form onSubmit={submit}>{user ? <label>Your name<input required maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" placeholder="What they call you" /></label> : <><label>Email address<input required type="email" autoComplete="email" placeholder="you@somewhere.com" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input required type="password" minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your little secret" /></label></>}
      {error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy || (!!user && !name.trim())}>{busy ? 'Opening…' : user ? 'Open my letterbox' : mode === 'in' ? 'Come on in →' : 'Create account →'}</button></form>
      {!user && <button className="text-button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError('') }}>{mode === 'in' ? 'First time? Create your account' : 'Already have an account? Sign in'}</button>}
      <div className="preview-link"><span>A little peek before you begin?</span><button onClick={onPreview}>Explore the sample letterbox ↗</button></div>
      <small>Private correspondence. Only the two of you.</small>
    </section><footer>Made for the things you don’t say enough.</footer>
  </main>
}

import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../lib/session'
import { EnvelopeSealed } from '../components/EnvelopeSealed'
import { DetailsAsset } from '../components/DetailsAsset'

export default function Welcome({ onPreview }: { onPreview: () => void }) {
  const { user, pairingId, signInWithGoogle, claimSlot, joiningInvite, invitation, invitationUnavailable, dismissInvite } = useSession()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const inviterName = invitation ? Object.values(invitation.profiles ?? {})[0]?.name : ''
  useEffect(() => { if (user?.displayName && !name) setName(user.displayName) }, [user?.displayName])
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (user && joiningInvite && invitationUnavailable) throw new Error('invite-not-found')
      if (user) await claimSlot(name.trim(), 'rose')
      else await signInWithGoogle()
    } catch (e) {
      const code = (e as {code?: string}).code ?? ''
      const message = (e as Error).message ?? ''
      setError(message.includes('invite-full') ? 'This letterbox already has its two people.' : message.includes('invite-already-paired') ? 'Your letterbox connected somewhere else before this invitation could be accepted.' : message.includes('invite-not-found') ? 'This invitation is no longer available.' : code.includes('network') ? 'We couldn’t connect. Please check your internet and try again.' : 'We couldn’t continue with Google. Please try again.')
    } finally { setBusy(false) }
  }
  return <main className="welcome"><header><a className="brand" href="/">letters<span>♡</span></a><span>A little closer, always.</span></header>
    <section className="welcome-art"><div className="welcome-cloud cloud-a" /><div className="welcome-cloud cloud-b" /><span className="little-label">JUST BETWEEN THE TWO OF YOU</span><h1>Some things deserve<br />a <em>letter.</em></h1><p>A few words. A tiny drawing. A piece of your day.<br />Send something they’ll want to keep.</p><div className="welcome-envelope-scene"><EnvelopeSealed envelopeId="env_7" state="open" /><DetailsAsset name="cloudLovebirds" /><DetailsAsset name="strawberryRibbon" /><DetailsAsset name="pearlHeartCharm" /></div><span className="handwritten art-caption">Small letters. Big feelings. ♡</span></section>
    <section className="welcome-form"><div className="mini-mark">♡</div><h2>{user ? joiningInvite ? inviterName ? `Join ${inviterName}’s letterbox.` : 'Join their letterbox.' : 'Make yourself at home.' : joiningInvite ? 'A letterbox is waiting.' : 'Your little letterbox.'}</h2><p>{user ? joiningInvite ? invitationUnavailable ? 'This invitation is no longer available. Ask them to share a fresh link.' : `Choose the name ${inviterName || 'they'} will see beside your letters. This private space belongs to just the two of you.${pairingId ? ' Your unused invitation will close when you join.' : ''}` : 'What should appear beside your letters?' : joiningInvite ? 'Someone made a private place for the two of you. Sign in to accept their invitation.' : 'Start your private space, invite one person, then write knowing exactly where every letter will arrive.'}</p>
      <form onSubmit={submit}>{user && <label>Your name<input required maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" placeholder="What they call you" /></label>}
      {(error || (user && invitationUnavailable)) && <p className="error" role="alert">{error || 'This invitation cannot be used anymore.'}</p>}<button className={`primary ${!user ? 'google-sign-in' : ''}`} disabled={busy || (!!user && (!name.trim() || invitationUnavailable))}>{busy ? 'Opening…' : user ? joiningInvite ? 'Join our letterbox →' : 'Create my letterbox →' : <><span className="google-mark">G</span>Continue with Google</>}</button></form>
      {user && pairingId && joiningInvite && <div className="preview-link"><span>Want to keep your own invitation instead?</span><button onClick={dismissInvite}>Back to my letterbox ↗</button></div>}
      <div className="preview-link"><span>A little peek before you begin?</span><button onClick={onPreview}>Explore the sample letterbox ↗</button></div>
      <small>No separate account to manage. Private correspondence for two.</small>
    </section><footer>Made for the things you don’t say enough.</footer>
  </main>
}

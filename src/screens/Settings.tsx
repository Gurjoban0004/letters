import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { doc, setDoc } from 'firebase/firestore'
import { db, PAIRING_ID } from '../lib/firebase'
import { useSession, type Edition } from '../lib/session'
import { enablePush, disablePush, pushStatus, isIOS, isInstalled, type PushStatus } from '../lib/push'
import { isMuted, setMuted, play } from '../lib/sound'
import { requestMotionAccess } from '../lib/eggs'
import { Icon, Sheet } from '../components/ui'

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, me, pairing, claimSlot, signOut } = useSession()
  const [status, setStatus] = useState<PushStatus>('unsupported')
  const [busy, setBusy] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [motion_, setMotion] = useState(false)
  const [metOn, setMetOn] = useState(pairing?.metOn ?? '')

  useEffect(() => { if (open) pushStatus(user?.uid).then(setStatus) }, [open, user?.uid])
  useEffect(() => { setMetOn(pairing?.metOn ?? '') }, [pairing?.metOn])

  async function turnOnPush() {
    if (!user) return
    setBusy(true)
    try { setStatus(await enablePush(user.uid)); play('chime') }
    finally { setBusy(false) }
  }

  async function saveMetOn(value: string) {
    setMetOn(value)
    await setDoc(doc(db, 'pairings', PAIRING_ID), { metOn: value || null }, { merge: true }).catch(() => {})
  }

  async function switchEdition(ed: Edition) {
    if (!me) return
    play('rustle')
    await claimSlot(me.name, ed)
  }

  return (
    <Sheet open={open} onClose={onClose} title="The masthead">
      <div className="sheet-body col gap-lg">

        {/* Notifications */}
        <section className="col gap-sm">
          <div className="row gap-xs" style={{ alignItems: 'center', color: 'var(--ink-soft)' }}>
            <Icon.Bell /><span className="kicker">Wire dispatches</span>
          </div>

          {status === 'ready' && (
            <div className="col gap-xs">
              <p className="serif-body">Dispatches are on. You'll hear about letters, doodles, snaps and small ads.</p>
              <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}
                onClick={async () => { await disablePush(); setStatus(await pushStatus(user?.uid)); play('thud') }}>
                Turn off on this device
              </button>
            </div>
          )}

          {status === 'needs-permission' && (
            <div className="col gap-sm">
              <p className="serif-body muted">
                Your phone will ask once. Say yes and the press can reach you.
              </p>
              <button className="btn btn-accent" onClick={turnOnPush} disabled={busy} style={{ alignSelf: 'flex-start' }}>
                {busy ? 'Wiring up…' : 'Turn on notifications'}
              </button>
            </div>
          )}

          {status === 'needs-install' && <InstallGuide />}

          {status === 'blocked' && (
            <p className="serif-body muted">
              Notifications were declined on this device. Re-allow them in Settings →
              Notifications → Twofold, then come back.
            </p>
          )}

          {status === 'unsupported' && (
            <p className="serif-body muted">This browser can't receive web push. Try Safari on iOS 16.4+ or Chrome.</p>
          )}
        </section>

        <hr className="rule" />

        {/* Edition */}
        <section className="col gap-sm">
          <span className="kicker">Your run</span>
          <div className="row gap-sm">
            {(['rose', 'graphite'] as Edition[]).map((ed) => (
              <button key={ed} onClick={() => switchEdition(ed)}
                className="byline grow"
                style={{
                  padding: '0.7rem', textTransform: 'capitalize',
                  border: `1px solid ${me?.edition === ed ? 'var(--accent)' : 'var(--rule)'}`,
                  background: me?.edition === ed ? 'var(--accent-wash)' : 'transparent',
                  color: me?.edition === ed ? 'var(--accent)' : 'var(--ink-soft)',
                }}>
                {ed} ink
              </button>
            ))}
          </div>
          <p className="byline faint italic">Only changes your copy. Your friend's stays as they set it.</p>
        </section>

        <hr className="rule" />

        {/* Anniversary */}
        <section className="col gap-sm">
          <span className="kicker">The day you two met</span>
          <input className="field" type="date" value={metOn} onChange={(e) => saveMetOn(e.target.value)} />
          <p className="byline faint italic">
            On that date each year the whole paper prints a commemorative issue. You'll know it when you see it.
          </p>
        </section>

        <hr className="rule" />

        {/* Press room */}
        <section className="col gap-sm">
          <span className="kicker">Press room</span>
          <label className="row between" style={{ alignItems: 'center' }}>
            <span className="serif-body">Sound effects</span>
            <input type="checkbox" checked={!muted} style={{ accentColor: 'var(--accent)', width: 20, height: 20 }}
              onChange={(e) => { setMuted(!e.target.checked); setMutedState(!e.target.checked); if (e.target.checked) play('key') }} />
          </label>
          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}
            onClick={async () => { setMotion(await requestMotionAccess()); play('key') }}>
            {motion_ ? 'Shake-to-crumple ready' : 'Enable shake-to-crumple'}
          </button>
          <p className="byline faint italic">
            In the doodle studio, shaking the phone crumples the page. iOS needs permission first.
          </p>
        </section>

        <hr className="rule" />

        <section className="col gap-sm">
          <span className="byline faint">Signed in as {user?.email}</span>
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => signOut()}>Sign out</button>
        </section>

        <div className="tac folio" style={{ paddingTop: '1.5rem' }}>Twofold · circulation two</div>
      </div>
    </Sheet>
  )
}

/** iOS refuses Web Push to a Safari tab. This is the one thing that must be explained well. */
function InstallGuide() {
  const ios = isIOS()
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="clipping" style={{ padding: '1.1rem', borderLeft: '3px solid var(--accent)' }}>
      <div className="kicker">One step first</div>
      <p className="serif-body" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
        {ios
          ? 'iPhones only deliver notifications to apps on the Home Screen — not to Safari tabs. Add Twofold first and everything works.'
          : 'Install Twofold as an app to receive notifications reliably.'}
      </p>
      {ios && (
        <ol className="col gap-xs" style={{ marginTop: '0.9rem', paddingLeft: '1.1rem' }}>
          {[
            'Tap the Share button at the bottom of Safari.',
            'Scroll and choose "Add to Home Screen".',
            'Tap Add, then open Twofold from your Home Screen.',
            'Come back here and turn on notifications.',
          ].map((step, i) => (
            <li key={i} className="serif-body" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{step}</li>
          ))}
        </ol>
      )}
      {isInstalled() && (
        <p className="byline accent" style={{ marginTop: '0.8rem' }}>
          Already on the Home Screen — reload once and this will clear.
        </p>
      )}
    </motion.div>
  )
}

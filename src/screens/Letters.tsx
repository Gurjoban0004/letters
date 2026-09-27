import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useSession } from '../lib/session'
import { useMemories, isSealed, sendLetter, type Memory } from '../lib/db'
import { loadDrafts, saveDrafts, newDraft, encodeLetter, draftPreview, getStationery, paginateText, type Draft, type LetterContentV2 } from '../lib/letters'
import { isMuted, setMuted, play } from '../lib/sound'
import { Icon } from '../components/ui'
import { EnvelopeSealed } from '../components/EnvelopeSealed'
import { DetailsAsset } from '../components/DetailsAsset'
import { enablePush, disablePush, onForegroundPush } from '../lib/push'
const Composer = lazy(() => import('./Stationery').then(module => ({ default: module.Composer })))
const Reader = lazy(() => import('./Stationery').then(module => ({ default: module.Reader })))

type View = 'Letters' | 'Drafts' | 'Settings'
type LetterFilter = 'All letters' | 'Received' | 'Sent' | 'Unopened'
const navIcons = { Letters: Icon.Letter, Drafts: Icon.Archive }
const sampleLetters: Memory[] = [
  { id: 'sample-1', senderId: 'sample-partner', type: 'letter', title: 'A little reminder', paper: 'paper_1', envelope: 'env_1', createdAt: Timestamp.fromMillis(Date.now() - 3600000), unlockAt: null, viewedAt: null },
  { id: 'sample-2', senderId: 'sample-partner', type: 'letter', title: 'My favorite kind of ordinary', paper: 'paper_3', envelope: 'env_4', createdAt: Timestamp.fromMillis(Date.now() - 86400000 * 2), unlockAt: null, viewedAt: Timestamp.now() },
  { id: 'sample-3', senderId: 'sample-partner', type: 'letter', title: 'For a rainy afternoon', paper: 'paper_4', envelope: 'env_5', createdAt: Timestamp.fromMillis(Date.now() - 86400000 * 5), unlockAt: null, viewedAt: Timestamp.now() },
]
function sampleContent(paper: string, envelope: string, greeting: string, text: string) {
  const content: LetterContentV2 = { version: 2, style: 'paper', greeting, envelope, pages: paginateText(text, getStationery(paper).profile).map((page, index) => ({ id: `sample-page-${index}`, text: page, items: [] })) }
  return JSON.stringify(content)
}
export const sampleBodies: Record<string, string> = {
  'sample-1': sampleContent('paper_1', 'env_1', 'Hey you,', 'Nothing big happened today. I made tea, watched the light move across the room, and thought of you.\n\nI just wanted you to have a little reminder that somewhere, in the middle of an ordinary day, you are someone’s favorite thought.\n\nMine, actually.\n\nTake care of yourself for me, okay?'),
  'sample-2': sampleContent('paper_3', 'env_4', 'Hey you,', 'I keep thinking about that afternoon when we had absolutely nothing planned. Just us, a long walk, and a conversation that went everywhere.\n\nMore of those, please. More little ordinary days with you.\n\nAlways,'),
  'sample-3': sampleContent('paper_4', 'env_5', 'For whenever the sky turns grey,', 'Put the kettle on. Find your softest sweater. Remember that you don’t have to do everything today.\n\nIf I were there, I’d sit beside you and listen to the rain.\n\nUntil then, here’s a little bit of me on paper. ♡'),
}
const date = (m: Memory) => m.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? 'Just now'

export default function Letters({ demo, onExitDemo }: { demo: boolean; onExitDemo: () => void }) {
  const { user, me, partner, pairing, pairingId, inviteUrl, signOut } = useSession()
  const owner = demo ? 'sample' : user!.uid
  const cloud = useMemories(demo ? null : user?.uid ?? null, 200, demo ? '' : pairingId ?? '')
  const [samples, setSamples] = useState(sampleLetters)
  const [view, setView] = useState<View>('Letters')
  const [drafts, setDrafts] = useState<Draft[]>([]), [draftsReady, setDraftsReady] = useState(false)
  const [writing, setWriting] = useState<Draft | null>(null), [reading, setReading] = useState<Memory | null>(null)
  const [filter, setFilter] = useState<LetterFilter>('All letters'), [search, setSearch] = useState('')
  const [sort, setSort] = useState('Newest first'), [notice, setNotice] = useState('')
  const [muted, setMute] = useState(isMuted())
  const [notifications, setNotifications] = useState(!!localStorage.getItem('twofold:token')), [pushBusy, setPushBusy] = useState(false)
  const [kept, setKept] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(`letters:kept:${owner}`) || '[]') } catch { return [] } })
  const [online, setOnline] = useState(navigator.onLine)
  const myName = demo ? 'You' : me?.name ?? 'You', theirName = demo ? 'Your person' : partner?.name ?? 'Your person'
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const all = (demo ? samples : cloud ?? []).filter(m => m.type === 'letter')
  const incoming = all.filter(m => m.senderId !== owner)
  const unread = incoming.filter(m => !m.viewedAt).length
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('open')
    const target = id ? all.find(memory => memory.id === id) : null
    if (!target) return
    setReading(target)
    const url = new URL(location.href); url.searchParams.delete('open'); history.replaceState({}, '', url)
  }, [cloud, samples])
  useEffect(() => { loadDrafts(owner).then(setDrafts).catch(() => setNotice('Drafts could not be loaded on this device.')).finally(() => setDraftsReady(true)) }, [owner])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(t) }, [notice])
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  useEffect(() => {
    if (demo) return
    let cleanup: (() => void) | undefined, active = true
    onForegroundPush((title, body) => { setNotice(`${title}. ${body}`); play('chime') }).then(fn => { if (active) cleanup = fn; else fn() }).catch(() => {})
    return () => { active = false; cleanup?.() }
  }, [demo])
  async function toggleNotifications() {
    if (demo || !user) return
    setPushBusy(true)
    try {
      if (notifications) { await disablePush(); setNotifications(false) }
      else {
        const result = await enablePush(user.uid)
        setNotifications(result === 'ready')
        setNotice(result === 'ready' ? 'We’ll let you know when a letter arrives.' : result === 'needs-install' ? 'Add Letters to your Home Screen first, then enable notifications.' : result === 'blocked' ? 'Notifications are blocked in your browser settings.' : result === 'misconfigured' ? 'Letter notifications still need their Web Push key configured.' : result === 'unsupported' ? 'This browser doesn’t support letter notifications.' : 'Allow notifications to hear when a letter arrives.')
      }
    } catch { setNotice('Notifications couldn’t be updated. Please try again.') } finally { setPushBusy(false) }
  }
  async function persistDraft(draft: Draft) {
    const next = [draft, ...drafts.filter(d => d.id !== draft.id)]
    await saveDrafts(owner, next); setDrafts(next)
  }
  async function removeDraft(id: string) {
    const next = drafts.filter(d => d.id !== id)
    await saveDrafts(owner, next); setDrafts(next)
  }
  async function deliver(draft: Draft) {
    const body = encodeLetter(draft)
    if (draft.unlockAt && new Date(draft.unlockAt).getTime() <= Date.now()) throw new Error('Choose a future opening time, or clear it to deliver now.')
    if (demo) {
      const id = crypto.randomUUID(); sampleBodies[id] = body
      setSamples(items => [{ id, senderId: owner, type: 'letter', title: draft.title || 'Just for you', paper: draft.paper, envelope: draft.envelope, unlockAt: draft.unlockAt ? Timestamp.fromDate(new Date(draft.unlockAt)) : null, createdAt: Timestamp.now(), viewedAt: null }, ...items])
    } else {
      if (!navigator.onLine) throw new Error('You’re offline. Your draft is safe here; send it when you’re connected.')
      await sendLetter({ senderId: owner, title: draft.title, body, paper: draft.paper, envelope: draft.envelope, unlockAt: draft.unlockAt ? new Date(draft.unlockAt) : null, pairingId: pairingId! })
    }
    try { await removeDraft(draft.id) } catch { setNotice('Letter sent. The draft could not be removed from this device.') }
  }
  function toggleKept(id: string) {
    const next = kept.includes(id) ? kept.filter(k => k !== id) : [...kept, id]
    try { localStorage.setItem(`letters:kept:${owner}`, JSON.stringify(next)); setKept(next) } catch { setNotice('This device couldn’t save your keepsake. Try freeing up some storage.') }
  }
  async function shareInvite() {
    if (!inviteUrl) return
    try {
      if (navigator.share) await navigator.share({ title: 'Our private letterbox', text: 'I made us a little place for letters.', url: inviteUrl })
      else { await navigator.clipboard.writeText(inviteUrl); setNotice('Invitation link copied. Send it to your person.') }
    } catch (error) { if ((error as DOMException).name !== 'AbortError') setNotice('Couldn’t share the invitation. Please try again.') }
  }
  const visible = useMemo(() => {
    return all.filter(m => (filter !== 'Received' || m.senderId !== owner) && (filter !== 'Sent' || m.senderId === owner) && (filter !== 'Unopened' || (m.senderId !== owner && !m.viewedAt)) && (m.title ?? '').toLowerCase().includes(search.toLowerCase())).sort((a,b) => (sort === 'Newest first' ? -1 : 1) * ((a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)))
  }, [all, owner, filter, search, sort])
  const sender = (m: Memory) => m.senderId === owner ? myName : demo ? theirName : pairing?.profiles?.[m.senderId]?.name ?? theirName
  const compose = () => { if (draftsReady) { setWriting(newDraft()); play('rustle') } }
  const readerClose = () => setReading(null)
  return <div className="letters-app">
    <aside className="sidebar"><button className="brand" onClick={() => { setView('Letters'); setFilter('All letters') }}>letters<span>♡</span></button><div className="brand-caption">a little closer, always</div>
      <button className="primary compose-button" onClick={compose} disabled={!draftsReady}><Icon.Nib />Write a letter</button>
      <nav aria-label="Main navigation">{(Object.keys(navIcons) as (keyof typeof navIcons)[]).map(label => { const NavIcon = navIcons[label]; return <button key={label} className={view === label ? 'selected' : ''} onClick={() => { setView(label); setFilter('All letters'); setSearch('') }} aria-current={view === label ? 'page' : undefined}><NavIcon /><span>{label}</span>{label === 'Letters' && unread > 0 && <b>{unread}</b>}{label === 'Drafts' && drafts.length > 0 && <b>{drafts.length}</b>}</button> })}</nav>
      <div className="sidebar-note"><span className="handwritten">Good letters,<br />better days.</span><DetailsAsset name="botanical" /></div>
      <div className="sidebar-bottom"><button onClick={() => setView('Settings')} className={view === 'Settings' ? 'selected' : ''}><Icon.Gear />Our little space</button><div className="profile"><span className="avatar">{myName.charAt(0)}</span><div>{myName}<small>{demo ? 'Sample letterbox' : `Just you & ${theirName}`}</small></div></div></div>
    </aside>
    <div className="main-area"><header className="topbar"><button className="mobile-masthead" onClick={() => setView('Letters')}><span className="brand">letters<span>♡</span></span><small>a little closer, always.</small></button><span className="pairing-label"><span className="tiny-heart">♡</span> {demo ? 'A peek inside · sample letters' : `Between ${myName} & ${theirName}`}</span><div>{demo && <button className="text-button" onClick={onExitDemo}>Sign in →</button>}<button className="sound-button" onClick={() => { setMute(!muted); setMuted(!muted); if (muted) play('rustle') }} aria-label={muted ? 'Turn paper sounds on' : 'Turn paper sounds off'} aria-pressed={!muted}>{muted ? '♪ Off' : '♪ On'}</button></div></header>
    {!online && <div className="offline-banner" role="status">You’re offline. You can keep writing and save a draft on this device.</div>}
    {view === 'Settings' ? <section className="settings-page"><span className="little-label">JUST US</span><h1>Our little space.</h1><p>Small things that make it feel like yours.</p><div className="settings-row"><div><h3>Paper sounds</h3><p>A little rustle when you write, a soft seal when you send.</p></div><button className="secondary" aria-pressed={!muted} onClick={() => { setMute(!muted); setMuted(!muted) }}>{muted ? 'Off' : 'On'}</button></div><div className="settings-row"><div><h3>Letters at your door</h3><p>{demo ? 'Sign in to receive notifications when a letter arrives.' : 'A gentle notification when something is waiting for you.'}</p></div><button className="secondary" disabled={demo || pushBusy} aria-pressed={notifications} onClick={toggleNotifications}>{pushBusy ? 'Updating…' : notifications ? 'Turn off' : 'Turn on'}</button></div><div className="settings-row"><div><h3>Your correspondence</h3><p>{demo ? 'You’re exploring sample letters. Nothing is sent to anyone.' : partner ? `${myName} & ${theirName}. This letterbox is private to the two of you.` : 'Your letterbox is ready. Invite one person to share it with you.'}</p></div>{!demo && !partner ? <button className="secondary" onClick={() => void shareInvite()}>Invite your person</button> : <Icon.Heart />}</div><div className="settings-row"><div><h3>Drafts & keepsakes</h3><p>Saved on this device, separately for your account. Sent letters live in your shared letterbox.</p></div></div><div className="settings-row"><div><h3>Take your letterbox with you</h3><p>On iPhone, use Share → Add to Home Screen. On desktop or Android, use your browser’s install option.</p></div></div><button className="secondary" onClick={() => demo ? onExitDemo() : signOut().catch(() => setNotice('Couldn’t sign out. Please try again.'))}>{demo ? 'Leave the sample letterbox' : 'Sign out'}</button></section> : <main className="desk">
      <section className="desk-heading"><div><span className="mobile-greeting handwritten">{greeting},</span><span className="little-label">{view === 'Drafts' ? 'WORDS TAKING THEIR TIME' : 'YOUR SHARED CORRESPONDENCE'}</span><h1>{view === 'Drafts' ? 'Thoughts still unfolding.' : 'Letters, both ways.'}</h1><p className="desk-subtitle">{view === 'Drafts' ? 'No rush. The paper will wait for you.' : `From you, from ${theirName}, all kept together.`}</p><span className="desk-rule" /><p className="desk-description">{view === 'Drafts' ? 'Return whenever the words feel ready.' : 'One quiet timeline for everything you send and receive.'}</p></div>{view === 'Letters' ? <><DetailsAsset name="smallProgress" className="mobile-hero-detail" /><DetailsAsset name="botanical" className="hero-botanical" /></> : <span className="postmark-text">TAKE<br /><span>♡</span><br />YOUR TIME</span>}</section>
      {view === 'Letters' && <section className="mailbox-feature"><div className="feature-copy"><span className="status-pill"><span />{unread ? `${unread} ${unread === 1 ? 'letter is' : 'letters are'} waiting for you` : 'Your shared trail of words'}</span><h2>{unread ? <>Someone’s thinking<br />of <em>you.</em></> : <>Send an ordinary moment<br /><em>their way.</em></>}</h2><p>{unread ? 'Make a little tea. Find a little quiet.\nThere’s something here with your name on it.' : 'Received and sent letters now live together, like a real bundle of correspondence.'}</p><button className="primary" onClick={() => { const letter = incoming.find(m => !m.viewedAt); if (letter) setReading(letter); else compose() }}>{unread ? 'Open the waiting letter' : 'Write a new letter'}<span>↗</span></button></div><button className="hero-envelope" onClick={() => { const letter = incoming.find(m => !m.viewedAt) ?? incoming[0]; if (letter) setReading(letter); else compose() }} aria-label={unread ? 'Open your waiting letter' : 'Start a new letter'}><EnvelopeSealed envelopeId={(incoming.find(m => !m.viewedAt) ?? incoming[0])?.envelope} state={unread ? 'sealed' : 'open'} /></button></section>}
      <section className="collection"><div className="collection-heading"><h2>{view === 'Drafts' ? 'Unfinished thoughts' : 'Our letters'} <span>{view === 'Drafts' ? drafts.length : visible.length}</span></h2>{view !== 'Drafts' && <label className="sort"><span className="sr-only">Sort letters</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option></select></label>}</div>
      {view !== 'Drafts' && <div className="collection-tools"><div className="filter-tabs">{(['All letters', 'Received', 'Sent', 'Unopened'] as LetterFilter[]).map(t => <button key={t} aria-pressed={filter === t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t}</button>)}</div><label className="search"><span aria-hidden>⌕</span><input aria-label="Find a letter" placeholder="Find a letter…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>}
      {!demo && cloud === null && view !== 'Drafts' ? <div className="loading-letters" role="status">Gathering your letters…</div> : view === 'Drafts' ? <div className="draft-grid">{drafts.map(d => <article className="draft-card" key={d.id}><button onClick={() => setWriting(d)}><span className="little-label">UNFINISHED LETTER</span><h3>{d.title || 'A thought in progress'}</h3><p className="handwritten">{draftPreview(d) || 'Your words go here…'}</p><small>Saved {new Date(d.updated).toLocaleDateString()}</small><span className="continue">Keep writing ↗</span></button><button className="delete-draft" aria-label={`Delete draft ${d.title || 'Untitled'}`} onClick={() => { if (confirm('Discard this draft? This cannot be undone.')) removeDraft(d.id).catch(() => setNotice('Couldn’t delete this draft. Please try again.')) }}><Icon.Trash /></button></article>)}</div> : <div className="envelope-grid">{visible.map((m) => { const sent = m.senderId === owner; return <article className={`letter-item ${sent ? 'is-sent' : 'is-received'}`} key={m.id}><span className="direction-label">{sent ? 'FROM YOU' : 'FOR YOU'}</span><button className="envelope-thumb" onClick={() => setReading(m)} aria-label={`Open ${m.title}, ${sent ? `sent to ${theirName}` : `from ${sender(m)}`}`}><EnvelopeSealed envelopeId={m.envelope}>{!sent && !m.viewedAt && <span className="unopened-dot" title="Unopened" />}</EnvelopeSealed></button><div className="letter-meta"><button onClick={() => setReading(m)}><h3>{m.title || 'Just for you'}</h3><p>{sent ? `To ${theirName}` : `From ${sender(m)}`} <span>· {date(m)}</span></p></button><button className={kept.includes(m.id) ? 'keep active' : 'keep'} onClick={() => toggleKept(m.id)} aria-label={kept.includes(m.id) ? 'Remove from keepsakes' : 'Save to keepsakes'} aria-pressed={kept.includes(m.id)}><Icon.Heart /></button></div><small className="letter-state">{sent ? isSealed(m) ? `Sealed until ${m.unlockAt?.toDate().toLocaleDateString()}` : 'Sent with love' : isSealed(m) ? `Opens ${m.unlockAt?.toDate().toLocaleDateString()}` : !m.viewedAt ? 'Waiting to be opened' : 'Opened & treasured'}</small></article> })}</div>}
      {(view === 'Drafts' ? draftsReady && !drafts.length : (demo || cloud !== null) && !visible.length) && <div className="empty-state"><div className="empty-art"><DetailsAsset name="miniEnvelope" /><DetailsAsset name="cat" /></div><h3>{search ? 'No letters found.' : 'No letters yet.'}</h3><p>{search ? 'Try a different title or filter.' : 'Be the first to send a little love.'}</p><button className="primary" onClick={search ? () => { setSearch(''); setFilter('All letters') } : compose}>{search ? 'Clear search' : <><Icon.Nib />Write a letter</>}</button></div>}
      </section><aside className="writing-prompt"><span>✧</span><div><span>A LITTLE INSPIRATION</span><p>What’s one small thing about them that makes your day better?</p></div><button onClick={compose} aria-label="Write a letter inspired by this prompt">↗</button></aside><footer className="desk-footer">No rush. No read-reply-repeat. Just a little more us. <span>♡</span><button className="footer-settings" onClick={() => setView('Settings')} aria-label="Settings"><Icon.Gear /> Our little space</button></footer>
    </main>}
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view === 'Letters' ? 'selected' : ''} onClick={() => setView('Letters')}><Icon.Letter /><span>Letters</span></button><button onClick={compose} disabled={!draftsReady}><Icon.Nib /><span>Write</span></button><button className={view === 'Drafts' ? 'selected' : ''} onClick={() => setView('Drafts')}><Icon.Archive /><span>Drafts</span></button><button className={view === 'Settings' ? 'selected' : ''} onClick={() => setView('Settings')}><Icon.Gear /><span>Settings</span></button></nav>
    {writing && <Suspense fallback={<div className="workspace-overlay ritual-loading" role="status">Preparing your paper…</div>}><Composer initial={writing} recipient={theirName} sender={myName} demo={demo} onSave={persistDraft} onSend={deliver} onClose={() => setWriting(null)} onSent={() => { setWriting(null); setView('Letters'); setFilter('Sent'); setNotice(demo ? 'Sample letter sent. It is now in your shared letters.' : 'Your letter is on its way. A little closer, always.') }} /></Suspense>}
    {reading && <Suspense fallback={<div className="workspace-overlay ritual-loading" role="status">Bringing your letter closer…</div>}><Reader memory={reading} sender={sender(reading)} demo={demo} sampleBody={sampleBodies[reading.id]} kept={kept.includes(reading.id)} onKeep={() => toggleKept(reading.id)} onClose={readerClose} onOpened={() => { if (demo) setSamples(items => items.map(m => m.id === reading.id ? { ...m, viewedAt: Timestamp.now() } : m)) }} onReply={() => { readerClose(); compose() }} /></Suspense>}
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
  </div>
}

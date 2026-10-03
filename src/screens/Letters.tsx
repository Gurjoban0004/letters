import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { IOSTabBar, type IOSTabBarItem } from '@noorddev/vlak-react/components/ios-tab-bar'
import { useSession } from '../lib/session'
import { useMemories, isSealed, markReceived, sendLetter, type Memory } from '../lib/db'
import { loadDrafts, saveDrafts, newDraft, encodeLetter, draftPreview, getStationery, paginateText, deliveryState, type Draft, type LetterContentV2 } from '../lib/letters'
import { isMuted, setMuted, play } from '../lib/sound'
import { Icon } from '../components/ui'
import { EnvelopeSealed } from '../components/EnvelopeSealed'
import { DetailsAsset } from '../components/DetailsAsset'
import { enablePush, disablePush, onForegroundPush, pushEnabledFor, shouldRestorePush } from '../lib/push'
import { dispatchLetterNotification, retryPendingLetterNotifications } from '../lib/notify'
import { firstName } from '../lib/names'
import { navigateView, transitionView } from '../lib/viewTransitions'
import { loadDemoBouquets, markBouquetReceived, useBouquets } from '../bouquet/bouquetDb'
import { createDraftStorage, type BouquetDraftV1, type PublishedBouquetV1 } from '../bouquet/studioModel'
import bouquetAssets from '../bouquet/assets/manifest.json'
const loadStationery = () => import('./Stationery')
const loadBouquet = () => import('../bouquet/BouquetApp')
const Composer = lazy(() => loadStationery().then(module => ({ default: module.Composer })))
const Reader = lazy(() => loadStationery().then(module => ({ default: module.Reader })))
const BouquetHomePanel = lazy(() => loadBouquet().then(module => ({ default: module.BouquetHomePanel })))
const BouquetMiniature = lazy(() => loadBouquet().then(module => ({ default: module.BouquetMiniature })))

type View = 'Letters' | 'Bouquets' | 'Drafts' | 'Settings'
type LetterFilter = 'All letters' | 'Received' | 'Sent' | 'Unopened'
const navIcons = { Letters: Icon.Letter, Bouquets: Icon.Flower, Drafts: Icon.Archive }
const bouquetDraftStorage = createDraftStorage(
  localStorage,
  new Set(bouquetAssets.assets.map(asset => asset.id)),
  new Set(bouquetAssets.wraps.map(asset => asset.id)),
  new Set(bouquetAssets.ribbons.map(asset => asset.id)),
)
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
const bouquetMillis = (value: unknown) => typeof value === 'number' ? value : value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function' ? value.toMillis() : 0

export default function Letters({ demo, onExitDemo }: { demo: boolean; onExitDemo: () => void }) {
  const { user, me, partner, pairing, pairingId, inviteUrl, signOut } = useSession()
  const owner = demo ? 'sample' : user!.uid
  const cloud = useMemories(demo ? null : user?.uid ?? null, 200, demo ? '' : pairingId ?? '')
  const { bouquets: bouquetCloud } = useBouquets(demo ? null : user?.uid ?? null, demo ? null : pairingId)
  const [samples, setSamples] = useState(sampleLetters)
  const [view, setView] = useState<View>(() => {
    const requested = new URLSearchParams(location.search).get('view')
    if (requested === 'Bouquets' || location.pathname === '/bloom') return 'Bouquets'
    if (requested === 'Drafts' || requested === 'Settings') return requested
    return 'Letters'
  })
  const [drafts, setDrafts] = useState<Draft[]>([]), [draftsReady, setDraftsReady] = useState(false)
  const [bouquetDrafts, setBouquetDrafts] = useState<BouquetDraftV1[]>(() => bouquetDraftStorage.list(owner))
  const [writing, setWriting] = useState<Draft | null>(null), [reading, setReading] = useState<Memory | null>(null)
  const [filter, setFilter] = useState<LetterFilter>('All letters'), [search, setSearch] = useState('')
  const [sort, setSort] = useState('Newest first'), [notice, setNotice] = useState('')
  const [muted, setMute] = useState(isMuted())
  const [notifications, setNotifications] = useState(() => !demo && pushEnabledFor(user!.uid)), [pushBusy, setPushBusy] = useState(false)
  const [kept, setKept] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(`letters:kept:${owner}`) || '[]') } catch { return [] } })
  const [online, setOnline] = useState(navigator.onLine)
  const receiptAttempts = useRef(new Set<string>())
  const deliveryNotice = useRef('')
  const myName = demo ? 'You' : firstName(me?.name) || 'You', theirName = demo ? 'Your person' : firstName(partner?.name) || 'Your person'
  const connected = demo || Boolean(partner)
  const bouquetOwner = demo ? 'sample-self' : owner
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const all = (demo ? samples : cloud ?? []).filter(m => m.type === 'letter')
  const bouquets = demo ? loadDemoBouquets() : bouquetCloud ?? []
  const incoming = all.filter(m => m.senderId !== owner)
  const incomingBouquets = bouquets.filter(item => item.recipientId === owner)
  const unread = incoming.filter(m => !m.viewedAt).length + incomingBouquets.filter(item => !item.viewedAt).length
  useEffect(() => { void loadStationery(); void loadBouquet() }, [])
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('open')
    const target = id ? all.find(memory => memory.id === id) : null
    if (!target) return
    setReading(target)
    const url = new URL(location.href); url.searchParams.delete('open'); history.replaceState({}, '', url)
  }, [cloud, samples])
  useEffect(() => { loadDrafts(owner).then(setDrafts).catch(() => setNotice('Drafts could not be loaded on this device.')).finally(() => setDraftsReady(true)) }, [owner])
  useEffect(() => { setBouquetDrafts(bouquetDraftStorage.list(owner)) }, [owner, view])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(t) }, [notice])
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  useEffect(() => {
    if (demo || !user) return
    const retry = () => void retryPendingLetterNotifications(user.uid)
    retry()
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [demo, user?.uid])
  useEffect(() => {
    if (demo || !user || cloud === null) return
    for (const memory of cloud) {
      if (memory.type !== 'letter' || memory.senderId === user.uid || memory.receivedAt || receiptAttempts.current.has(memory.id)) continue
      receiptAttempts.current.add(memory.id)
      void markReceived(memory.id).catch(() => receiptAttempts.current.delete(memory.id))
    }
  }, [cloud, demo, user?.uid])
  useEffect(() => {
    if (demo || !user) return
    for (const bouquet of incomingBouquets) {
      if (bouquet.receivedAt || receiptAttempts.current.has(`bouquet:${bouquet.id}`)) continue
      receiptAttempts.current.add(`bouquet:${bouquet.id}`)
      void markBouquetReceived(bouquet.id).catch(() => receiptAttempts.current.delete(`bouquet:${bouquet.id}`))
    }
  }, [demo, incomingBouquets.map(item => `${item.id}:${Boolean(item.receivedAt)}`).join('|'), user?.uid])
  useEffect(() => {
    if (demo) return
    let cleanup: (() => void) | undefined, active = true
    onForegroundPush((title, body) => { setNotice(`${title}. ${body}`); play('chime') }).then(fn => { if (active) cleanup = fn; else fn() }).catch(() => {})
    return () => { active = false; cleanup?.() }
  }, [demo])
  useEffect(() => {
    if (demo || !user || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !shouldRestorePush(user.uid)) return
    enablePush(user.uid).then(status => setNotifications(status === 'ready')).catch(() => setNotifications(false))
  }, [demo, user?.uid])
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
      setSamples(items => [{ id, senderId: owner, type: 'letter', title: draft.title || 'Just for you', paper: draft.paper, envelope: draft.envelope, unlockAt: draft.unlockAt ? Timestamp.fromDate(new Date(draft.unlockAt)) : null, createdAt: Timestamp.now(), receivedAt: null, viewedAt: null }, ...items])
    } else {
      if (!partner) throw new Error('Invite your person before sending. Your draft is safe here.')
      if (!navigator.onLine) throw new Error('You’re offline. Your draft is safe here; send it when you’re connected.')
      const memoryId = await sendLetter({ senderId: owner, title: draft.title, body, paper: draft.paper, envelope: draft.envelope, unlockAt: draft.unlockAt ? new Date(draft.unlockAt) : null, pairingId: pairingId!, clientMessageId: draft.id })
      deliveryNotice.current = `Your letter is safely in ${theirName}’s letterbox.`
      void dispatchLetterNotification(memoryId).then(result => {
        if (!result.sent && result.reason === 'no-devices') deliveryNotice.current = `Letter delivered. ${theirName} hasn’t turned on notifications yet, but it is waiting in their letterbox.`
        else if (!result.sent && result.failed) deliveryNotice.current = `Letter delivered. The notification didn’t go through, but it is waiting safely for ${theirName}.`
      }).catch(() => {
        deliveryNotice.current = `Letter delivered. The notification didn’t go through, but it is waiting safely for ${theirName}.`
      })
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
  async function copyInvite() {
    if (!inviteUrl) return
    try { await navigator.clipboard.writeText(inviteUrl); setNotice('Invitation link copied. Send it to your person.') }
    catch { setNotice('Couldn’t copy the invitation. Try the share button instead.') }
  }
  const visible = useMemo(() => {
    return all.filter(m => (filter !== 'Received' || m.senderId !== owner) && (filter !== 'Sent' || m.senderId === owner) && (filter !== 'Unopened' || (m.senderId !== owner && !m.viewedAt)) && (m.title ?? '').toLowerCase().includes(search.toLowerCase())).sort((a,b) => (sort === 'Newest first' ? -1 : 1) * ((a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)))
  }, [all, owner, filter, search, sort])
  const visibleBouquets = useMemo(() => {
    return bouquets.filter(item =>
      (filter !== 'Received' || item.recipientId === bouquetOwner) &&
      (filter !== 'Sent' || item.senderId === bouquetOwner) &&
      (filter !== 'Unopened' || (item.recipientId === bouquetOwner && !item.viewedAt)) &&
      item.title.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => (sort === 'Newest first' ? -1 : 1) * (bouquetMillis(a.createdAt) - bouquetMillis(b.createdAt)))
  }, [bouquetOwner, bouquets, filter, search, sort])
  const bouquetDate = (bouquet: PublishedBouquetV1) => {
    const millis = bouquetMillis(bouquet.createdAt) || Date.now()
    return new Date(millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  const sender = (m: Memory) => m.senderId === owner ? myName : demo ? theirName : firstName(pairing?.profiles?.[m.senderId]?.name) || theirName
  const letterStatus = (memory: Memory) => {
    if (isSealed(memory)) return { label: 'Sealed', date: memory.unlockAt?.toDate() ?? memory.createdAt?.toDate() }
    if (memory.senderId !== owner) return { label: memory.viewedAt ? 'Opened & treasured' : 'Unopened', date: (memory.viewedAt ?? memory.createdAt)?.toDate() }
    const state = deliveryState(memory.receivedAt, memory.viewedAt)
    return {
      label: state === 'opened' ? 'Opened' : state === 'delivered' ? 'Delivered' : 'Sent',
      date: (state === 'opened' ? memory.viewedAt : state === 'delivered' ? memory.receivedAt : memory.createdAt)?.toDate(),
    }
  }
  const statusDate = (value?: Date) => value?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) ?? 'Just now'
  const changeView = (next: View) => {
    const order: View[] = ['Letters', 'Bouquets', 'Drafts', 'Settings']
    const direction = order.indexOf(next) === order.indexOf(view) ? 'fade' : order.indexOf(next) > order.indexOf(view) ? 'forward' : 'back'
    void transitionView(() => { setView(next); setFilter('All letters'); setSearch('') }, direction)
  }
  const openWriter = (draft: Draft) => { void transitionView(() => setWriting(draft), 'forward'); play('rustle') }
  const openReader = (memory: Memory) => { void transitionView(() => setReading(memory), 'forward') }
  const compose = () => {
    if (!connected) { changeView('Letters'); setNotice('Invite your person first, then every letter will have a real destination.'); return }
    if (draftsReady) openWriter(newDraft())
  }
  const openBouquetRoute = (path: string) => { void navigateView(`${path}${demo ? `${path.includes('?') ? '&' : '?'}demo=1` : ''}`, 'forward') }
  const readerClose = () => { void transitionView(() => setReading(null), 'back') }
  const mobileTabs: IOSTabBarItem[] = [
    { id: 'Letters', label: 'Letters', icon: <span className="tab-icon-wrap"><Icon.Letter />{unread > 0 && <b className="tab-badge">{Math.min(unread, 9)}</b>}</span> },
    { id: 'Bouquets', label: 'Bouquets', icon: <Icon.Flower /> },
    { id: 'Drafts', label: 'Drafts', icon: <span className="tab-icon-wrap"><Icon.Archive />{drafts.length + bouquetDrafts.length > 0 && <b className="tab-badge">{Math.min(drafts.length + bouquetDrafts.length, 9)}</b>}</span>, disabled: !connected },
    { id: 'Settings', label: 'Settings', icon: <Icon.Gear /> },
  ]
  const activeTab = view === 'Letters' ? 0 : view === 'Bouquets' ? 1 : view === 'Drafts' ? 2 : 3
  return <div className={`letters-app${writing || reading ? ' has-fullscreen-view' : ''}`}>
    <aside className="sidebar"><button className="brand" onClick={() => changeView('Letters')}>letters<span>♡</span></button><div className="brand-caption">a little closer, always</div>
      <button className="primary compose-button" onClick={connected ? compose : () => void shareInvite()} disabled={connected && !draftsReady} aria-busy={connected && !draftsReady}>{connected ? <><Icon.Nib />{draftsReady ? 'Write a letter' : 'Preparing paper…'}</> : <><Icon.Letter />Invite your person</>}</button>
      <nav aria-label="Main navigation">{(Object.keys(navIcons) as (keyof typeof navIcons)[]).map(label => { const NavIcon = navIcons[label]; return <button key={label} className={view === label ? 'selected' : ''} disabled={!connected && label === 'Drafts'} onClick={() => changeView(label)} aria-current={view === label ? 'page' : undefined}><NavIcon /><span>{label}</span>{label === 'Letters' && unread > 0 && <b>{unread}</b>}{label === 'Drafts' && drafts.length + bouquetDrafts.length > 0 && <b>{drafts.length + bouquetDrafts.length}</b>}</button> })}</nav>
      <div className="sidebar-note"><span className="handwritten">Good letters,<br />better days.</span><DetailsAsset name="forgetMeNotSprig" /></div>
      <div className="sidebar-bottom"><button onClick={() => changeView('Settings')} className={view === 'Settings' ? 'selected' : ''}><Icon.Gear />Our little space</button><div className="profile"><span className="avatar">{myName.charAt(0)}</span><div>{myName}<small>{demo ? 'Sample letterbox' : partner ? `Just you & ${theirName}` : 'Waiting for your person'}</small></div></div></div>
    </aside>
    <div className="main-area"><header className="topbar"><button className="mobile-masthead" onClick={() => changeView('Letters')}><span className="brand">letters<span>♡</span></span><small>a little closer, always.</small></button><span className="pairing-label"><span className="tiny-heart">♡</span> {demo ? 'A peek inside · sample letters' : partner ? `Between ${myName} & ${theirName}` : `${myName}’s new letterbox`}</span><div>{demo && <button className="text-button" onClick={onExitDemo}>Sign in →</button>}<button className="sound-button" onClick={() => { setMute(!muted); setMuted(!muted); if (muted) play('rustle') }} aria-label={muted ? 'Turn paper sounds on' : 'Turn paper sounds off'} aria-pressed={!muted}>{muted ? '♪ Off' : '♪ On'}</button></div></header>
    {!online && <div className="offline-banner" role="status">You’re offline. You can keep writing and save a draft on this device.</div>}
    {!demo && !partner && view !== 'Settings' ? <PairingGate name={myName} inviteUrl={inviteUrl} onShare={shareInvite} onCopy={copyInvite} /> : view === 'Settings' ? <section className="settings-page"><span className="little-label">JUST US</span><h1>Our little space.</h1><p>Small things that make it feel like yours.</p><div className="settings-row"><div><h3>Paper sounds</h3><p>A little rustle when you write, a soft seal when you send.</p></div><button className="secondary" aria-pressed={!muted} onClick={() => { setMute(!muted); setMuted(!muted) }}>{muted ? 'Off' : 'On'}</button></div><div className="settings-row"><div><h3>Letters at your door</h3><p>{demo ? 'Sign in to receive notifications when a letter arrives.' : 'A gentle notification when something is waiting for you.'}</p></div><button className="secondary" disabled={demo || pushBusy} aria-pressed={notifications} onClick={toggleNotifications}>{pushBusy ? 'Updating…' : notifications ? 'Turn off' : 'Turn on'}</button></div><div className="settings-row"><div><h3>Your correspondence</h3><p>{demo ? 'You’re exploring sample letters. Nothing is sent to anyone.' : partner ? `${myName} & ${theirName}. This letterbox is private to the two of you.` : 'Your letterbox is ready. Invite one person to share it with you.'}</p></div>{!demo && !partner ? <button className="secondary" onClick={() => void shareInvite()}>Invite your person</button> : <Icon.Heart />}</div><div className="settings-row"><div><h3>Drafts & keepsakes</h3><p>Saved on this device, separately for your account. Sent letters and bouquets live together in your shared letterbox.</p></div></div><div className="settings-row"><div><h3>Take your letterbox with you</h3><p>On iPhone, use Share → Add to Home Screen. On desktop or Android, use your browser’s install option.</p></div></div><button className="secondary" onClick={() => demo ? onExitDemo() : signOut().catch(() => setNotice('Couldn’t sign out. Please try again.'))}>{demo ? 'Leave the sample letterbox' : 'Sign out'}</button></section> : view === 'Bouquets' ? <main className="bouquet-tab"><Suspense fallback={<div className="loading-letters" role="status">Gathering your flowers…</div>}><div className="bloom-app bloom-app--embedded"><BouquetHomePanel navigate={openBouquetRoute} /></div></Suspense></main> : <main className={`desk desk-${view.toLowerCase()}`}>
      <section className="desk-heading"><div><span className="mobile-greeting handwritten">{greeting}, {myName}.</span><span className="little-label">{view === 'Drafts' ? 'WORDS TAKING THEIR TIME' : 'YOUR SHARED CORRESPONDENCE'}</span><h1><span className="desktop-heading-copy">{view === 'Drafts' ? 'Thoughts still unfolding.' : 'Letters, both ways.'}</span><span className="mobile-heading-copy">{view === 'Drafts' ? 'Your drafts.' : 'Your letterbox.'}</span></h1><p className="mobile-desk-subtitle">{view === 'Drafts' ? 'Pick up where you left off.' : <>Small moments, written down,<br />make a kinder day.</>}</p><p className="desk-subtitle">{view === 'Drafts' ? 'No rush. The paper will wait for you.' : `From you, from ${theirName}, all kept together.`}</p><span className="desk-rule" /><p className="desk-description">{view === 'Drafts' ? 'Return whenever the words feel ready.' : 'One quiet timeline for everything you send and receive.'}</p></div>{view === 'Letters' ? <><DetailsAsset name="daisyPair" className="mobile-hero-detail" /><DetailsAsset name="cloudLovebirds" className="hero-botanical" /></> : <span className="postmark-text">TAKE<br /><span>♡</span><br />YOUR TIME</span>}</section>
      {view === 'Letters' && !demo && !notifications && <section className="notification-nudge"><span className="notification-nudge-icon"><Icon.Bell /></span><div><strong>Know when {theirName} writes.</strong><p>Turn on a gentle notification when a new letter arrives.</p></div><button className="secondary" disabled={pushBusy} onClick={toggleNotifications}>{pushBusy ? 'Setting up…' : 'Turn on'}</button></section>}
      {view === 'Letters' && <section className="mobile-letter-prompt"><div className="mobile-prompt-copy"><span className="mobile-prompt-note">A MOMENT FOR THEM</span><h2>Write them a<br />little something.</h2><p>A few words—or a tiny garden—can make an ordinary day.</p><div className="mobile-prompt-actions"><button onClick={compose} disabled={!draftsReady}>Write <span aria-hidden>→</span></button><button className="mobile-bouquet-button" onClick={() => changeView('Bouquets')}><Icon.Flower /><span>Bouquet</span></button></div></div><div className="mobile-prompt-art" aria-hidden="true"><DetailsAsset name="cloudLovebirds" className="prompt-birds" /><DetailsAsset name="forgetMeNotSprig" className="prompt-flowers" /><DetailsAsset name="roseGoldStar" className="prompt-charm" /></div></section>}
      {view === 'Letters' && <section className="mailbox-feature"><div className="feature-copy"><span className="status-pill"><span />{unread ? `${unread} ${unread === 1 ? 'keepsake is' : 'keepsakes are'} waiting for you` : 'Your shared trail of words'}</span><h2>{unread ? <>Someone’s thinking<br />of <em>you.</em></> : <>Send an ordinary moment<br /><em>their way.</em></>}</h2><p>{unread ? 'Make a little tea. Find a little quiet.\nThere’s something here with your name on it.' : 'Received and sent keepsakes live together, like a real bundle of correspondence.'}</p><button className="primary" onClick={() => { const letter = incoming.find(m => !m.viewedAt); if (letter) openReader(letter); else compose() }}>{unread ? 'Open the waiting letter' : 'Write a new letter'}<span>↗</span></button></div><button className="hero-envelope" onClick={() => { const letter = incoming.find(m => !m.viewedAt) ?? incoming[0]; if (letter) openReader(letter); else compose() }} aria-label={unread ? 'Open your waiting letter' : 'Start a new letter'}><EnvelopeSealed envelopeId={(incoming.find(m => !m.viewedAt) ?? incoming[0])?.envelope} state={unread ? 'sealed' : 'open'} /></button></section>}
      <section className="collection"><div className="collection-heading"><h2>{view === 'Drafts' ? 'Unfinished thoughts' : 'On your desk'}</h2>{view === 'Drafts' ? <span className="draft-total">{drafts.length + bouquetDrafts.length}</span> : <label className="sort"><span className="desk-count">{visible.length + visibleBouquets.length}</span><span className="sr-only">Sort keepsakes</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option></select></label>}</div>
      {view !== 'Drafts' && <div className="collection-tools"><div className="filter-tabs">{(['All letters', 'Received', 'Sent', 'Unopened'] as LetterFilter[]).map(t => <button key={t} aria-pressed={filter === t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t === 'All letters' ? 'All' : t}</button>)}</div></div>}
      {!demo && (cloud === null || bouquetCloud === null) && view !== 'Drafts' ? <div className="loading-letters" role="status">Gathering your keepsakes…</div> : view === 'Drafts' ? <div className="draft-grid">{drafts.map(d => <article className="draft-card" key={d.id}><button onClick={() => openWriter(d)}><span className="little-label">UNFINISHED LETTER</span><h3>{d.title || 'A thought in progress'}</h3><p className="handwritten">{draftPreview(d) || 'Your words go here…'}</p><small>Saved {new Date(d.updated).toLocaleDateString()}</small><span className="continue">Keep writing ↗</span></button><button className="delete-draft" aria-label={`Delete draft ${d.title || 'Untitled'}`} onClick={() => { if (confirm('Discard this draft? This cannot be undone.')) removeDraft(d.id).catch(() => setNotice('Couldn’t delete this draft. Please try again.')) }}><Icon.Trash /></button></article>)}{bouquetDrafts.map(draft => <article className="draft-card bouquet-draft-card" key={`bouquet-${draft.id}`}><button onClick={() => openBouquetRoute(`/bloom/create?draft=${encodeURIComponent(draft.id)}`)}><span className="little-label">UNFINISHED BOUQUET</span><h3>{draft.title || (draft.note.to ? `For ${draft.note.to}` : 'A garden in progress')}</h3><p className="handwritten">{draft.items.length} stems gathered</p><small>Saved {new Date(draft.updatedAt).toLocaleDateString()}</small><span className="continue">Keep arranging ↗</span></button><button className="delete-draft" aria-label={`Delete bouquet draft ${draft.title || 'Untitled'}`} onClick={() => { if (confirm('Discard this bouquet draft? This cannot be undone.')) { bouquetDraftStorage.remove(owner, draft.id); setBouquetDrafts(bouquetDraftStorage.list(owner)) } }}><Icon.Trash /></button></article>)}</div> : <div className="envelope-grid">{visible.map((memory) => { const sent = memory.senderId === owner; const status = letterStatus(memory); return <article className={`letter-item ${sent ? 'is-sent' : 'is-received'}`} key={memory.id}><button className="letter-card-main" onClick={() => openReader(memory)} aria-label={`Open ${memory.title}, ${sent ? `sent to ${theirName}` : `from ${sender(memory)}`}`}><span className="direction-label">{sent ? 'From you' : 'For you'}</span><span className="envelope-thumb"><EnvelopeSealed envelopeId={memory.envelope} /></span><span className="letter-card-content"><strong className="message-preview">{memory.title || 'Just for you'}</strong><span className="correspondent">{sent ? `To ${theirName}` : `From ${sender(memory)}`}</span><span className="letter-status"><Icon.Letter /><span>{status.label}</span><i>·</i><time>{statusDate(status.date)}</time></span></span></button></article> })}{visibleBouquets.map(bouquet => { const sent = bouquet.senderId === bouquetOwner; const label = sent ? bouquet.viewedAt ? 'Opened' : bouquet.receivedAt ? 'Delivered' : 'Sent' : bouquet.viewedAt ? 'Opened & treasured' : 'Unopened'; return <article className={`letter-item bouquet-letter-item ${sent ? 'is-sent' : 'is-received'}`} key={`bouquet-${bouquet.id}`}><button className="letter-card-main" onClick={() => openBouquetRoute(`/bloom/bouquet/${encodeURIComponent(bouquet.id)}`)} aria-label={`Open bouquet ${bouquet.title}`}><span className="direction-label">{sent ? 'From you' : 'For you'}</span><span className="bouquet-thumb"><Suspense fallback={<span className="bouquet-thumb-loading" />}><BouquetMiniature composition={bouquet.composition} /></Suspense></span><span className="letter-card-content"><strong className="message-preview">{bouquet.title || 'A bouquet for you'}</strong><span className="correspondent">{sent ? `To ${theirName}` : `From ${theirName}`}</span><span className="letter-status"><Icon.Letter /><span>{label}</span><i>·</i><time>{bouquetDate(bouquet)}</time></span></span></button></article> })}</div>}
      {(view === 'Drafts' ? draftsReady && !drafts.length && !bouquetDrafts.length : (demo || (cloud !== null && bouquetCloud !== null)) && !visible.length && !visibleBouquets.length) && <div className="empty-state"><div className="empty-art"><DetailsAsset name="blueLoveMailbox" /><DetailsAsset name="daisyPair" /></div><h3>{search ? 'Nothing found.' : 'Nothing here yet.'}</h3><p>{search ? 'Try a different title or filter.' : 'Be the first to send a little love.'}</p><button className="primary" onClick={search ? () => { setSearch(''); setFilter('All letters') } : compose}>{search ? 'Clear search' : <><Icon.Nib />Write a letter</>}</button></div>}
      </section><aside className="writing-prompt"><span>✧</span><div><span>A LITTLE INSPIRATION</span><p>What’s one small thing about them that makes your day better?</p></div><button onClick={compose} aria-label="Write a letter inspired by this prompt">↗</button></aside><footer className="desk-footer">No rush. No read-reply-repeat. Just a little more us. <span>♡</span><button className="footer-settings" onClick={() => changeView('Settings')} aria-label="Settings"><Icon.Gear /> Our little space</button></footer>
    </main>}
    </div>
    <IOSTabBar className="mobile-nav" data-active-index={activeTab} items={mobileTabs} value={view} label="App navigation" onValueChange={next => changeView(next as View)} />
    {writing && <Suspense fallback={<div className="workspace-overlay ritual-loading" role="status">Preparing your paper…</div>}><Composer initial={writing} recipient={theirName} sender={myName} demo={demo} onSave={persistDraft} onSend={deliver} onClose={() => { void transitionView(() => setWriting(null), 'back') }} onSent={() => { void transitionView(() => { setWriting(null); setView('Letters'); setFilter('Sent'); setNotice(demo ? 'Sample letter sent. It is now in your shared letters.' : deliveryNotice.current || `Your letter is safely in ${theirName}’s letterbox.`); deliveryNotice.current = '' }, 'back') }} /></Suspense>}
    {reading && <Suspense fallback={<div className="workspace-overlay ritual-loading" role="status">Bringing your letter closer…</div>}><Reader memory={reading} sender={sender(reading)} demo={demo} sampleBody={sampleBodies[reading.id]} kept={kept.includes(reading.id)} onKeep={() => toggleKept(reading.id)} onClose={readerClose} onOpened={() => { if (demo) setSamples(items => items.map(m => m.id === reading.id ? { ...m, viewedAt: Timestamp.now() } : m)) }} onReply={() => { void transitionView(() => { setReading(null); setWriting(newDraft()) }, 'forward'); play('rustle') }} /></Suspense>}
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
  </div>
}

function PairingGate({ name, inviteUrl, onShare, onCopy }: {
  name: string
  inviteUrl: string | null
  onShare: () => Promise<void>
  onCopy: () => Promise<void>
}) {
  return <main className="pairing-gate">
    <section className="pairing-gate-copy">
      <h1>Your letterbox is ready for two.</h1>
      <p>Invite one person before you begin. When they join, their real name will appear beside every letter and this becomes a private space shared only by the two of you.</p>
      <div className="pairing-people" aria-label={`${name} is waiting for their person to join`}>
        <div className="pairing-person is-here"><span>{name.charAt(0)}</span><strong>{name}</strong><small>Ready</small></div>
        <span className="pairing-thread" aria-hidden><i /><b>♡</b><i /></span>
        <div className="pairing-person is-waiting"><span>?</span><strong>Your person</strong><small>Waiting to join</small></div>
      </div>
      <div className="invite-actions">
        <button className="primary" onClick={() => void onShare()} disabled={!inviteUrl}><Icon.Letter />Share invitation</button>
        <button className="secondary" onClick={() => void onCopy()} disabled={!inviteUrl}>Copy link</button>
      </div>
      <div className="invite-status" role="status"><span />Waiting for them to accept. This page updates as soon as they join.</div>
    </section>
    <aside className="pairing-gate-art" aria-hidden>
      <EnvelopeSealed envelopeId="env_1" state="open" />
      <DetailsAsset name="cloudLovebirds" />
      <p className="handwritten">One little space.<br />Two people. ♡</p>
    </aside>
  </main>
}

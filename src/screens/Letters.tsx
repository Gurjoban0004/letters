import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
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
import { navigateView, subscribeToViewNavigation, transitionView } from '../lib/viewTransitions'
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
function requestedView(): View {
  const requested = new URLSearchParams(location.search).get('view')
  if (requested === 'Bouquets' || location.pathname === '/bloom') return 'Bouquets'
  return requested === 'Drafts' || requested === 'Settings' ? requested : 'Letters'
}
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
  const { bouquets: bouquetCloud, error: bouquetError } = useBouquets(demo ? null : user?.uid ?? null, demo ? null : pairingId)
  const [samples, setSamples] = useState(sampleLetters)
  const [view, setView] = useState<View>(requestedView)
  const mainArea = useRef<HTMLDivElement>(null)
  const tabScroll = useRef<Partial<Record<View, number>>>({})
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
  const all = (demo ? samples : cloud ?? []).filter(m => m.type === 'letter')
  const bouquets = demo ? loadDemoBouquets() : bouquetCloud ?? []
  const incoming = all.filter(m => m.senderId !== owner)
  const incomingBouquets = bouquets.filter(item => item.recipientId === owner)
  const unread = incoming.filter(m => !m.viewedAt).length + incomingBouquets.filter(item => !item.viewedAt).length
  useEffect(() => { void loadStationery(); void loadBouquet() }, [])
  useEffect(() => subscribeToViewNavigation(() => setView(requestedView())), [])
  useLayoutEffect(() => {
    const area = mainArea.current
    if (!area) return
    area.scrollTop = tabScroll.current[view] ?? 0
  }, [view])
  useEffect(() => {
    const background = document.querySelectorAll<HTMLElement>('.letters-app > .sidebar, .letters-app > .main-area, .letters-app > .mobile-nav')
    background.forEach(element => { element.inert = Boolean(writing || reading) })
    return () => background.forEach(element => { element.inert = false })
  }, [Boolean(writing || reading)])
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('open')
    const target = id ? all.find(memory => memory.id === id) : null
    if (!target) return
    setReading(target)
    const url = new URL(location.href); url.searchParams.delete('open'); history.replaceState({}, '', url)
  }, [cloud, samples])
  useEffect(() => { loadDrafts(owner).then(setDrafts).catch(() => setNotice('Drafts could not be loaded on this device.')).finally(() => setDraftsReady(true)) }, [owner])
  useEffect(() => { setBouquetDrafts(bouquetDraftStorage.list(owner)) }, [owner, view])
  useEffect(() => { if (bouquetError) setNotice(bouquetError) }, [bouquetError])
  useEffect(() => {
    const url = new URL(location.href)
    if (url.searchParams.get('sent') !== 'bouquet') return
    setNotice(`Your bouquet is on the desk. Its status will update when ${theirName} receives and opens it.`)
    url.searchParams.delete('sent')
    history.replaceState({}, '', url)
  }, [theirName])
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
  const visibleKeepsakes = useMemo(() => [
    ...visible.map(value => ({ kind: 'letter' as const, value, createdAt: value.createdAt?.toMillis() ?? 0 })),
    ...visibleBouquets.map(value => ({ kind: 'bouquet' as const, value, createdAt: bouquetMillis(value.createdAt) })),
  ].sort((a, b) => (sort === 'Newest first' ? -1 : 1) * (a.createdAt - b.createdAt)), [sort, visible, visibleBouquets])
  const bouquetDate = (bouquet: PublishedBouquetV1) => {
    const millis = bouquetMillis(bouquet.createdAt) || Date.now()
    return new Date(millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  const sender = (m: Memory) => m.senderId === owner ? myName : demo ? theirName : firstName(pairing?.profiles?.[m.senderId]?.name) || theirName
  const letterStatus = (memory: Memory) => {
    if (isSealed(memory)) return { label: 'Sealed', date: memory.unlockAt?.toDate() ?? memory.createdAt?.toDate() }
    if (memory.senderId !== owner) return { label: memory.viewedAt ? 'Opened' : 'Unopened', date: (memory.viewedAt ?? memory.createdAt)?.toDate() }
    const state = deliveryState(memory.receivedAt, memory.viewedAt)
    return {
      label: state === 'opened' ? 'Opened' : state === 'delivered' ? 'Delivered' : 'Sent',
      date: (state === 'opened' ? memory.viewedAt : state === 'delivered' ? memory.receivedAt : memory.createdAt)?.toDate(),
    }
  }
  const statusDate = (value?: Date) => value?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) ?? 'Just now'
  const changeView = (next: View) => {
    if (next === view) { mainArea.current?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); return }
    const url = new URL(location.href)
    url.pathname = '/'
    url.searchParams.set('view', next)
    void navigateView(`${url.pathname}${url.search}`, 'fade', true)
  }
  const openWriter = (draft: Draft) => { void transitionView(() => setWriting(draft), 'forward'); play('rustle') }
  const openReader = (memory: Memory) => { void transitionView(() => setReading(memory), 'forward') }
  const compose = () => {
    if (!connected) { changeView('Letters'); setNotice('Invite your person first, then every letter will have a real destination.'); return }
    if (draftsReady) openWriter(newDraft())
  }
  const openBouquetRoute = (path: string) => { void navigateView(`${path}${demo ? `${path.includes('?') ? '&' : '?'}demo=1` : ''}`, 'forward') }
  const readerClose = () => { void transitionView(() => setReading(null), 'back') }
  const mobileTabs = [
    { id: 'Letters', label: 'Letters', icon: <Icon.Letter />, badge: unread },
    { id: 'Bouquets', label: 'Bouquets', icon: <Icon.Flower /> },
    { id: 'Drafts', label: 'Drafts', icon: <Icon.Archive />, badge: drafts.length + bouquetDrafts.length },
    { id: 'Settings', label: 'Settings', icon: <Icon.Gear /> },
  ] as const
  return <div className={`letters-app${demo ? ' is-demo' : ''}${writing || reading ? ' has-fullscreen-view' : ''}`}>
    <aside className="sidebar"><button className="brand" onClick={() => changeView('Letters')}>letters<span>♡</span></button><div className="brand-caption">a little closer, always</div>
      <button className="primary compose-button" onClick={connected ? compose : () => void shareInvite()} disabled={connected && !draftsReady} aria-busy={connected && !draftsReady}>{connected ? <><Icon.Nib />{draftsReady ? 'Write a letter' : 'Preparing paper…'}</> : <><Icon.Letter />Invite your person</>}</button>
      <nav aria-label="Main navigation">{(Object.keys(navIcons) as (keyof typeof navIcons)[]).map(label => { const NavIcon = navIcons[label]; return <button key={label} className={view === label ? 'selected' : ''} onClick={() => changeView(label)} aria-current={view === label ? 'page' : undefined}><NavIcon /><span>{label}</span>{label === 'Letters' && unread > 0 && <b>{unread}</b>}{label === 'Drafts' && drafts.length + bouquetDrafts.length > 0 && <b>{drafts.length + bouquetDrafts.length}</b>}</button> })}</nav>
      <div className="sidebar-note"><span className="handwritten">Good letters,<br />better days.</span><DetailsAsset name="forgetMeNotSprig" /></div>
      <div className="sidebar-bottom"><button onClick={() => changeView('Settings')} className={view === 'Settings' ? 'selected' : ''}><Icon.Gear />Settings</button><div className="profile"><span className="avatar">{myName.charAt(0)}</span><div>{myName}<small>{demo ? 'Sample letterbox' : partner ? `Just you & ${theirName}` : 'Waiting for your person'}</small></div></div></div>
    </aside>
    <div className="main-area" ref={mainArea} onScroll={event => { tabScroll.current[view] = event.currentTarget.scrollTop }}><header className="topbar"><button className="mobile-masthead" onClick={() => changeView('Letters')} aria-label="Letters home"><span className="brand">letters<span>♡</span></span></button><span className="pairing-label">{demo ? 'Sample letterbox' : partner ? `${myName} & ${theirName}` : `${myName}’s letterbox`}</span><div>{demo && <button className="text-button" onClick={onExitDemo}>Sign in</button>}<button className="icon-action" onClick={compose} disabled={!connected || !draftsReady} aria-label="Write a letter"><Icon.Nib /></button></div></header>
    {!online && <div className="offline-banner" role="status">You’re offline. You can keep writing and save a draft on this device.</div>}
    {!demo && !partner && view !== 'Settings' ? <PairingGate name={myName} inviteUrl={inviteUrl} onShare={shareInvite} onCopy={copyInvite} /> : view === 'Settings' ? <main className="settings-page"><header className="page-heading"><h1>Settings</h1><p>Our little space, just the way you like it.</p></header><section className="settings-group" aria-label="Preferences"><div className="settings-row"><div><h3>Paper sounds</h3><p>A soft rustle when you write and seal.</p></div><button className="ios-switch" role="switch" aria-checked={!muted} aria-label="Paper sounds" onClick={() => { setMute(!muted); setMuted(!muted) }}><span /></button></div><div className="settings-row"><div><h3>Notifications</h3><p>{demo ? 'Sign in to hear when a letter arrives.' : 'Hear when something is waiting for you.'}</p></div><button className="ios-switch" role="switch" disabled={demo || pushBusy} aria-checked={notifications} aria-busy={pushBusy} aria-label="Letter notifications" onClick={toggleNotifications}><span /></button></div></section><section className="settings-group" aria-label="Your letterbox"><div className="settings-row"><div><h3>Your correspondence</h3><p>{demo ? 'You’re exploring sample letters. Nothing is sent to anyone.' : partner ? `${myName} & ${theirName}. Private to the two of you.` : 'Invite one person to share your letterbox.'}</p></div>{!demo && !partner ? <button className="text-button" onClick={() => void shareInvite()}>Invite</button> : <Icon.Heart />}</div><div className="settings-row"><div><h3>Drafts & keepsakes</h3><p>Drafts and keepsake selections stay on this device, separately for your account. Sent letters and bouquets live in your shared letterbox.</p></div></div></section><section className="settings-group" aria-label="Install Letters"><div className="settings-row"><div><h3>Add to Home Screen</h3><p>On iPhone, tap Share, then Add to Home Screen. On desktop or Android, use your browser’s install option.</p></div></div></section><button className="settings-signout" onClick={() => demo ? onExitDemo() : signOut().catch(() => setNotice('Couldn’t sign out. Please try again.'))}>{demo ? 'Leave sample letterbox' : 'Sign out'}</button></main> : view === 'Bouquets' ? <main className="bouquet-tab"><Suspense fallback={<div className="loading-letters" role="status">Gathering your flowers…</div>}><div className="bloom-app bloom-app--embedded"><BouquetHomePanel navigate={openBouquetRoute} /></div></Suspense></main> : <main className={`desk desk-${view.toLowerCase()}`}>
      <header className="desk-heading page-heading"><h1>{view === 'Drafts' ? 'Drafts' : 'Letters'}</h1><p>{view === 'Drafts' ? 'Pick up where you left off.' : `Between you and ${theirName}.`}</p></header>
      {view === 'Letters' && !demo && !notifications && <section className="notification-nudge"><span className="notification-nudge-icon"><Icon.Bell /></span><div><strong>Know when {theirName} writes.</strong><p>Turn on a gentle notification when a new letter arrives.</p></div><button className="secondary" disabled={pushBusy} onClick={toggleNotifications}>{pushBusy ? 'Setting up…' : 'Turn on'}</button></section>}
      {view === 'Letters' && <section className="compose-prompt"><div><h2>A little something for them.</h2><p>A few words can make an ordinary day.</p><button className="primary" onClick={compose} disabled={!draftsReady}><Icon.Nib />Write a letter</button></div><DetailsAsset name="cloudLovebirds" className="compose-prompt-birds" /></section>}
      <section className="collection"><div className="collection-heading"><h2>{view === 'Drafts' ? 'Saved on this device' : 'Your letterbox'}</h2>{view === 'Drafts' ? <span className="draft-total">{drafts.length + bouquetDrafts.length}</span> : <label className="sort"><span className="sr-only">Sort keepsakes</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option></select></label>}</div>
      {view !== 'Drafts' && <div className="collection-tools"><label className="letter-search"><Icon.Search /><span className="sr-only">Search your letterbox</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search letters and bouquets" /></label><div className="filter-tabs" role="group" aria-label="Filter letterbox">{(['All letters', 'Received', 'Sent', 'Unopened'] as LetterFilter[]).map(t => <button key={t} aria-pressed={filter === t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t === 'All letters' ? 'All' : t}</button>)}</div></div>}
      {!demo && (cloud === null || bouquetCloud === null) && view !== 'Drafts' ? <div className="loading-letters" role="status">Gathering your keepsakes…</div> : view === 'Drafts' ? <div className="draft-grid">{drafts.map(d => <article className="draft-card" key={d.id}><button onClick={() => openWriter(d)}><span className="draft-kind"><Icon.Paper />Letter</span><h3>{d.title || 'A thought in progress'}</h3><p className="handwritten">{draftPreview(d) || 'Your words go here…'}</p><small>Saved {new Date(d.updated).toLocaleDateString()}</small><span className="continue">Keep writing ↗</span></button><button className="delete-draft" aria-label={`Delete draft ${d.title || 'Untitled'}`} onClick={() => { if (confirm('Discard this draft? This cannot be undone.')) removeDraft(d.id).catch(() => setNotice('Couldn’t delete this draft. Please try again.')) }}><Icon.Trash /></button></article>)}{bouquetDrafts.map(draft => <article className="draft-card bouquet-draft-card" key={`bouquet-${draft.id}`}><button onClick={() => openBouquetRoute(`/bloom/create?draft=${encodeURIComponent(draft.id)}`)}><span className="draft-kind"><Icon.Flower />Bouquet</span><h3>{draft.title || (draft.note.to ? `For ${draft.note.to}` : 'A garden in progress')}</h3><p className="handwritten">{draft.items.length} stems gathered</p><small>Saved {new Date(draft.updatedAt).toLocaleDateString()}</small><span className="continue">Keep arranging ↗</span></button><button className="delete-draft" aria-label={`Delete bouquet draft ${draft.title || 'Untitled'}`} onClick={() => { if (confirm('Discard this bouquet draft? This cannot be undone.')) { bouquetDraftStorage.remove(owner, draft.id); setBouquetDrafts(bouquetDraftStorage.list(owner)) } }}><Icon.Trash /></button></article>)}</div> : <div className="envelope-grid">{visibleKeepsakes.map(entry => {
        if (entry.kind === 'letter') {
          const memory = entry.value
          const sent = memory.senderId === owner
          const status = letterStatus(memory)
          return <article className={`letter-item ${sent ? 'is-sent' : 'is-received'}`} key={`letter-${memory.id}`}><button className="letter-card-main" onClick={() => openReader(memory)} aria-label={`Open ${memory.title}, ${sent ? `sent to ${theirName}` : `from ${sender(memory)}`}`}><span className="envelope-thumb"><EnvelopeSealed envelopeId={memory.envelope} /></span><span className="letter-card-content"><strong className="message-preview">{memory.title || 'Just for you'}</strong><span className="correspondent">{sent ? `To ${theirName}` : `From ${sender(memory)}`}</span><span className="letter-status"><span>{status.label}</span><i>·</i><time>{statusDate(status.date)}</time></span></span></button></article>
        }
        const bouquet = entry.value
        const sent = bouquet.senderId === bouquetOwner
        const label = sent ? bouquet.viewedAt ? 'Opened' : bouquet.receivedAt ? 'Delivered' : 'Sent' : bouquet.viewedAt ? 'Opened' : 'Unopened'
        return <article className={`letter-item bouquet-letter-item ${sent ? 'is-sent' : 'is-received'}`} key={`bouquet-${bouquet.id}`}><button className="letter-card-main" onClick={() => openBouquetRoute(`/bloom/bouquet/${encodeURIComponent(bouquet.id)}`)} aria-label={`Open bouquet ${bouquet.title}`}><span className="bouquet-thumb"><Suspense fallback={<span className="bouquet-thumb-loading" />}><BouquetMiniature composition={bouquet.composition} /></Suspense></span><span className="letter-card-content"><strong className="message-preview">{bouquet.title || 'A bouquet for you'}</strong><span className="correspondent">{sent ? `To ${theirName}` : `From ${theirName}`}</span><span className="letter-status"><span>{label}</span><i>·</i><time>{bouquetDate(bouquet)}</time></span></span></button></article>
      })}</div>}
      {(view === 'Drafts' ? draftsReady && !drafts.length && !bouquetDrafts.length : (demo || (cloud !== null && bouquetCloud !== null)) && !visibleKeepsakes.length) && <div className="empty-state"><div className="empty-art"><DetailsAsset name="blueLoveMailbox" /></div><h3>{view === 'Drafts' ? 'Room for a thought.' : search || filter !== 'All letters' ? 'No matches yet.' : 'Your first letter starts here.'}</h3><p>{view === 'Drafts' ? 'Letters and bouquets you’re working on will be waiting here.' : search || filter !== 'All letters' ? 'Try another title or show all your keepsakes.' : 'Send a little piece of your day.'}</p><button className="primary" onClick={view !== 'Drafts' && (search || filter !== 'All letters') ? () => { setSearch(''); setFilter('All letters') } : compose}>{view !== 'Drafts' && (search || filter !== 'All letters') ? 'Show all' : <><Icon.Nib />Write a letter</>}</button></div>}
      </section>
    </main>}
    </div>
    <nav className="mobile-nav" aria-label="App navigation">{mobileTabs.map(tab => <button key={tab.id} type="button" aria-current={view === tab.id ? 'page' : undefined} onClick={() => changeView(tab.id)}><span className="tab-icon-wrap" aria-hidden="true">{tab.icon}{'badge' in tab && tab.badge > 0 && <b className="tab-badge">{tab.badge > 9 ? '9+' : tab.badge}</b>}</span><span className="tab-label">{tab.label}</span>{'badge' in tab && tab.badge > 0 && <span className="sr-only">{`, ${tab.badge} ${tab.id === 'Letters' ? 'unopened' : 'saved'}`}</span>}</button>)}</nav>
    {writing && <Suspense fallback={<div className="workspace-overlay ritual-loading" role="status">Preparing your paper…</div>}><Composer initial={writing} recipient={theirName} sender={myName} demo={demo} onSave={persistDraft} onSend={deliver} onClose={() => { void transitionView(() => setWriting(null), 'back') }} onSent={() => { void transitionView(() => { setWriting(null); setView('Letters'); const url = new URL(location.href); url.searchParams.set('view', 'Letters'); history.replaceState(null, '', url); setFilter('Sent'); setNotice(demo ? 'Sample letter sent. It is now in your shared letters.' : deliveryNotice.current || `Your letter is safely in ${theirName}’s letterbox.`); deliveryNotice.current = '' }, 'back') }} /></Suspense>}
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

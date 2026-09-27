import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import getStroke from 'perfect-freehand'
import { useSession } from '../lib/session'
import { isSealed, markViewed, readLetterBody, type Memory } from '../lib/db'
import {
  decodeLetter, encodeLetter, envelopes, fonts, gestureDelta, getStationery, migrateV1, paginateText, photoData, redoDraft, stationery, undoDraft, upgradeDraft,
  type Draft, type LetterContent, type LetterContentV1, type LetterContentV2, type LetterItem, type LetterPage, type LetterStyle,
} from '../lib/letters'
import { play } from '../lib/sound'
import { Icon } from '../components/ui'
import { EnvelopeSealed } from '../components/EnvelopeSealed'
import { HapticButton } from '../components/HapticButton'
import { StationeryPaper } from '../components/StationeryPaper'
import { DetailsAsset, isDetailAsset, type DetailAssetName } from '../components/DetailsAsset'

const detailChoices: { id: DetailAssetName; label: string }[] = [
  { id: 'loveLetter', label: 'Love letter' }, { id: 'ribbonBowPink', label: 'Pink ribbon' },
  { id: 'tulipBouquet', label: 'Tulip bouquet' }, { id: 'duckHeartStamp', label: 'Duck heart stamp' },
  { id: 'crescentMoon', label: 'Blushing moon' }, { id: 'heartCandle', label: 'Heart candle' },
  { id: 'heartFlourish', label: 'Love flourish' }, { id: 'pinkButterfly', label: 'Pink butterfly' },
  { id: 'sleepyCatPink', label: 'Sleepy pink cat' }, { id: 'lovePen', label: 'Love-note pen' },
  { id: 'loveCherries', label: 'Love cherries' }, { id: 'meadowStamp', label: 'Meadow postage' },
  { id: 'botanical', label: 'Pressed florals' }, { id: 'bow', label: 'Silk ribbon bow' },
  { id: 'waxSeal', label: 'Heart wax seal' }, { id: 'stamps', label: 'Keepsake stamps' },
  { id: 'stampCat', label: 'Cat postage' }, { id: 'stampTulip', label: 'Tulip postage' },
  { id: 'heartNote', label: 'Heart note' }, { id: 'smallProgress', label: 'Deckled note' },
  { id: 'noteLined', label: 'Lined paper' }, { id: 'letterNote', label: 'Keepsake note' },
  { id: 'cat', label: 'Sleepy cat' }, { id: 'petal', label: 'Rose petal' }, { id: 'cloud', label: 'Soft cloud' },
  { id: 'botanicalFlower', label: 'Peach bloom' }, { id: 'floralSprig', label: 'Floral sprig' },
  { id: 'washiPink', label: 'Pink washi' }, { id: 'washiGingham', label: 'Gingham tape' },
  { id: 'washiBeige', label: 'Beige tape' }, { id: 'tapeHearts', label: 'Hearts tape' },
  { id: 'paperclip', label: 'Heart clip' }, { id: 'miniEnvelope', label: 'Mini envelope' },
  { id: 'withLoveTag', label: 'With love tag' }, { id: 'justForYouTag', label: 'For you tag' },
  { id: 'datePill', label: 'Date label' }, { id: 'waxSealSmall', label: 'Petite seal' },
]

function usePageFocus(onClose: () => void) {
  const root = useRef<HTMLDivElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    root.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
      if (event.key !== 'Tab') return
      const nodes = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')
      if (!nodes?.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handler)
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = old; previous?.focus() }
  }, [])
  return root
}

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'
type Guide = { x?: boolean; y?: boolean; warning?: boolean }

export function Composer({ initial, sender, recipient, demo, onSave, onSend, onClose, onSent }: {
  initial: Draft; sender: string; recipient: string; demo: boolean
  onSave: (draft: Draft) => Promise<void>; onSend: (draft: Draft) => Promise<void>; onClose: () => void; onSent: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const value = upgradeDraft(initial)
    return { ...value, greeting: value.greeting || `Dear ${recipient},` }
  })
  const [phase, setPhase] = useState<'write' | 'preview' | 'seal' | 'sent'>('write')
  const [tool, setTool] = useState<'Paper' | 'Type' | 'Envelope' | 'Details' | null>(() => window.matchMedia('(max-width: 800px)').matches ? null : 'Paper')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [activePage, setActivePage] = useState(draft.pages[0].id)
  const [activeItem, setActiveItem] = useState<string | null>(null)
  const [guide, setGuide] = useState<Guide>({})
  const [historyTick, setHistoryTick] = useState(0)
  const [detailSelection, setDetailSelection] = useState<DetailAssetName[]>([])

  const root = usePageFocus(() => void close())
  const panel = useRef<HTMLElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const currentDraft = useRef(draft); currentDraft.current = draft
  const lastSaved = useRef(JSON.stringify(draft))
  const composing = useRef(false)
  const textareas = useRef(new Map<string, HTMLTextAreaElement>())
  const papers = useRef(new Map<string, HTMLElement>())
  const past = useRef<Draft[]>([])
  const future = useRef<Draft[]>([])
  const lastHistory = useRef({ kind: '', at: 0 })

  const dirty = JSON.stringify(draft) !== lastSaved.current

  function commit(update: Partial<Draft> | ((value: Draft) => Draft), kind = 'edit', coalesce = false) {
    setDraft(previous => {
      const now = Date.now()
      if (!coalesce || lastHistory.current.kind !== kind || now - lastHistory.current.at > 700) {
        past.current.push(previous)
        if (past.current.length > 80) past.current.shift()
        future.current = []
        setHistoryTick(value => value + 1)
      }
      lastHistory.current = { kind, at: now }
      const next = typeof update === 'function' ? update(previous) : { ...previous, ...update }
      return next
    })
    setSaveState('unsaved')
  }

  function undo() {
    const next = undoDraft(currentDraft.current, past.current, future.current)
    if (next.current === currentDraft.current) return
    past.current = next.past; future.current = next.future; setDraft(next.current); setSaveState('unsaved'); setHistoryTick(value => value + 1)
  }
  function redo() {
    const next = redoDraft(currentDraft.current, past.current, future.current)
    if (next.current === currentDraft.current) return
    past.current = next.past; future.current = next.future; setDraft(next.current); setSaveState('unsaved'); setHistoryTick(value => value + 1)
  }

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault(); event.shiftKey ? redo() : undo()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [])

  const persist = useCallback(async (value = currentDraft.current) => {
    const next = { ...value, updated: Date.now() }
    setSaveState('saving')
    try { await onSave(next); lastSaved.current = JSON.stringify(next); setSaveState('saved') }
    catch { setSaveState('error'); setError("Your draft couldn't be saved on this device. Keep this letter open and try again.") }
  }, [onSave])

  useEffect(() => {
    if (!dirty || phase !== 'write') return
    const timer = window.setTimeout(() => void persist(), 850)
    return () => window.clearTimeout(timer)
  }, [draft, dirty, phase, persist])

  useEffect(() => {
    const flush = () => { if (JSON.stringify(currentDraft.current) !== lastSaved.current) void persist(currentDraft.current) }
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility)
    }
  }, [persist])

  async function close() {
    if (busy) { setError('Finish the current action before closing your letter.'); return }
    if (JSON.stringify(currentDraft.current) !== lastSaved.current) await persist(currentDraft.current)
    onClose()
  }

  function chooseTool(name: NonNullable<typeof tool>) {
    setTool(current => current === name ? null : name)
    if (window.matchMedia('(max-width: 800px)').matches) requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' }))
  }

  function mapPages(text: string, original: LetterPage[], paperId = draft.paper) {
    const chunks = paginateText(text, getStationery(paperId).profile)
    const requiredForItems = original.reduce((last, page, index) => page.items.length ? index + 1 : last, 0)
    const length = Math.max(chunks.length, requiredForItems, 1)
    return Array.from({ length }, (_, index) => ({ id: original[index]?.id ?? crypto.randomUUID(), text: chunks[index] ?? '', items: original[index]?.items ?? [] }))
  }

  function restoreCaret(offset: number, pages: LetterPage[]) {
    requestAnimationFrame(() => {
      let passed = 0
      for (const page of pages) {
        if (offset <= passed + page.text.length) {
          const field = textareas.current.get(page.id)
          field?.focus({ preventScroll: true }); field?.setSelectionRange(offset - passed, offset - passed)
          return
        }
        passed += page.text.length
      }
      const last = pages.at(-1); if (last) textareas.current.get(last.id)?.focus({ preventScroll: true })
    })
  }

  function editPage(pageId: string, value: string, caret: number, force = false) {
    const index = draft.pages.findIndex(page => page.id === pageId)
    if (index < 0) return
    const before = draft.pages.slice(0, index).reduce((sum, page) => sum + page.text.length, 0)
    if (composing.current && !force) {
      commit(valueDraft => ({ ...valueDraft, pages: valueDraft.pages.map(page => page.id === pageId ? { ...page, text: value } : page) }), 'typing', true)
      return
    }
    const full = draft.pages.map((page, pageIndex) => pageIndex === index ? value : page.text).join('')
    const pages = mapPages(full, draft.pages)
    commit({ pages }, 'typing', true)
    restoreCaret(before + caret, pages)
  }

  function pageUpdate(pageId: string, update: (page: LetterPage) => LetterPage, kind = 'item') {
    commit(value => ({ ...value, pages: value.pages.map(page => page.id === pageId ? update(page) : page) }), kind, kind === 'move')
  }

  function addItem(kind: LetterItem['kind'], value: string, extra: Partial<LetterItem> = {}) {
    const pageId = draft.pages.some(page => page.id === activePage) ? activePage : draft.pages[0].id
    const item: LetterItem = { id: crypto.randomUUID(), kind, value, x: 58, y: 57, width: kind === 'voice' ? 36 : 28, rotation: 0, z: 1, ...extra }
    pageUpdate(pageId, page => ({ ...page, items: [...page.items, { ...item, z: Math.max(0, ...page.items.map(entry => entry.z)) + 1 }] }))
    setActiveItem(item.id); play('rustle')
  }

  function placeSelectedDetails() {
    if (!detailSelection.length) return
    const pageId = draft.pages.some(page => page.id === activePage) ? activePage : draft.pages[0].id
    const ids = detailSelection.map(() => crypto.randomUUID())
    commit(value => ({ ...value, pages: value.pages.map(page => {
      if (page.id !== pageId) return page
      const top = Math.max(0, ...page.items.map(item => item.z))
      const items = detailSelection.map((detail, index): LetterItem => ({
        id: ids[index], kind: 'detail', value: detail,
        x: 55 + (index % 3) * 7, y: 54 + (index % 4) * 6,
        width: detail === 'heartFlourish' ? 38 : detail === 'lovePen' ? 18 : 25,
        rotation: [-7, 4, -2, 8][index % 4], z: top + index + 1,
      }))
      return { ...page, items: [...page.items, ...items] }
    }) }), 'details')
    setActiveItem(ids.at(-1) ?? null); setDetailSelection([]); play('rustle')
    if (matchMedia('(max-width: 800px)').matches) setTool(null)
  }

  function selected() {
    for (const page of draft.pages) { const item = page.items.find(entry => entry.id === activeItem); if (item) return { page, item } }
    return null
  }

  function updateSelected(update: Partial<LetterItem>, kind = 'item') {
    const value = selected(); if (!value) return
    pageUpdate(value.page.id, page => ({ ...page, items: page.items.map(item => item.id === value.item.id ? { ...item, ...update } : item) }), kind)
  }
  function removeSelected() {
    const value = selected(); if (!value) return
    pageUpdate(value.page.id, page => ({ ...page, items: page.items.filter(item => item.id !== value.item.id) }))
    setActiveItem(null)
  }
  function layerSelected(direction: -1 | 1) {
    const value = selected(); if (!value) return
    const layers = value.page.items.map(item => item.z)
    updateSelected({ z: direction > 0 ? Math.max(...layers) + 1 : Math.min(...layers) - 1 })
  }

  async function photo(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try { addItem('photo', await photoData(file), { frame: 'polaroid' }) }
    catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false); if (upload.current) upload.current.value = '' }
  }

  function preview() { try { encodeLetter(draft); setError(''); setPhase('preview'); setActiveItem(null); play('rustle') } catch (reason) { setError((reason as Error).message) } }
  async function send() {
    setBusy(true); setError('')
    try { await persist(draft); await onSend(draft); setPhase('sent'); play('chime') }
    catch (reason) { setError((reason as Error).message || "Your letter couldn't be sent. Your draft is still here.") }
    finally { setBusy(false) }
  }

  const selectedValue = selected()

  return (
    <div className="workspace-overlay composer-v2" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Write a letter">
      <header className="workspace-header compose-header">
        <button className="back-button" aria-label="Back to your letters" onClick={() => void close()} disabled={busy}><Icon.Back /><span>Letters</span></button>
        <div className="workspace-title-wrap"><span className="workspace-title">{phase === 'write' ? 'A quiet letter' : phase === 'preview' ? 'One last look' : phase === 'seal' ? 'Ready to seal' : 'A little closer'}</span><span className={`save-status is-${saveState}`} role="status">{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved' : 'Unsaved'}</span></div>
        <div className="compose-actions">
          {phase === 'write' && <><button className="icon-action" onClick={undo} disabled={!past.current.length} aria-label="Undo"><Icon.Undo /></button><button className="icon-action" onClick={redo} disabled={!future.current.length} aria-label="Redo"><Icon.Redo /></button><button className="primary" onClick={preview} disabled={busy}>Preview <span>→</span></button></>}
          {phase === 'preview' && <><button className="secondary" onClick={() => setPhase('write')}>Keep writing</button><button className="primary" onClick={() => { setPhase('seal'); play('rustle') }}>Fold & seal ♡</button></>}
          {phase === 'seal' && <button className="text-button" disabled={busy} onClick={() => setPhase('preview')}>Back to preview</button>}
        </div>
      </header>

      {error && <div className="composer-error" role="alert">{error}</div>}
      {drawing && phase === 'write' && <Doodle onAdd={value => { addItem('doodle', value); setDrawing(false) }} onCancel={() => setDrawing(false)} />}

      <AnimatePresence mode="wait">
        {(phase === 'write' || phase === 'preview') ? (
          <motion.div key="paper" className={`composer-layout composer-layout-v2 ${phase === 'preview' ? 'preview-mode' : ''}${phase === 'write' && tool ? ' inspector-open' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {phase === 'write' && <aside className="writing-tools" aria-label="Letter tools">
              <button onClick={() => setDrawing(true)}><Icon.Nib />Doodle</button>
              <button onClick={() => upload.current?.click()} disabled={busy}><Icon.Camera />Photo</button>
              <hr />
              <button onClick={() => chooseTool('Paper')} className={tool === 'Paper' ? 'selected' : ''} aria-pressed={tool === 'Paper'}><Icon.Paper />Paper</button>
              <button onClick={() => chooseTool('Type')} className={tool === 'Type' ? 'selected' : ''} aria-pressed={tool === 'Type'}><span>Aa</span>Type</button>
              <button onClick={() => chooseTool('Envelope')} className={tool === 'Envelope' ? 'selected' : ''} aria-pressed={tool === 'Envelope'}><Icon.Letter />Envelope</button>
              <button onClick={() => chooseTool('Details')} className={tool === 'Details' ? 'selected' : ''} aria-pressed={tool === 'Details'}><Icon.Sparkle />Details</button>
              <input type="file" hidden ref={upload} accept="image/*" onChange={event => void photo(event.target.files?.[0])} />
            </aside>}

            <main className="paper-stage paper-stack" onPointerDown={event => { if (event.target === event.currentTarget) setActiveItem(null) }}>
              <div className="paper-overline"><span>To {recipient}</span><span>{draft.pages.length} {draft.pages.length === 1 ? 'sheet' : 'sheets'}</span></div>
              {draft.pages.map((page, index) => <div className="sheet-wrap" key={page.id}>
                <LetterPageView
                  paperId={draft.paper} style={draft.style} page={page} pageIndex={index} pageCount={draft.pages.length}
                  title={draft.title} greeting={draft.greeting} date={new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
                  editable={phase === 'write'} activeItem={activeItem} guide={activePage === page.id ? guide : {}}
                  paperRef={node => { if (node) papers.current.set(page.id, node); else papers.current.delete(page.id) }}
                  textareaRef={node => { if (node) textareas.current.set(page.id, node); else textareas.current.delete(page.id) }}
                  onActivatePage={() => { setActivePage(page.id); if (window.matchMedia('(max-width: 800px)').matches) setTool(null) }} onActivateItem={setActiveItem} onGuide={setGuide}
                  onTitle={value => commit({ title: value }, 'title', true)} onGreeting={value => commit({ greeting: value }, 'greeting', true)}
                  onText={(value, caret) => editPage(page.id, value, caret)}
                  onCompositionStart={() => { composing.current = true }}
                  onCompositionEnd={(value, caret) => { composing.current = false; editPage(page.id, value, caret, true) }}
                  onItem={(id, update, kind) => pageUpdate(page.id, current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, ...update } : item) }), kind)}
                />
                {index > 0 && <span className="page-number" aria-label={`Page ${index + 1}`}>{index + 1}</span>}
              </div>)}
              <p className="paper-footnote">{phase === 'write' ? "Keep writing — a fresh sheet appears when you need it." : 'Everything here will be tucked inside your envelope.'}</p>
            </main>

            {phase === 'write' && tool && <aside className="customization customization-v2" ref={panel} aria-label={`${tool} options`}>
              <div className="customize-heading"><div><h2>Make it yours.</h2><p>Quiet choices, made for this paper.</p></div><button className="inspector-close" onClick={() => setTool(null)} aria-label="Close customization"><Icon.Close /></button></div>
              <div className="customize-tabs">{(['Paper', 'Type', 'Envelope', 'Details'] as const).map(name => <button key={name} className={tool === name ? 'active' : ''} aria-pressed={tool === name} onClick={() => setTool(name)}>{name}</button>)}</div>
              {tool === 'Paper' && <div className="paper-options">{stationery.map(paper => <button key={paper.id} className={draft.paper === paper.id ? 'chosen' : ''} onClick={() => commit(value => ({ ...value, paper: paper.id, pages: mapPages(value.pages.map(page => page.text).join(''), value.pages, paper.id) }), 'paper')} aria-pressed={draft.paper === paper.id}><span className="paper-swatch"><img src={paper.url} alt="" />{draft.paper === paper.id && <b>✓</b>}</span><strong>{paper.name}</strong><small>{paper.mood}</small></button>)}</div>}
              {tool === 'Type' && <div className="font-options">{([
                ['paper', "Paper’s choice", 'Matched to this stationery'], ['literary', 'Literary', 'Newsreader'], ['handwritten', 'Handwritten', 'Caveat'],
                ['dreamy', 'Dreamy', 'Soft Fraunces'], ['classic', 'Classic', 'Cormorant'],
              ] as [LetterStyle, string, string][]).map(([style, label, note]) => <button key={style} aria-pressed={draft.style === style} className={draft.style === style ? 'chosen' : ''} onClick={() => commit({ style }, 'type')}><span style={{ fontFamily: fonts[style] }}>Dear you,</span><small>{label} · {note}</small></button>)}</div>}
              {tool === 'Envelope' && <div className="envelope-options">{envelopes.map(envelope => <button key={envelope.id} className={draft.envelope === envelope.id ? 'chosen' : ''} onClick={() => commit({ envelope: envelope.id }, 'envelope')} aria-pressed={draft.envelope === envelope.id}><span className="envelope-swatch"><EnvelopeSealed envelopeId={envelope.id} />{draft.envelope === envelope.id && <b>✓</b>}</span><strong>{envelope.name}</strong><small>{envelope.badge}</small></button>)}</div>}
              {tool === 'Details' && <><p className="tool-note">Choose a little collection, then place everything together on this sheet.</p><div className="decoration-options">{detailChoices.map(detail => { const chosen = detailSelection.includes(detail.id); return <button key={detail.id} className={`detail-tile${chosen ? ' chosen' : ''}`} onClick={() => setDetailSelection(value => chosen ? value.filter(item => item !== detail.id) : [...value, detail.id])} aria-label={`${chosen ? 'Remove' : 'Select'} ${detail.label}`} aria-pressed={chosen}><DetailsAsset name={detail.id} /><span>{detail.label}</span>{chosen && <b aria-hidden>✓</b>}</button> })}</div><div className="details-selection-bar"><span>{detailSelection.length ? `${detailSelection.length} selected` : 'Pick as many as you like'}</span><button className="primary" disabled={!detailSelection.length} onClick={placeSelectedDetails}>Place keepsakes</button></div></>}
            </aside>}

            {phase === 'write' && selectedValue && <ObjectActions item={selectedValue.item} warning={guide.warning} onResize={width => updateSelected({ width })} onRotate={rotation => updateSelected({ rotation })} onBack={() => layerSelected(-1)} onFront={() => layerSelected(1)} onDelete={removeSelected} />}
          </motion.div>
        ) : phase === 'seal' ? (
          <motion.section key="seal" className="sealing-stage" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="little-label">THE LAST LITTLE RITUAL</span><h1>Tuck it in with care.</h1><p>From {sender}, held safely for {recipient}.</p>
            <div className="seal-ritual-art"><EnvelopeSealed envelopeId={draft.envelope} state="open" className="seal-envelope" /><div className="seal-paper-peek"><span>{draft.title || 'Just for you'}</span><small>{draft.pages.length} {draft.pages.length === 1 ? 'sheet' : 'sheets'}</small></div></div>
            <div className="delivery-card"><label className="delivery-label"><span>When can they open it?</span><input type="datetime-local" value={draft.unlockAt} onChange={event => commit({ unlockAt: event.target.value }, 'unlock')} /></label><p>{draft.unlockAt ? 'Until then, the envelope stays quietly sealed.' : 'Leave this empty and it arrives ready to open.'}</p></div>
            <HapticButton className="primary send-ritual" label={demo ? 'Send sample letter' : 'Send this letter'} onPress={() => void send()} disabled={busy}>{busy ? 'Sending your letter…' : demo ? 'Send sample letter ↗' : 'Seal & send with love ↗'}</HapticButton>
            {demo && <small>Preview only. This won't be sent to anyone.</small>}
          </motion.section>
        ) : <motion.section key="sent" className="sent-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><DetailsAsset name="heartFlourish" className="sent-flourish" /><span className="sent-heart">♡</span><h1>Off it goes, softly.</h1><p>{demo ? 'Your sample letter is resting in the shared correspondence.' : `Your letter is on its way to ${recipient}.`}</p><button className="primary" onClick={onSent}>See all letters →</button></motion.section>}
      </AnimatePresence>
    </div>
  )
}

function LetterPageView({ paperId, style, page, pageIndex, title, greeting, date, editable, activeItem, guide, paperRef, textareaRef, onActivatePage, onActivateItem, onGuide, onTitle, onGreeting, onText, onCompositionStart, onCompositionEnd, onItem }: {
  paperId: string; style: LetterStyle; page: LetterPage; pageIndex: number; pageCount: number; title: string; greeting: string; date: string; editable: boolean
  activeItem: string | null; guide: Guide; paperRef: (node: HTMLElement | null) => void; textareaRef: (node: HTMLTextAreaElement | null) => void
  onActivatePage: () => void; onActivateItem: (id: string | null) => void; onGuide: (guide: Guide) => void
  onTitle: (value: string) => void; onGreeting: (value: string) => void; onText: (value: string, caret: number) => void
  onCompositionStart: () => void; onCompositionEnd: (value: string, caret: number) => void
  onItem: (id: string, update: Partial<LetterItem>, kind?: string) => void
}) {
  const font = fonts[style]
  return <StationeryPaper paperId={paperId} fontFamily={font} className={`letter-sheet ${getStationery(paperId).profile.printedBaseline ? 'is-lined' : ''}`} ref={paperRef} onPointerDown={onActivatePage}>
    <div className="paper-quiet-zone" aria-hidden />
    <div className="paper-safe-area">
      {pageIndex === 0 && <header className="letter-heading">
        <span className="letter-date">{date}</span>
        {editable ? <input className="letter-title-input-v2" value={title} onChange={event => onTitle(event.target.value)} placeholder="An optional title" aria-label="Letter title" maxLength={120} /> : title ? <h1 className="reading-title">{title}</h1> : null}
        {editable ? <input className="letter-greeting-input" value={greeting} onChange={event => onGreeting(event.target.value)} placeholder="Dear you," aria-label="Greeting" maxLength={120} /> : greeting ? <p className="letter-greeting">{greeting}</p> : null}
      </header>}
      {editable ? <textarea
        ref={textareaRef} className="paper-textarea" value={page.text} aria-label={`Letter body, page ${pageIndex + 1}`} placeholder={pageIndex === 0 ? 'Take your time. Write whatever is on your heart today…' : 'Keep writing…'}
        spellCheck autoCapitalize="sentences" autoCorrect="on" rows={1}
        onFocus={onActivatePage} onChange={event => onText(event.target.value, event.target.selectionStart)}
        onCompositionStart={onCompositionStart} onCompositionEnd={event => onCompositionEnd(event.currentTarget.value, event.currentTarget.selectionStart)}
      /> : <p className="letter-page-text">{page.text}</p>}
    </div>
    {editable && guide.x && <span className="smart-guide guide-x" aria-hidden />}{editable && guide.y && <span className="smart-guide guide-y" aria-hidden />}
    {page.items.map(item => <CanvasItem key={item.id} item={item} paperId={paperId} paperRef={paperRef} active={editable && activeItem === item.id} editable={editable} onActivate={() => onActivateItem(item.id)} onGuide={onGuide} onChange={(update, kind) => onItem(item.id, update, kind)}><LetterItemView item={item} /></CanvasItem>)}
  </StationeryPaper>
}

function CanvasItem({ item, paperId, active, editable, onActivate, onGuide, onChange, children }: {
  item: LetterItem; paperId: string; active: boolean; editable: boolean; paperRef: (node: HTMLElement | null) => void
  onActivate: () => void; onGuide: (value: Guide) => void; onChange: (update: Partial<LetterItem>, kind?: string) => void; children: ReactNode
}) {
  const element = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const pinch = useRef<{
    ids: [number, number]; a: { x: number; y: number }; b: { x: number; y: number }
    x: number; y: number; width: number; height: number; rotation: number
  } | null>(null)
  const latest = useRef(item); latest.current = item
  const profile = getStationery(paperId).profile
  function placement(x: number, y: number, width: number, height: number) {
    const maxX = Math.max(0, 100 - width), maxY = Math.max(0, 100 - height)
    x = Math.min(maxX, Math.max(0, x)); y = Math.min(maxY, Math.max(0, y))
    const centerX = x + width / 2, centerY = y + height / 2
    const guideX = Math.abs(centerX - 50) < 1.5, guideY = Math.abs(centerY - 50) < 1.5
    if (guideX) x = 50 - width / 2
    if (guideY) y = 50 - height / 2
    const proseRight = 100 - profile.safe.right, proseBottom = 100 - profile.safe.bottom
    const warning = x + width > profile.safe.left && x < proseRight && y + height > profile.safe.top && y < proseBottom
    onGuide({ x: guideX, y: guideY, warning })
    return { x, y }
  }
  function beginPinch(paper: HTMLElement) {
    const entries = Array.from(pointers.current.entries())
    if (entries.length < 2) return
    const [[firstId, a], [secondId, b]] = entries
    const current = latest.current
    pinch.current = {
      ids: [firstId, secondId], a, b, x: current.x, y: current.y, width: current.width,
      height: (element.current?.getBoundingClientRect().height ?? 0) / paper.getBoundingClientRect().height * 100,
      rotation: current.rotation,
    }
    drag.current = null
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    if (!editable || (event.target as HTMLElement).closest('button,audio')) return
    event.preventDefault(); event.stopPropagation(); onActivate(); event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const paper = element.current?.closest('.letter-sheet') as HTMLElement | null
    if (pointers.current.size > 1 && paper) beginPinch(paper)
    else drag.current = { x: event.clientX, y: event.clientY, left: item.x, top: item.y }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const paper = element.current?.closest('.letter-sheet') as HTMLElement | null
    if (!paper) return
    const rect = paper.getBoundingClientRect(), gesture = pinch.current
    if (gesture && pointers.current.size > 1) {
      const a = pointers.current.get(gesture.ids[0]), b = pointers.current.get(gesture.ids[1])
      if (!a || !b) return
      const delta = gestureDelta(gesture.a, gesture.b, a, b)
      const width = Math.min(82, Math.max(8, gesture.width * delta.scale))
      const height = gesture.height * width / gesture.width
      const positioned = placement(gesture.x + gesture.width / 2 + delta.x / rect.width * 100 - width / 2, gesture.y + gesture.height / 2 + delta.y / rect.height * 100 - height / 2, width, height)
      const rotation = Math.round((gesture.rotation + delta.rotation) * 10) / 10
      latest.current = { ...latest.current, ...positioned, width, rotation }
      onChange({ ...positioned, width, rotation }, 'move')
      return
    }
    const start = drag.current
    if (!start) return
    const height = (element.current?.getBoundingClientRect().height ?? 0) / rect.height * 100
    const positioned = placement(start.left + (event.clientX - start.x) / rect.width * 100, start.top + (event.clientY - start.y) / rect.height * 100, latest.current.width, height)
    latest.current = { ...latest.current, ...positioned }
    onChange(positioned, 'move')
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId); pinch.current = null; onGuide({})
    const remaining = Array.from(pointers.current.values())[0]
    drag.current = remaining ? { x: remaining.x, y: remaining.y, left: latest.current.x, top: latest.current.y } : null
  }
  const style = { left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, zIndex: item.z, '--item-rotation': `${item.rotation}deg` } as CSSProperties
  return <div ref={element} className={`canvas-item-v2${active ? ' is-active' : ''}`} style={style} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={event => { if (editable) { event.stopPropagation(); onActivate() } }} onKeyDown={event => {
    if (!editable) return
    const step = event.shiftKey ? 5 : 1; let update: Partial<LetterItem> | null = null
    if (event.key === 'ArrowLeft') update = { x: Math.max(0, item.x - step) }; if (event.key === 'ArrowRight') update = { x: Math.min(100 - item.width, item.x + step) }
    if (event.key === 'ArrowUp') update = { y: Math.max(0, item.y - step) }; if (event.key === 'ArrowDown') update = { y: Math.min(92, item.y + step) }
    if (update) { event.preventDefault(); onChange(update, 'move') }
  }} role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined} aria-label={editable ? `${item.kind} keepsake. Drag or use arrow keys to move. Use two fingers to resize and rotate.` : undefined}>
    <div className="canvas-item-content-v2">{children}</div>
  </div>
}

function ObjectActions({ item, warning, onResize, onRotate, onBack, onFront, onDelete }: { item: LetterItem; warning?: boolean; onResize: (value: number) => void; onRotate: (value: number) => void; onBack: () => void; onFront: () => void; onDelete: () => void }) {
  return <div className="object-actions" role="toolbar" aria-label={`Selected ${item.kind} controls`}>
    {warning && <span className="placement-warning">Over the writing area</span>}
    <button onClick={() => onResize(Math.max(8, item.width - 4))} aria-label="Make smaller">−</button><span>{Math.round(item.width)}%</span><button onClick={() => onResize(Math.min(82, item.width + 4))} aria-label="Make larger">+</button>
    <button onClick={() => onRotate(item.rotation - 5)} aria-label="Rotate left">↶</button><button onClick={() => onRotate(item.rotation + 5)} aria-label="Rotate right">↷</button>
    <button onClick={onBack}>Send back</button><button onClick={onFront}>Bring front</button><button className="danger" onClick={onDelete}><Icon.Trash /> Remove</button>
  </div>
}

function LetterItemView({ item }: { item: LetterItem }) {
  if (item.kind === 'detail' && isDetailAsset(item.value)) return <DetailsAsset name={item.value} />
  if (item.kind === 'doodle') return <img className="doodle-keepsake" src={item.value} alt="A drawing made for this letter" />
  if (item.kind === 'voice') return <VoiceBlock src={item.value} />
  return <figure className={`photo-keepsake frame-${item.frame ?? 'polaroid'}`}><img src={item.value} alt="A photograph tucked into this letter" /></figure>
}

function VoiceBlock({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null); const [playing, setPlaying] = useState(false); const [duration, setDuration] = useState(0); const [current, setCurrent] = useState(0)
  async function toggle() { if (!audio.current) return; if (audio.current.paused) { await audio.current.play(); setPlaying(true) } else { audio.current.pause(); setPlaying(false) } }
  const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  return <div className="voice-keepsake"><DetailsAsset name="heartNote" /><button type="button" onClick={() => void toggle()} aria-label={playing ? 'Pause voice note' : 'Play voice note'}>{playing ? 'Ⅱ' : '▶'}</button><span>{time(current)} / {duration ? time(duration) : '0:00'}</span><audio ref={audio} src={src} preload="metadata" onLoadedMetadata={event => { const value = event.currentTarget.duration; if (Number.isFinite(value)) setDuration(value) }} onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)} onEnded={() => { setPlaying(false); setCurrent(0) }} /></div>
}

function LegacyContent({ content }: { content: LetterContentV1 }) {
  return <><div className="legacy-letter-canvas">{content.greeting && <p className="letter-greeting">{content.greeting}</p>}{content.blocks.map((block, index) => block.kind === 'text' ? <p key={block.id} className="letter-page-text legacy-text" style={{ left: `${block.x ?? 7}%`, top: `${block.y ?? (10 + index * 19)}%`, width: `${block.size ?? 86}%`, transform: `rotate(${block.rotation ?? 0}deg)` }}>{block.value}</p> : <div key={block.id} className="legacy-item" style={{ left: `${block.x ?? 8}%`, top: `${block.y ?? 52}%`, width: `${block.size ?? 42}%`, transform: `rotate(${block.rotation ?? 0}deg)` }}><LetterItemView item={{ id: block.id, kind: block.kind, value: block.value, frame: block.frame, x: 0, y: 0, width: 100, rotation: 0, z: 1 }} /></div>)}{(content.placedDetails ?? []).filter(value => isDetailAsset(value.name)).map(value => <div key={value.id} className="legacy-item" style={{ left: `${value.x}%`, top: `${value.y}%`, width: `${value.size}%`, transform: `rotate(${value.rotation ?? 0}deg)` }}><DetailsAsset name={value.name as DetailAssetName} /></div>)}</div></>
}

function LetterPages({ content, paperId, title, date }: { content: LetterContentV2; paperId: string; title: string; date: string }) {
  return <div className="reader-page-stack">{content.pages.map((page, index) => <div className="sheet-wrap" key={page.id}><LetterPageView paperId={paperId} style={content.style} page={page} pageIndex={index} pageCount={content.pages.length} title={title} greeting={content.greeting} date={date} editable={false} activeItem={null} guide={{}} paperRef={() => {}} textareaRef={() => {}} onActivatePage={() => {}} onActivateItem={() => {}} onGuide={() => {}} onTitle={() => {}} onGreeting={() => {}} onText={() => {}} onCompositionStart={() => {}} onCompositionEnd={() => {}} onItem={() => {}} />{index > 0 && <span className="page-number">{index + 1}</span>}</div>)}</div>
}

type DoodlePen = 'fountain' | 'monoline' | 'marker' | 'pencil' | 'airbrush' | 'highlighter' | 'eraser'
type DoodleStroke = { color: string; size: number; pen: DoodlePen; points: [number, number, number][]; done?: boolean }
const doodlePens: Record<DoodlePen, { label: string; scale: number; opacity: number; preview: string; options: Parameters<typeof getStroke>[1] }> = {
  fountain: { label: 'Pressure pen', scale: 1.05, opacity: .98, preview: 'pen-pressure', options: { thinning: .72, smoothing: .9, streamline: .68, easing: t => t * t, simulatePressure: true, start: { taper: 3 }, end: { taper: 4 } } },
  monoline: { label: 'Monoline', scale: .86, opacity: .96, preview: 'pen-round', options: { thinning: 0, smoothing: .92, streamline: .78, simulatePressure: false, start: { cap: true }, end: { cap: true } } },
  marker: { label: 'Soft marker', scale: 1.65, opacity: .72, preview: 'pen-marker', options: { thinning: .08, smoothing: .94, streamline: .82, simulatePressure: false, start: { cap: true }, end: { cap: true } } },
  pencil: { label: 'Colored pencil', scale: .56, opacity: .66, preview: 'pen-pencil', options: { thinning: .38, smoothing: .84, streamline: .76, simulatePressure: true, start: { taper: 2 }, end: { taper: 3 } } },
  airbrush: { label: 'Pastel airbrush', scale: 2.1, opacity: .26, preview: 'pen-airbrush', options: { thinning: .08, smoothing: .95, streamline: .86, simulatePressure: false, start: { cap: true }, end: { cap: true } } },
  highlighter: { label: 'Highlighter', scale: 2.5, opacity: .24, preview: 'pen-highlighter', options: { thinning: 0, smoothing: .92, streamline: .82, simulatePressure: false, start: { cap: true }, end: { cap: true } } },
  eraser: { label: 'Eraser', scale: 2.3, opacity: 1, preview: 'pen-eraser', options: { thinning: 0, smoothing: .92, streamline: .8, simulatePressure: false, start: { cap: true }, end: { cap: true } } },
}
const doodleColors = [
  { value: '#50343e', label: 'Mulberry ink' }, { value: '#9e526c', label: 'Berry rose' },
  { value: '#e987a5', label: 'Petal pink' }, { value: '#f3b6c7', label: 'Cloud pink' },
  { value: '#efc57d', label: 'Butter cream' }, { value: '#a8c9a8', label: 'Meadow sage' },
  { value: '#8fbcd4', label: 'Daydream blue' }, { value: '#b8a3d7', label: 'Lilac mist' },
  { value: '#eab7a3', label: 'Peach milk' }, { value: '#f5e8dd', label: 'Paper white' },
]

function doodlePath(points: [number, number, number][], stroke: DoodleStroke, width: number, height: number) {
  const pen = doodlePens[stroke.pen]
  const outline = getStroke(points.map(([x, y, pressure]) => [x * width, y * height, pressure]), { ...pen.options, size: stroke.size * pen.scale, last: stroke.done })
  const path = new Path2D()
  if (!outline.length) return path
  path.moveTo(outline[0][0], outline[0][1])
  for (let index = 1; index < outline.length - 1; index++) {
    const point = outline[index], next = outline[index + 1]
    path.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2)
  }
  path.closePath()
  return path
}

function Doodle({ onAdd, onCancel }: { onAdd: (data: string) => void; onCancel: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null); const drawing = useRef<number | null>(null); const [strokes, setStrokes] = useState<DoodleStroke[]>([]); const [redoStrokes, setRedoStrokes] = useState<DoodleStroke[]>([]); const [ink, setInk] = useState(doodleColors[0].value); const [brush, setBrush] = useState(11); const [pen, setPen] = useState<DoodlePen>('fountain')
  const paint = useCallback(() => {
    const surface = canvas.current; if (!surface) return
    const rect = surface.getBoundingClientRect(), scale = Math.min(devicePixelRatio || 1, 2)
    if (surface.width !== Math.round(rect.width * scale) || surface.height !== Math.round(rect.height * scale)) { surface.width = Math.round(rect.width * scale); surface.height = Math.round(rect.height * scale) }
    const context = surface.getContext('2d')!; context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, rect.width, rect.height)
    for (const stroke of strokes) {
      const tool = doodlePens[stroke.pen]
      context.save(); context.globalAlpha = tool.opacity; context.fillStyle = stroke.color
      if (stroke.pen === 'eraser') context.globalCompositeOperation = 'destination-out'
      else if (stroke.pen === 'highlighter' || stroke.pen === 'marker') context.globalCompositeOperation = 'multiply'
      if (stroke.pen === 'airbrush') { context.shadowColor = stroke.color; context.shadowBlur = Math.max(10, stroke.size * 1.8) }
      context.fill(doodlePath(stroke.points, stroke, rect.width, rect.height)); context.restore()
      if (stroke.pen === 'pencil') {
        context.save(); context.globalAlpha = .18; context.fillStyle = stroke.color; context.translate(.7, -.45)
        context.fill(doodlePath(stroke.points, stroke, rect.width, rect.height)); context.restore()
      }
    }
  }, [strokes])
  useLayoutEffect(() => { const observer = new ResizeObserver(paint); if (canvas.current) observer.observe(canvas.current); paint(); return () => observer.disconnect() }, [paint])
  function draw(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const point = (value: globalThis.PointerEvent): [number, number, number] => [(value.clientX - rect.left) / rect.width, (value.clientY - rect.top) / rect.height, value.pressure > 0 ? value.pressure : .5]
    if (event.type === 'pointerdown') { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drawing.current = strokes.length; setRedoStrokes([]); setStrokes(value => [...value, { color: ink, size: brush, pen, points: [point(event.nativeEvent)] }]); return }
    if (drawing.current === null) return
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent]
    setStrokes(value => value.map((stroke, index) => index === drawing.current ? { ...stroke, points: [...stroke.points, ...events.map(point)] } : stroke))
  }
  function finishStroke() {
    const index = drawing.current; drawing.current = null
    if (index !== null) setStrokes(value => value.map((stroke, strokeIndex) => strokeIndex === index ? { ...stroke, done: true } : stroke))
  }
  function undoStroke() { setStrokes(value => { const last = value.at(-1); if (last) setRedoStrokes(items => [...items, last]); return value.slice(0, -1) }) }
  function redoStroke() { setRedoStrokes(value => { const last = value.at(-1); if (last) setStrokes(items => [...items, last]); return value.slice(0, -1) }) }
  function finish() {
    paint(); const source = canvas.current; if (!source || !strokes.length) return
    const context = source.getContext('2d')!, pixels = context.getImageData(0, 0, source.width, source.height), data = pixels.data
    let left = source.width, top = source.height, right = -1, bottom = -1
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) if (data[(y * source.width + x) * 4 + 3] > 4) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y) }
    if (right < left) return
    const pad = Math.round(Math.min(source.width, source.height) * .035); left = Math.max(0, left - pad); top = Math.max(0, top - pad); right = Math.min(source.width - 1, right + pad); bottom = Math.min(source.height - 1, bottom + pad)
    const output = document.createElement('canvas'); output.width = right - left + 1; output.height = bottom - top + 1
    output.getContext('2d')!.drawImage(source, left, top, output.width, output.height, 0, 0, output.width, output.height)
    onAdd(output.toDataURL('image/png'))
  }
  return <div className="doodle-area" role="dialog" aria-modal="true" aria-label="Doodle on your letter"><header className="doodle-header"><button onClick={onCancel}>Cancel</button><div><strong>Draw a little something</strong><small>{doodlePens[pen].label}</small></div><div><button onClick={undoStroke} disabled={!strokes.length} aria-label="Undo drawing stroke"><Icon.Undo /></button><button onClick={redoStroke} disabled={!redoStrokes.length} aria-label="Redo drawing stroke"><Icon.Redo /></button><button className="doodle-done" disabled={!strokes.length} onClick={finish}>Keep it</button></div></header><div className="doodle-canvas-wrap"><canvas ref={canvas} onPointerDown={draw} onPointerMove={draw} onPointerUp={finishStroke} onPointerCancel={finishStroke} aria-label="Drawing canvas"/><label className="brush-size"><span>Size</span><input type="range" min="3" max="28" value={brush} onChange={event => setBrush(Number(event.target.value))} /></label></div><div className="doodle-controls"><div className="doodle-pens" role="toolbar" aria-label="Drawing tools">{(Object.entries(doodlePens) as [DoodlePen, (typeof doodlePens)[DoodlePen]][]).map(([id, value]) => <button key={id} aria-pressed={pen === id} aria-label={value.label} title={value.label} onClick={() => setPen(id)}><span className={`pen-preview ${value.preview}`} aria-hidden><i style={{ background: id === 'eraser' ? '#f7f0eb' : ink }} /></span></button>)}</div><div className={`doodle-inks${pen === 'eraser' ? ' is-disabled' : ''}`} aria-label="Soft pastel ink colors">{doodleColors.map(color => <button key={color.value} disabled={pen === 'eraser'} aria-pressed={ink === color.value} aria-label={`Use ${color.label}`} title={color.label} style={{ background: color.value }} onClick={() => setInk(color.value)} />)}</div></div></div>
}

export function Reader({ memory, sender, demo, sampleBody, kept, onKeep, onClose, onOpened, onReply }: {
  memory: Memory; sender: string; demo: boolean; sampleBody?: string; kept: boolean; onKeep: () => void; onClose: () => void; onOpened: () => void; onReply: () => void
}) {
  const { user } = useSession(); const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed'); const [content, setContent] = useState<LetterContent | null>(null); const [error, setError] = useState(''); const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(false); const root = usePageFocus(onClose); const alive = useRef(true)
  useEffect(() => { alive.current = true; const timer = setInterval(() => setNow(Date.now()), 1000); return () => { alive.current = false; clearInterval(timer) } }, [])
  const locked = isSealed(memory, now)
  async function open() { if (locked || busy) return; setBusy(true); setError(''); setPhase('opening'); play('seal'); const [body] = await Promise.all([demo ? Promise.resolve(sampleBody ?? '') : readLetterBody(memory.id), new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450))]); if (!alive.current) return; if (body === null) { setError("We couldn't open this letter yet. Check your connection and try again."); setPhase('sealed'); setBusy(false); return } setContent(decodeLetter(body)); onOpened(); setPhase('open'); setBusy(false); play('rustle'); if (!demo && user && memory.senderId !== user.uid && !memory.viewedAt) markViewed(memory.id).catch(() => {}) }
  return <div className="workspace-overlay reader reader-v2" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={memory.title || 'Read your letter'}><header className="workspace-header"><button className="back-button" aria-label="Back to your letters" onClick={onClose}><Icon.Back /><span>Letters</span></button><span className="workspace-title">{phase === 'open' ? 'A moment, just for you' : 'Something with your name on it'}</span><button className="secondary" onClick={onKeep} aria-pressed={kept}><Icon.Heart />{kept ? 'Kept close' : 'Keep this'}</button></header><AnimatePresence mode="wait">{phase !== 'open' ? <motion.section key="envelope" className={`reader-envelope${phase === 'opening' ? ' is-opening' : ''}`} exit={{ opacity: 0, y: 50 }}><DetailsAsset name="crescentMoon" className="reader-moon" /><span className="little-label">A LETTER FROM {sender.toUpperCase()}</span><h1>{memory.title || 'Just for you'}</h1><p className="reader-envelope-note">A small pocket of their day, made just for you.</p><EnvelopeSealed envelopeId={memory.envelope} state={phase === 'opening' ? 'open' : 'sealed'} onClick={() => void open()} disabled={locked || busy} className="open-envelope" label="Break the seal and open your letter"/>{locked ? <div className="locked-note"><h2>Something lovely is waiting.</h2><p>This envelope opens {memory.unlockAt?.toDate().toLocaleString()}.</p></div> : <><p className="handwritten">Find a quiet moment. Then go on. ♡</p><HapticButton className="primary break-seal" disabled={busy} label="Break the seal" onPress={() => void open()}>{busy ? 'Unfolding your letter…' : 'Break the seal'}</HapticButton></>}{error && <p className="error" role="alert">{error}</p>}</motion.section> : <motion.div key="content" className="reader-letter-stage" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>{content?.version === 2 ? <LetterPages content={content} paperId={memory.paper ?? ''} title={memory.title ?? ''} date={memory.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' }) ?? ''} /> : content ? <StationeryPaper paperId={memory.paper ?? ''} fontFamily={fonts[migrateV1(content).style]} className="reader-letter-paper legacy-reader-paper"><span className="letter-date">{memory.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' })}</span><h1 className="reading-title">{memory.title}</h1><LegacyContent content={content} /></StationeryPaper> : null}<div className="reader-reply"><button className="reader-reply-btn" onClick={onReply}>Write back <Icon.Nib /></button></div></motion.div>}</AnimatePresence></div>
}

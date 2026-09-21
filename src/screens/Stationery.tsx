import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import getStroke from 'perfect-freehand'
import { useSession } from '../lib/session'
import { isSealed, markViewed, readLetterBody, type Memory } from '../lib/db'
import { decodeLetter, encodeLetter, envelopes, fileData, fonts, photoData, stationery, type Draft, type LetterBlock, type LetterContent } from '../lib/letters'
import { play } from '../lib/sound'
import { Icon } from '../components/ui'
import { EnvelopeSealed } from '../components/EnvelopeSealed'
import { StationeryPaper } from '../components/StationeryPaper'
import { DetailsAsset, isDetailAsset, type DetailAssetName } from '../components/DetailsAsset'

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type PlacedDetail = {
  id: string
  name: DetailAssetName
  /** left offset as % of paper width */
  x: number
  /** top offset as % of paper height */
  y: number
  /** width as % of paper width */
  size: number
  rotation?: number
}

/* ─── Detail palette choices (All 24 illustrated stickers) ─────────────── */

const detailChoices: { id: DetailAssetName; label: string }[] = [
  { id: 'botanical', label: 'Pressed florals' },
  { id: 'bow', label: 'Silk ribbon bow' },
  { id: 'waxSeal', label: 'Heart wax seal' },
  { id: 'stamps', label: 'Keepsake stamps' },
  { id: 'stampCat', label: 'Cat postage' },
  { id: 'stampTulip', label: 'Tulip postage' },
  { id: 'heartNote', label: 'Heart note' },
  { id: 'smallProgress', label: 'Deckled note' },
  { id: 'noteLined', label: 'Lined paper' },
  { id: 'letterNote', label: 'Keepsake note' },
  { id: 'cat', label: 'Sleepy cat' },
  { id: 'petal', label: 'Rose petal' },
  { id: 'cloud', label: 'Soft cloud' },
  { id: 'botanicalFlower', label: 'Peach bloom' },
  { id: 'floralSprig', label: 'Floral sprig' },
  { id: 'washiPink', label: 'Pink washi' },
  { id: 'washiGingham', label: 'Gingham tape' },
  { id: 'washiBeige', label: 'Beige tape' },
  { id: 'tapeHearts', label: 'Hearts tape' },
  { id: 'paperclip', label: 'Heart clip' },
  { id: 'miniEnvelope', label: 'Mini envelope' },
  { id: 'withLoveTag', label: 'With love tag' },
  { id: 'justForYouTag', label: 'For you tag' },
  { id: 'datePill', label: 'Date label' },
  { id: 'waxSealSmall', label: 'Petite seal' },
]

/* ─── Keyboard / focus trap ──────────────────────────────────────────────── */

function usePageFocus(onClose: () => void) {
  const root = useRef<HTMLDivElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    root.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
      if (e.key !== 'Tab') return
      const elements = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, audio, [tabindex="0"]')
      if (!elements?.length) return
      const first = elements[0], last = elements[elements.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handler)
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = old; previous?.focus() }
  }, [])
  return root
}

/* ─── Composer ───────────────────────────────────────────────────────────── */

export function Composer({ initial, sender, recipient, demo, onSave, onSend, onClose, onSent }: {
  initial: Draft; sender: string; recipient: string; demo: boolean
  onSave: (draft: Draft) => Promise<void>; onSend: (draft: Draft) => Promise<void>; onClose: () => void; onSent: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const defaultBlocks = initial.blocks.length > 0
      ? initial.blocks
      : [{ id: crypto.randomUUID(), kind: 'text' as const, value: '' }]
    return {
      ...initial,
      envelope: initial.envelope || envelopes[0].id,
      greeting: initial.greeting || `Dear ${recipient},`,
      blocks: defaultBlocks,
      placedDetails: (initial.placedDetails ?? []).filter((detail): detail is PlacedDetail => isDetailAsset(detail.name)),
    }
  })
  const [phase, setPhase] = useState<'write' | 'preview' | 'seal' | 'sent'>('write')
  const [tool, setTool] = useState('Paper')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [draggingDetail, setDraggingDetail] = useState<DetailAssetName | null>(null)
  const [activePlaced, setActivePlaced] = useState<string | null>(null)

  const panel = useRef<HTMLElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const paperRef = useRef<HTMLElement>(null)
  const photoFrame = useRef<LetterBlock['frame']>('polaroid')
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopped = useRef(false)
  const savedDraft = useRef(initial)
  const currentDraft = useRef(draft); currentDraft.current = draft

  const chooseTool = (name: string) => {
    setTool(name)
    if (window.matchMedia('(max-width: 800px)').matches) {
      panel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    }
  }

  const close = async () => {
    if (busy || recording) { setError('Finish the current action before closing your letter.'); return }
    try { if (currentDraft.current !== savedDraft.current) await onSave({ ...currentDraft.current, updated: Date.now() }); onClose() }
    catch { setError("Your draft couldn't be saved. Keep this window open and try saving again.") }
  }

  const root = usePageFocus(() => { void close() })

  useEffect(() => {
    stopped.current = false
    const warn = (e: BeforeUnloadEvent) => { if (currentDraft.current !== savedDraft.current) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      stopped.current = true
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(t => t.stop())
      if (recordTimer.current) clearInterval(recordTimer.current)
    }
  }, [])

  function change(patch: Partial<Draft>) { setDraft(d => ({ ...d, ...patch })); setSaved(false) }

  const placedDetails = (draft.placedDetails ?? []) as PlacedDetail[]
  function setPlacedDetails(update: (previous: PlacedDetail[]) => PlacedDetail[]) {
    setDraft(previous => ({ ...previous, placedDetails: update((previous.placedDetails ?? []) as PlacedDetail[]) }))
    setSaved(false)
  }

  function addBlock(kind: LetterBlock['kind'], value = '', extra: Pick<LetterBlock, 'frame'> = {}) {
    const id = crypto.randomUUID()
    setDraft(d => {
      const count = d.blocks.filter(block => block.kind === kind).length
      const placed = kind === 'text'
        ? { x: 7 + (count % 2) * 5, y: Math.min(72, 10 + count * 19), size: 78, rotation: 0 }
        : { x: count % 2 ? 48 : 8, y: Math.min(72, 38 + count * 13), size: kind === 'voice' ? 52 : 42, rotation: 0 }
      return { ...d, blocks: [...d.blocks, { id, kind, value, ...placed, ...extra }] }
    })
    setActivePlaced(id)
    setSaved(false)
  }

  function removeBlock(id: string) {
    setDraft(d => {
      const next = d.blocks.filter(b => b.id !== id)
      return { ...d, blocks: next.length > 0 ? next : [{ id: crypto.randomUUID(), kind: 'text', value: '' }] }
    })
    setSaved(false)
  }

  /* ── Draggable details on canvas ── */
  const handleDetailDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    if (!draggingDetail || !paperRef.current) return
    const rect = paperRef.current.getBoundingClientRect()
    const xPct = Math.min(85, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100))
    const yPct = Math.min(85, Math.max(5, ((e.clientY - rect.top) / rect.height) * 100))
    const placed: PlacedDetail = { id: crypto.randomUUID(), name: draggingDetail, x: Math.round(xPct), y: Math.round(yPct), size: 24, rotation: 0 }
    setPlacedDetails(prev => [...prev, placed])
    setDraggingDetail(null)
    play('rustle')
  }, [draggingDetail])

  function removePlaced(id: string) { setPlacedDetails(prev => prev.filter(p => p.id !== id)) }
  function addPlacedDetail(name: DetailAssetName) {
    const id = crypto.randomUUID()
    const x = placedDetails.length % 2 === 0 ? 65 : 10
    const y = Math.min(75, 18 + placedDetails.length * 14)
    setPlacedDetails(prev => [...prev, { id, name, x, y, size: 24, rotation: 0 }])
    setActivePlaced(id)
    play('rustle')
  }

  /* ── Photo ── */
  async function photo(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try {
      addBlock('photo', await photoData(file), { frame: photoFrame.current })
      play('rustle')
    }
    catch(e) { setError((e as Error).message) }
    finally { setBusy(false); if (upload.current) upload.current.value = '' }
  }

  /* ── Voice recording ── */
  async function record() {
    if (recording) { recorder.current?.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording isn't supported in this browser. Try Safari or Chrome."); return
    }
    setError(''); setBusy(true)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t))
      const media = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 })
      recorder.current = media; const chunks: Blob[] = []; let seconds = 0
      media.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      media.onstop = async () => {
        stream.current?.getTracks().forEach(t => t.stop())
        if (recordTimer.current) clearInterval(recordTimer.current)
        if (stopped.current) return
        setRecording(false)
        try {
          const blob = new Blob(chunks, { type: media.mimeType })
          if (blob.size > 450_000) throw new Error('That recording is too large. Try a shorter voice note.')
          addBlock('voice', await fileData(blob))
          play('chime')
        } catch(e) { setError((e as Error).message) }
      }
      media.start(); setRecording(true); setRecordSeconds(0)
      play('rustle')
      recordTimer.current = setInterval(() => { seconds++; setRecordSeconds(seconds); if (seconds >= 60 && media.state === 'recording') media.stop() }, 1000)
    } catch {
      stream.current?.getTracks().forEach(t => t.stop())
      setError("Microphone access wasn't available. Allow it in your browser settings.")
    } finally { setBusy(false) }
  }

  function preview() { try { encodeLetter(draft); setError(''); setPhase('preview'); play('rustle') } catch(e) { setError((e as Error).message) } }

  async function save() {
    setBusy(true); setError('')
    try { const next = { ...draft, updated: Date.now() }; await onSave(next); savedDraft.current = draft; setSaved(true) }
    catch { setError("Your draft couldn't be saved on this device. Keep this page open and try again.") }
    finally { setBusy(false) }
  }

  async function send() {
    setBusy(true); setError('')
    try { await onSave({ ...draft, updated: Date.now() }); savedDraft.current = draft; await onSend(draft); setPhase('sent'); play('chime') }
    catch(e) { setError((e as Error).message || "Your letter couldn't be sent. Your draft is still here.") }
    finally { setBusy(false) }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Single primary text content for cozy fluid writing
  const textBlocks = draft.blocks.filter(b => b.kind === 'text')
  const mediaBlocks = draft.blocks.filter(b => b.kind !== 'text')
  const allText = textBlocks.map(block => block.value).join('\n')
  const density = letterDensity(allText)
  const canvasHeight = Math.max(460, 390 + allText.length * .48 + (draft.blocks.length - 1) * 55)

  return (
    <div className="workspace-overlay" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Write a letter">
      <header className="workspace-header">
        <button className="back-button" aria-label="Back to your letters" onClick={close} disabled={busy || recording}>
          <Icon.Back /><span>Letters</span>
        </button>
        <span className="workspace-title">
          {phase === 'write' ? 'A quiet letter' : phase === 'preview' ? 'One last look' : phase === 'seal' ? 'Ready to seal' : 'A little closer'}
        </span>
        <div>
          {phase === 'write' && <>
            <button className="secondary" onClick={save} disabled={busy || recording}>{saved ? 'Saved ✓' : busy ? 'Saving…' : 'Save draft'}</button>
            <button className="primary" onClick={preview} disabled={busy || recording}>Preview <span>→</span></button>
          </>}
          {phase === 'preview' && <>
            <button className="secondary" onClick={() => setPhase('write')}>Keep writing</button>
            <button className="primary" onClick={() => { setPhase('seal'); play('rustle') }}>Fold & seal ♡</button>
          </>}
          {phase === 'seal' && <button className="text-button" disabled={busy} onClick={() => setPhase('preview')}>Back to preview</button>}
        </div>
      </header>

      {error && <div className="composer-error" role="alert">{error}</div>}
      {drawing && phase === 'write' && (
        <Doodle onAdd={value => { addBlock('doodle', value); setDrawing(false) }} onCancel={() => setDrawing(false)} />
      )}

      <AnimatePresence mode="wait">
        {(phase === 'write' || phase === 'preview') ? (
          <motion.div key="paper" className={`composer-layout ${phase === 'preview' ? 'preview-mode' : ''}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scaleY: 0.08, rotateX: 35 }} transition={{ duration: .35 }}>

            {/* ── Left tool rail ── */}
            {phase === 'write' && (
              <aside className="writing-tools" aria-label="Add to your letter">
                <button onClick={() => addBlock('text')}><Icon.Type />Add text</button>
                <button onClick={() => setDrawing(!drawing)} aria-pressed={drawing}><Icon.Nib />Doodle</button>
                <button onClick={() => upload.current?.click()} disabled={busy}><Icon.Camera />Photo</button>
                <button onClick={record} aria-pressed={recording} className={recording ? 'recording' : ''}>
                  {recording ? <span className="rec-dot">●</span> : <Icon.Voice />}
                  {recording ? `${formatTime(recordSeconds)}` : 'Voice'}
                </button>
                <hr />
                <button onClick={() => chooseTool('Paper')} className={tool === 'Paper' ? 'selected' : ''}><Icon.Paper />Paper</button>
                <button onClick={() => chooseTool('Envelope')} className={tool === 'Envelope' ? 'selected' : ''}><Icon.Letter />Envelope</button>
                <button onClick={() => chooseTool('Fonts')} className={tool === 'Fonts' ? 'selected' : ''}><span>Aa</span>Fonts</button>
                <button onClick={() => chooseTool('Details')} className={tool === 'Details' ? 'selected' : ''}><Icon.Sparkle />Details</button>
                <input type="file" hidden ref={upload} accept="image/*" onChange={e => photo(e.target.files?.[0])} />
              </aside>
            )}

            {/* ── Paper canvas ── */}
            <div className="paper-stage">
              <div className="paper-overline">
                <span>To {recipient}</span>
                <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
              </div>

              <StationeryPaper paperId={draft.paper} fontFamily={fonts[draft.font]} className={`letter-paper ${density}`}
                ref={paperRef as React.Ref<HTMLElement>}
                onDragOver={phase === 'write' ? e => e.preventDefault() : undefined}
                onDrop={phase === 'write' ? handleDetailDrop : undefined}>

                <div className="letter-salutation">Dear {recipient},</div>

                {/* Recording live banner */}
                {recording && phase === 'write' && (
                  <div className="voice-recording-card" role="status">
                    <div className="recording-waveform">
                      <span /><span /><span /><span /><span /><span /><span />
                    </div>
                    <div className="recording-info">
                      <span className="rec-label">Recording your voice note</span>
                      <span className="rec-timer">● {formatTime(recordSeconds)} / 1:00</span>
                    </div>
                    <button className="rec-finish-btn" onClick={record}>Finish recording ✓</button>
                  </div>
                )}

                {/* Paper canvas: prose + absolutely-positioned stickers */}
                <div className="letter-fluid-body" style={{ minHeight: canvasHeight }}>
                  {textBlocks.map((block, index) => phase === 'write' ? (
                    <CanvasItem
                      key={block.id}
                      item={{ x: block.x ?? 7, y: block.y ?? (10 + index * 19), size: block.size ?? 86, rotation: block.rotation ?? 0 }}
                      active={activePlaced === block.id}
                      onActivate={() => setActivePlaced(block.id)}
                      onRemove={() => { removeBlock(block.id); setActivePlaced(null) }}
                      onMove={(x, y) => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, x, y } : item) })}
                      onResize={size => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, size } : item) })}
                      onRotate={rotation => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, rotation } : item) })}
                      paperRef={paperRef}
                      label={`Text box ${index + 1}`}
                    >
                      <GrowingTextarea
                        className={`letter-prose-editor letter-text-box ${letterDensity(block.value)}`}
                        aria-label={`Text box ${index + 1}`}
                        placeholder={index === 0 ? 'Take your time. Write whatever is on your heart today…' : 'Write something…'}
                        value={block.value}
                        onFocus={() => setActivePlaced(block.id)}
                        onChange={e => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, value: e.target.value } : item) })}
                      />
                    </CanvasItem>
                  ) : <PlacedTextStatic key={block.id} block={block} index={index} />)}

                  {/* Placed sticker overlay — absolutely positioned, doesn't interrupt text flow */}
                  {placedDetails.map(pd => phase === 'write' ? (
                    <CanvasItem
                      key={pd.id}
                      item={{ ...pd, rotation: pd.rotation ?? 0 }}
                      active={activePlaced === pd.id}
                      onActivate={() => setActivePlaced(activePlaced === pd.id ? null : pd.id)}
                      onRemove={() => { removePlaced(pd.id); setActivePlaced(null) }}
                      onMove={(x, y) => setPlacedDetails(prev => prev.map(p => p.id === pd.id ? { ...p, x, y } : p))}
                      onResize={(size) => setPlacedDetails(prev => prev.map(p => p.id === pd.id ? { ...p, size } : p))}
                      onRotate={rotation => setPlacedDetails(prev => prev.map(p => p.id === pd.id ? { ...p, rotation } : p))}
                      paperRef={paperRef}
                      label={`Sticker ${pd.name}`}
                    ><DetailsAsset name={pd.name} /></CanvasItem>
                  ) : (
                    <PlacedDetailStatic key={pd.id} placed={pd} />
                  ))}

                  {mediaBlocks.map(block => phase === 'write' ? (
                    <CanvasItem
                      key={block.id}
                      item={{ x: block.x ?? 8, y: block.y ?? 52, size: block.size ?? (block.kind === 'voice' ? 52 : 42), rotation: block.rotation ?? 0 }}
                      active={activePlaced === block.id}
                      onActivate={() => setActivePlaced(activePlaced === block.id ? null : block.id)}
                      onRemove={() => { removeBlock(block.id); setActivePlaced(null) }}
                      onMove={(x, y) => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, x, y } : item) })}
                      onResize={size => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, size } : item) })}
                      onRotate={rotation => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, rotation } : item) })}
                      paperRef={paperRef}
                      label={block.kind === 'photo' ? 'Photo' : block.kind === 'doodle' ? 'Doodle' : 'Voice note'}
                    >
                      <Block block={block} onFrameChange={block.kind === 'photo' ? frame => change({ blocks: draft.blocks.map(item => item.id === block.id ? { ...item, frame } : item) }) : undefined} />
                    </CanvasItem>
                  ) : <PlacedMediaStatic key={block.id} block={block} />)}
                </div>

                {draft.decoration && <Decoration value={draft.decoration} />}
              </StationeryPaper>


              <p className="paper-footnote">
                {phase === 'write' ? "A few words are enough. It's the thought that travels." : 'Everything here will be tucked inside your envelope.'}
              </p>
            </div>

            {/* ── Right customization panel ── */}
            {phase === 'write' && (
              <aside className="customization" ref={panel}>
                <div className="customize-heading"><h2>Make it yours.</h2><p>A little personality on paper.</p></div>
                <div className="customize-tabs">
                  {['Paper', 'Envelope', 'Fonts', 'Details'].map(t => (
                    <button key={t} className={tool === t ? 'active' : ''} aria-pressed={tool === t} onClick={() => chooseTool(t)}>{t}</button>
                  ))}
                </div>

                {tool === 'Paper' && <>
                  <div className="stationery-intro"><span>From the stationery drawer</span><strong>{stationery.length} papers for every kind of thought.</strong></div>
                  <div className="paper-options">
                    {stationery.map(paper => (
                      <button key={paper.id} className={draft.paper === paper.id ? 'chosen' : ''} onClick={() => change({ paper: paper.id })} aria-pressed={draft.paper === paper.id}>
                        <span className="paper-swatch"><img src={paper.url} alt="" aria-hidden />{draft.paper === paper.id && <b>✓</b>}</span>
                        <strong>{paper.name}</strong><small>{paper.mood}</small>
                      </button>
                    ))}
                  </div>
                </>}

                {tool === 'Envelope' && <>
                  <div className="stationery-intro"><span>Choose the first impression</span><strong>A little hello before they reach the words inside.</strong></div>
                  <div className="envelope-options">
                    {envelopes.map(envelope => (
                      <button key={envelope.id} className={draft.envelope === envelope.id ? 'chosen' : ''} onClick={() => change({ envelope: envelope.id })} aria-pressed={draft.envelope === envelope.id}>
                        <span className="envelope-swatch"><EnvelopeSealed envelopeId={envelope.id} />{draft.envelope === envelope.id && <b>✓</b>}</span>
                        <strong>{envelope.name}</strong><small>{envelope.badge}</small>
                      </button>
                    ))}
                  </div>
                </>}

                {tool === 'Fonts' && (
                  <div className="font-options">
                    {Object.entries(fonts).map(([name, font]) => (
                      <button key={name} aria-pressed={draft.font === name} className={draft.font === name ? 'chosen' : ''} onClick={() => change({ font: name })}>
                        <span style={{ fontFamily: font }}>Dear you,</span>
                        <small>{name}</small>
                      </button>
                    ))}
                  </div>
                )}

                {tool === 'Details' && <>
                  <h3>Stickers & keepsakes</h3>
                  <p className="tool-note details-hint">Tap any keepsake to add it to your letter, or drag it straight onto the paper.</p>
                  <div className="decoration-options">
                    {detailChoices.map(detail => (
                      <div key={detail.id}
                        className="detail-tile"
                        draggable
                        onDragStart={() => setDraggingDetail(detail.id)}
                        onDragEnd={() => setDraggingDetail(null)}
                        aria-label={`Add ${detail.label} to the letter`}
                        role="button"
                        tabIndex={0}
                        onClick={() => addPlacedDetail(detail.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            addPlacedDetail(detail.id)
                          }
                        }}
                      >
                        <DetailsAsset name={detail.id} />
                        <span>{detail.label}</span>
                      </div>
                    ))}
                  </div>
                </>}

                <div className="desk-tip"><Icon.Nib /><p>Make a mark.<br />It doesn't have to be perfect<br />to feel like you.</p></div>
              </aside>
            )}
          </motion.div>

        ) : phase === 'seal' ? (
          <motion.section key="seal" className="sealing-stage"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }}>
            <span className="little-label">A LITTLE PIECE OF YOU</span>
            <h1>Ready for their letterbox.</h1>
            <p>From {sender} to {recipient}.</p>
            <EnvelopeSealed envelopeId={draft.envelope} className="seal-envelope" />
            <label className="delivery-label">When can they open it?
              <input type="datetime-local" value={draft.unlockAt} onChange={e => change({ unlockAt: e.target.value })} />
            </label>
            <p className="tool-note">{draft.unlockAt ? 'Your words stay sealed until this time.' : 'Leave empty for a lovely surprise right now.'}</p>
            <button className="primary" onClick={send} disabled={busy}>
              {busy ? 'Sending your letter…' : demo ? 'Send sample letter ↗' : 'Send this little letter ↗'}
            </button>
            {demo && <small>Preview only. This won't be sent to anyone.</small>}
          </motion.section>

        ) : (
          <motion.section key="sent" className="sent-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="sent-heart">♡</span>
            <h1>A little closer, already.</h1>
            <p>{demo ? 'Your sample letter is in Sent for this preview session.' : `Your letter is waiting for ${recipient}.`}</p>
            <button className="primary" onClick={onSent}>Back to the letterbox →</button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

function letterDensity(text: string) {
  return text.length > 1800 ? 'letter-density-tight' : text.length > 950 ? 'letter-density-compact' : ''
}

function GrowingTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [props.value])
  return <textarea {...props} ref={ref} rows={1} />
}

/* One interaction model for stickers, photos, sketches, and voice notes. */
function CanvasItem({ item, active, onActivate, onRemove, onMove, onResize, onRotate, paperRef, label, children }: {
  item: { x: number; y: number; size: number; rotation: number }
  active: boolean
  onActivate: () => void
  onRemove: () => void
  onMove: (x: number, y: number) => void
  onResize: (size: number) => void
  onRotate: (rotation: number) => void
  paperRef: React.RefObject<HTMLElement | null>
  label: string
  children: ReactNode
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ cx: number; cy: number; x: number; y: number; size: number; distance: number } | null>(null)
  const resizeStart = useRef<{ x: number; size: number } | null>(null)
  const rotating = useRef(false)
  const didDrag = useRef(false)

  function beginGesture() {
    const points = [...pointers.current.values()]
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length
    const distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0
    gesture.current = { cx, cy, x: item.x, y: item.y, size: item.size, distance }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.canvas-item-actions, .canvas-transform-handle, .photo-frame-toggle, .voice-illustrated-card, textarea')) return
    e.preventDefault()
    e.stopPropagation()
    elRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    beginGesture()
    didDrag.current = false
    if (!active) onActivate()
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current || !paperRef.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = paperRef.current.getBoundingClientRect()
    const points = [...pointers.current.values()]
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length
    const dx = ((cx - gesture.current.cx) / rect.width) * 100
    const dy = ((cy - gesture.current.cy) / rect.height) * 100
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) didDrag.current = true
    if (points.length > 1 && gesture.current.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      onResize(Math.min(72, Math.max(10, gesture.current.size * distance / gesture.current.distance)))
      didDrag.current = true
    }
    onMove(Math.min(92, Math.max(0, gesture.current.x + dx)), Math.min(92, Math.max(0, gesture.current.y + dy)))
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size) beginGesture()
    else gesture.current = null
    didDrag.current = false
  }

  function resizeDown(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeStart.current = { x: e.clientX, size: item.size }
  }

  function resizeMove(e: PointerEvent<HTMLButtonElement>) {
    if (!resizeStart.current || !paperRef.current) return
    const dx = (e.clientX - resizeStart.current.x) / paperRef.current.getBoundingClientRect().width * 100
    onResize(Math.min(72, Math.max(10, resizeStart.current.size + dx)))
  }

  return (
    <div
      ref={elRef}
      className={`canvas-item${active ? ' is-active' : ''}`}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.size}%`,
        zIndex: active ? 20 : 8,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => { if (!active && !didDrag.current) onActivate() }}
      onKeyDown={e => {
        const step = e.shiftKey ? 5 : 1
        if (e.key === 'ArrowLeft') onMove(Math.max(0, item.x - step), item.y)
        else if (e.key === 'ArrowRight') onMove(Math.min(92, item.x + step), item.y)
        else if (e.key === 'ArrowUp') onMove(item.x, Math.max(0, item.y - step))
        else if (e.key === 'ArrowDown') onMove(item.x, Math.min(92, item.y + step))
        else if (e.key === 'Delete' || e.key === 'Backspace') onRemove()
        else if (e.key === 'Enter' || e.key === ' ') onActivate()
        else return
        e.preventDefault()
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label}, draggable and resizable`}
    >
      <div className="canvas-item-content" style={{ transform: `rotate(${item.rotation}deg)` }}>{children}</div>
      {active && (
        <>
          <div className="canvas-item-actions" onPointerDown={e => e.stopPropagation()}>
            <button type="button" onClick={() => onResize(Math.max(10, item.size - 4))} aria-label={`Make ${label.toLowerCase()} smaller`}>−</button>
            <span>{Math.round(item.size)}%</span>
            <button type="button" onClick={() => onResize(Math.min(72, item.size + 4))} aria-label={`Make ${label.toLowerCase()} bigger`}>+</button>
            <button type="button" className="canvas-remove" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`}>×</button>
          </div>
          <button type="button" className="canvas-resize-handle" aria-label={`Resize ${label.toLowerCase()}`}
            onPointerDown={resizeDown} onPointerMove={resizeMove}
            onPointerUp={() => { resizeStart.current = null }} onPointerCancel={() => { resizeStart.current = null }} />
          <button type="button" className="canvas-rotate-handle canvas-transform-handle" aria-label={`Rotate ${label.toLowerCase()}`}
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); rotating.current = true }}
            onPointerMove={e => {
              if (!rotating.current || !elRef.current) return
              const rect = elRef.current.getBoundingClientRect()
              const angle = Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 90
              onRotate(Math.round(angle))
            }}
            onPointerUp={() => { rotating.current = false }} onPointerCancel={() => { rotating.current = false }}>↻</button>
        </>
      )}
    </div>
  )
}

function PlacedDetailStatic({ placed }: { placed: PlacedDetail }) {
  return (
    <div
      className="placed-detail-item"
      style={{
        position: 'absolute',
        left: `${placed.x}%`,
        top: `${placed.y}%`,
        width: `${placed.size}%`,
        zIndex: 8,
        transform: `rotate(${placed.rotation ?? 0}deg)`,
      }}
    >
      <DetailsAsset name={placed.name} style={{ display: 'block', width: '100%', height: 'auto' }} />
    </div>
  )
}

function PlacedTextStatic({ block, index }: { block: LetterBlock; index: number }) {
  return (
    <div className="canvas-item canvas-item-static letter-text-static" style={{
      position: 'absolute',
      left: `${block.x ?? 7}%`,
      top: `${block.y ?? (10 + index * 19)}%`,
      width: `${block.size ?? 86}%`,
      transform: `rotate(${block.rotation ?? 0}deg)`,
      zIndex: 7,
    }}>
      <p className={`letter-prose ${letterDensity(block.value)}`}>{block.value}</p>
    </div>
  )
}

function PlacedMediaStatic({ block }: { block: LetterBlock }) {
  return (
    <div className="canvas-item canvas-item-static" style={{
      position: 'absolute',
      left: `${block.x ?? 8}%`,
      top: `${block.y ?? 52}%`,
      width: `${block.size ?? (block.kind === 'voice' ? 48 : 42)}%`,
      zIndex: 8,
      transform: `rotate(${block.rotation ?? 0}deg)`,
    }}>
      <div className="canvas-item-content"><Block block={block} /></div>
    </div>
  )
}


/* ─── Media Block renderer (photo, voice, doodle) ─────────────────────────── */

function Block({ block, onFrameChange }: { block: LetterBlock; onFrameChange?: (frame: NonNullable<LetterBlock['frame']>) => void }) {
  if (block.kind === 'text') return <p className="letter-prose">{block.value}</p>
  if (block.kind === 'voice') return <VoiceBlock src={block.value} />
  if (block.kind === 'doodle') return (
    <figure className="drawn-piece">
      <img src={block.value} alt="A drawing made for this letter" />
    </figure>
  )
  return (
    <figure className={`taped-photo frame-${block.frame ?? 'polaroid'}`}>
      <DetailsAsset
        name={block.frame === 'stamp' ? 'washiGingham' : block.frame === 'deckled' ? 'washiBeige' : 'washiPink'}
        className="photo-tape"
      />
      <img src={block.value} alt="A photograph tucked into this letter" />
      {onFrameChange && (
        <div className="photo-frame-toggle" aria-label="Photo frame style">
          {(['polaroid', 'stamp', 'deckled'] as const).map(frame => (
            <button key={frame} type="button" aria-pressed={(block.frame ?? 'polaroid') === frame} onClick={() => onFrameChange(frame)}>
              {frame}
            </button>
          ))}
        </div>
      )}
    </figure>
  )
}

/* ─── Illustrated Voice Player ────────────────────────────────────────────── */

function VoiceBlock({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  async function toggle() {
    if (!audio.current) return
    if (audio.current.paused) {
      await audio.current.play()
      setPlaying(true)
      play('chime')
    } else {
      audio.current.pause()
      setPlaying(false)
    }
  }

  const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  const progress = duration ? Math.min(100, current / duration * 100) : 0

  return (
    <button
      type="button"
      className={`voice-illustrated-card${playing ? ' is-playing' : ''}`}
      onClick={() => void toggle()}
      aria-label={playing ? 'Pause voice note' : 'Play voice note'}
    >
      <span className="voice-play" aria-hidden>{playing ? 'Ⅱ' : '▶'}</span>
      <span className="voice-player-copy">
        <strong>{playing ? 'Playing your voice note' : 'A little voice note'}</strong>
        <span className="voice-player-wave" style={{ '--voice-progress': `${progress}%` } as React.CSSProperties} aria-hidden>
          {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
        </span>
      </span>
      <span className="voice-time">{time(current)} / {duration ? time(duration) : '0:00'}</span>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={e => { const sec = (e.target as HTMLAudioElement).duration; if (Number.isFinite(sec)) setDuration(sec) }}
        onDurationChange={e => { const sec = (e.target as HTMLAudioElement).duration; if (Number.isFinite(sec)) setDuration(sec) }}
        onTimeUpdate={e => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
      />
    </button>
  )
}

function Decoration({ value }: { value: string }) {
  return (
    <div className="letter-decoration" aria-label="Letter decoration">
      {isDetailAsset(value) ? <DetailsAsset name={value} /> : value}
    </div>
  )
}

function Content({ content }: { content: LetterContent }) {
  const textBlocks = content.blocks.filter(b => b.kind === 'text')
  const mediaBlocks = content.blocks.filter(b => b.kind !== 'text')
  const placed = (content.placedDetails ?? []).filter(detail => isDetailAsset(detail.name))
  const textLength = textBlocks.reduce((sum, block) => sum + block.value.length, 0)
  const canvasHeight = Math.max(460, 390 + textLength * .48 + (content.blocks.length - 1) * 55)

  return (
    <>
      {content.greeting && <div className="letter-salutation">{content.greeting}</div>}
      <div className="letter-fluid-body" style={{ minHeight: canvasHeight }}>
        {placed.map(detail => (
          <PlacedDetailStatic key={detail.id} placed={detail as PlacedDetail} />
        ))}
        {textBlocks.map((block, index) => <PlacedTextStatic key={block.id} block={block} index={index} />)}
        {mediaBlocks.map(block => <PlacedMediaStatic key={block.id} block={block} />)}
      </div>
      {content.decoration && <Decoration value={content.decoration} />}
    </>
  )
}

/* ─── Doodle canvas ──────────────────────────────────────────────────────── */

type DoodleStroke = { color: string; size: number; points: [number, number, number][] }

function Doodle({ onAdd, onCancel }: { onAdd: (data: string) => void; onCancel: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<number | null>(null)
  const [strokes, setStrokes] = useState<DoodleStroke[]>([])
  const [ink, setInk] = useState('#51363d')
  const [brush, setBrush] = useState(9)
  const colors = ['#51363d', '#a34b62', '#ed7894', '#e7b44a', '#5f9279', '#527ca7', '#8f67aa', '#fff7f2']

  const paint = useCallback(() => {
    const c = canvas.current
    if (!c) return
    const rect = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2)
    if (c.width !== Math.round(rect.width * dpr) || c.height !== Math.round(rect.height * dpr)) {
      c.width = Math.round(rect.width * dpr); c.height = Math.round(rect.height * dpr)
    }
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)
    for (const stroke of strokes) {
      const outline = getStroke(stroke.points.map(([x, y, pressure]) => [x * rect.width, y * rect.height, pressure]), {
        size: stroke.size,
        thinning: .68,
        smoothing: .58,
        streamline: .48,
        simulatePressure: true,
        start: { taper: stroke.size * 1.2, cap: true },
        end: { taper: stroke.size * 1.6, cap: true },
      })
      if (!outline.length) continue
      const path = new Path2D(); path.moveTo(outline[0][0], outline[0][1])
      for (let i = 1; i < outline.length; i++) path.lineTo(outline[i][0], outline[i][1])
      path.closePath(); ctx.fillStyle = stroke.color; ctx.fill(path)
    }
  }, [strokes])

  useLayoutEffect(() => {
    const observer = new ResizeObserver(paint)
    if (canvas.current) observer.observe(canvas.current)
    paint()
    return () => observer.disconnect()
  }, [paint])

  function point(event: globalThis.PointerEvent, rect: DOMRect): [number, number, number] {
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, event.pressure > 0 ? event.pressure : .5]
  }

  function draw(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.type === 'pointerdown') {
      e.currentTarget.setPointerCapture(e.pointerId)
      drawing.current = strokes.length
      setStrokes(previous => [...previous, { color: ink, size: brush, points: [point(e.nativeEvent, rect)] }])
      return
    }
    if (drawing.current === null) return
    const events = (e.nativeEvent as globalThis.PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent as globalThis.PointerEvent]
    const next = events.map(event => point(event, rect))
    setStrokes(previous => previous.map((stroke, index) => index === drawing.current ? { ...stroke, points: [...stroke.points, ...next] } : stroke))
  }

  function finish() {
    paint()
    const source = canvas.current
    if (!source) return
    const sourceContext = source.getContext('2d')!
    const pixels = sourceContext.getImageData(0, 0, source.width, source.height)
    let minX = source.width, minY = source.height, maxX = 0, maxY = 0
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        if (pixels.data[(y * source.width + x) * 4 + 3] === 0) continue
        minX = Math.min(minX, x); minY = Math.min(minY, y)
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
      }
    }
    if (minX > maxX || minY > maxY) return
    const padding = Math.round(18 * Math.min(devicePixelRatio || 1, 2))
    const sx = Math.max(0, minX - padding), sy = Math.max(0, minY - padding)
    const width = Math.min(source.width - sx, maxX - minX + padding * 2)
    const height = Math.min(source.height - sy, maxY - minY + padding * 2)
    const output = document.createElement('canvas')
    output.width = width; output.height = height
    output.getContext('2d')!.drawImage(source, sx, sy, width, height, 0, 0, width, height)
    onAdd(output.toDataURL('image/png'))
  }

  return (
    <div className="doodle-area" role="dialog" aria-modal="true" aria-label="Doodle on your letter">
      <header className="doodle-header">
        <button type="button" onClick={onCancel}>Cancel</button>
        <strong>Draw something</strong>
        <div><button type="button" onClick={() => setStrokes(previous => previous.slice(0, -1))} disabled={!strokes.length}>Undo</button><button className="doodle-done" type="button" disabled={!strokes.length} onClick={finish}>Done</button></div>
      </header>
      <div className="doodle-canvas-wrap">
        <canvas ref={canvas} onPointerDown={draw} onPointerMove={draw}
          onPointerUp={() => { drawing.current = null }} onPointerCancel={() => { drawing.current = null }}
          aria-label="Drawing canvas" />
        <label className="brush-size" aria-label="Brush size"><input type="range" min="3" max="26" value={brush} onChange={e => setBrush(Number(e.target.value))} /></label>
      </div>
      <div className="doodle-inks" aria-label="Ink color">
        {colors.map(color => <button key={color} type="button" aria-pressed={ink === color} aria-label={`Use ${color} ink`} style={{ background: color }} onClick={() => setInk(color)} />)}
        <label aria-label="Choose another ink color"><input type="color" value={ink} onChange={e => setInk(e.target.value)} /></label>
      </div>
    </div>
  )
}

/* ─── Reader ─────────────────────────────────────────────────────────────── */

export function Reader({ memory, sender, demo, sampleBody, kept, onKeep, onClose, onOpened, onReply }: {
  memory: Memory; sender: string; demo: boolean; sampleBody?: string; kept: boolean
  onKeep: () => void; onClose: () => void; onOpened: () => void; onReply: () => void
}) {
  const { user } = useSession()
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed')
  const [content, setContent] = useState<LetterContent | null>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const root = usePageFocus(onClose)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => { alive.current = false; clearInterval(t) }
  }, [])

  const locked = isSealed(memory, now)

  async function open() {
    if (locked || busy) return
    setBusy(true); setError(''); setPhase('opening'); play('seal')
    const [body] = await Promise.all([
      demo ? Promise.resolve(sampleBody ?? '') : readLetterBody(memory.id),
      new Promise(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450)),
    ])
    if (!alive.current) return
    if (body === null) { setError("We couldn't open this letter yet. Check your connection and try again."); setPhase('sealed'); setBusy(false); return }
    setContent(decodeLetter(body)); onOpened(); setPhase('open'); setBusy(false); play('rustle')
    if (!demo && user && memory.senderId !== user.uid && !memory.viewedAt) markViewed(memory.id).catch(() => {})
  }

  return (
    <div className="workspace-overlay reader" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={memory.title || 'Read your letter'}>
      <header className="workspace-header">
        <button className="back-button" aria-label="Back to your letters" onClick={onClose}>
          <Icon.Back /><span>Letters</span>
        </button>
        <span className="workspace-title">
          {phase === 'open' ? 'A moment, just for you' : 'Something with your name on it'}
        </span>
        <button className="secondary" onClick={onKeep} aria-pressed={kept}>
          <Icon.Heart />{kept ? 'Kept close' : 'Keep this'}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {phase !== 'open' ? (
          <motion.section key="envelope" className="reader-envelope"
            exit={{ opacity: 0, y: 50, rotateX: 15 }} transition={{ duration: .35 }}>
            <span className="little-label">FROM {sender.toUpperCase()}</span>
            <h1>{memory.title || 'Just for you'}</h1>
            <EnvelopeSealed envelopeId={memory.envelope} onClick={open} disabled={locked || busy}
              className={`open-envelope${phase === 'opening' ? ' is-opening' : ''}`}
              label="Break the seal and open your letter" />
            {locked
              ? <><h2>A little something to look forward to.</h2><p>Sealed until {memory.unlockAt?.toDate().toLocaleString()}</p></>
              : <><p className="handwritten">Go on, it's yours. ♡</p><button className="primary" disabled={busy} onClick={open}>{busy ? 'Opening your envelope…' : 'Break the seal'}</button></>
            }
            {error && <p className="error" role="alert">{error}</p>}
          </motion.section>

        ) : (
          <motion.div key="content" className="reader-letter-stage"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, ease: [.16, 1, .3, 1] }}>
            <StationeryPaper paperId={memory.paper ?? ''} fontFamily={fonts[content?.font ?? 'Literary']} className={`reader-letter-paper ${letterDensity(content?.blocks.find(block => block.kind === 'text')?.value ?? '')}`}>
              <span className="letter-date">{memory.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              <h1 className="reading-title">{memory.title}</h1>
              {content && <Content content={content} />}
            </StationeryPaper>
            <div className="reader-reply">
              <button className="reader-reply-btn" onClick={onReply}>
                Write back <Icon.Nib />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

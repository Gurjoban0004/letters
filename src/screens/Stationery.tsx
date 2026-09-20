import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSession } from '../lib/session'
import { isSealed, markViewed, readLetterBody, type Memory } from '../lib/db'
import { decodeLetter, encodeLetter, envelopes, fileData, fonts, photoData, stationery, type Draft, type LetterBlock, type LetterContent } from '../lib/letters'
import { play } from '../lib/sound'
import { Icon } from '../components/ui'
import { EnvelopeArtwork, PaperArtwork, envelopeStyle, paperStyle } from '../components/StationeryArt'

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
export function Composer({ initial, sender, recipient, demo, onSave, onSend, onClose, onSent }: {
  initial: Draft; sender: string; recipient: string; demo: boolean
  onSave: (draft: Draft) => Promise<void>; onSend: (draft: Draft) => Promise<void>; onClose: () => void; onSent: () => void
}) {
  const [draft, setDraft] = useState(() => ({
    ...initial,
    envelope: initial.envelope || envelopes[0].id,
    greeting: initial.greeting || `Dear ${recipient},`,
    blocks: initial.blocks.filter((block, index, blocks) => block.kind !== 'text' || block.value.trim() || !blocks.slice(0, index).some((previous) => previous.kind === 'text' && !previous.value.trim())),
  })), [phase, setPhase] = useState<'write' | 'preview' | 'seal' | 'sent'>('write')
  const [tool, setTool] = useState('Paper'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [saved, setSaved] = useState(false), [drawing, setDrawing] = useState(false), [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0), [activeBlock, setActiveBlock] = useState<string | null>(null)
  const panel = useRef<HTMLElement>(null)
  const chooseTool = (name: string) => { setTool(name); if (window.matchMedia('(max-width: 800px)').matches) panel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }
  const upload = useRef<HTMLInputElement>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null)
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null), stopped = useRef(false)
  const savedDraft = useRef(initial), currentDraft = useRef(draft); currentDraft.current = draft
  const close = async () => {
    if (busy || recording) { setError('Finish the current action before closing your letter.'); return }
    try { if (currentDraft.current !== savedDraft.current) await onSave({ ...currentDraft.current, updated: Date.now() }); onClose() }
    catch { setError('Your draft couldn’t be saved. Keep this window open and try saving again.') }
  }
  const root = usePageFocus(() => { void close() })
  useEffect(() => {
    stopped.current = false
    const warn = (e: BeforeUnloadEvent) => { if (currentDraft.current !== savedDraft.current) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn); stopped.current = true; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); if (recordTimer.current) clearInterval(recordTimer.current) }
  }, [])
  function change(patch: Partial<Draft>) { setDraft(d => ({ ...d, ...patch })); setSaved(false) }
  function blockValue(id: string, value: string) { setDraft(d => ({ ...d, blocks: d.blocks.map(b => b.id === id ? { ...b, value } : b) })); setSaved(false) }
  function addBlock(kind: LetterBlock['kind'], value = '') {
    const emptyText = kind === 'text' && draft.blocks.find((block) => block.kind === 'text' && !block.value.trim())
    if (emptyText) { setActiveBlock(emptyText.id); document.getElementById(`letter-block-${emptyText.id}`)?.focus(); return }
    const id = crypto.randomUUID()
    setDraft(d => ({ ...d, blocks: [...d.blocks, { id, kind, value }] }))
    setActiveBlock(id); setSaved(false)
    requestAnimationFrame(() => document.getElementById(`letter-block-${id}`)?.focus())
  }
  function moveBlock(index: number, direction: number) { const next = [...draft.blocks]; const [block] = next.splice(index, 1); next.splice(index + direction, 0, block); change({ blocks: next }) }
  async function save() {
    setBusy(true); setError('')
    try { const next = { ...draft, updated: Date.now() }; await onSave(next); savedDraft.current = draft; setSaved(true) }
    catch { setError('Your draft couldn’t be saved on this device. Keep this page open and try again.') }
    finally { setBusy(false) }
  }
  async function photo(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try { addBlock('photo', await photoData(file)) } catch(e) { setError((e as Error).message) } finally { setBusy(false); if (upload.current) upload.current.value = '' }
  }
  async function record() {
    if (recording) { recorder.current?.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Voice recording isn’t supported in this browser. Try a recent Safari or Chrome browser.'); return }
    setError(''); setBusy(true)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t))
      const media = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 })
      recorder.current = media; const chunks: Blob[] = []; let seconds = 0
      media.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      media.onstop = async () => {
        stream.current?.getTracks().forEach(t => t.stop()); if (recordTimer.current) clearInterval(recordTimer.current)
        if (stopped.current) return
        setRecording(false)
        try { const blob = new Blob(chunks, { type: media.mimeType }); if (blob.size > 450_000) throw new Error('That recording is too large. Try a shorter voice note.'); addBlock('voice', await fileData(blob)) } catch(e) { setError((e as Error).message) }
      }
      media.start(); setRecording(true); setRecordSeconds(0)
      recordTimer.current = setInterval(() => { seconds++; setRecordSeconds(seconds); if (seconds >= 60 && media.state === 'recording') media.stop() }, 1000)
    } catch { stream.current?.getTracks().forEach(t => t.stop()); setError('Microphone access wasn’t available. Allow it in your browser to add a voice note.') } finally { setBusy(false) }
  }
  function preview() { try { encodeLetter(draft); setError(''); setPhase('preview'); play('rustle') } catch(e) { setError((e as Error).message) } }
  async function send() {
    setBusy(true); setError('')
    try { await onSave({ ...draft, updated: Date.now() }); savedDraft.current = draft; await onSend(draft); setPhase('sent'); play('chime') }
    catch(e) { setError((e as Error).message || 'Your letter couldn’t be sent. Your draft is still here.'); }
    finally { setBusy(false) }
  }
  return <div className="workspace-overlay" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Write a letter">
    <header className="workspace-header"><button className="back-button" aria-label="Back to your letterbox" onClick={close} disabled={busy || recording}><Icon.Back /><span>Your letterbox</span></button><span className="workspace-title">{phase === 'write' ? 'A little letter' : phase === 'preview' ? 'One last look' : phase === 'seal' ? 'Sealed with love' : 'A little closer'}</span><div>{phase === 'write' && <><button className="secondary" onClick={save} disabled={busy || recording}>{saved ? 'Saved ✓' : busy ? 'Saving…' : 'Save draft'}</button><button className="primary" onClick={preview} disabled={busy || recording}>Preview <span>→</span></button></>}{phase === 'preview' && <><button className="secondary" onClick={() => setPhase('write')}>Keep writing</button><button className="primary" onClick={() => { setPhase('seal'); play('rustle') }}>Fold & seal ♡</button></>}{phase === 'seal' && <button className="text-button" disabled={busy} onClick={() => setPhase('preview')}>Back to preview</button>}</div></header>
    {error && <div className="composer-error" role="alert">{error}</div>}
    <AnimatePresence mode="wait">{phase === 'write' || phase === 'preview' ? <motion.div key="paper" className={`composer-layout ${phase === 'preview' ? 'preview-mode' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scaleY: 0.08, rotateX: 35 }} transition={{ duration: .35 }}>
      {phase === 'write' && <aside className="writing-tools" aria-label="Add to your letter"><button onClick={() => addBlock('text')}><Icon.Type />Text</button><button onClick={() => setDrawing(!drawing)} aria-pressed={drawing}><Icon.Nib />Doodle</button><button onClick={() => upload.current?.click()} disabled={busy}><Icon.Camera />Photo</button><button onClick={record} aria-pressed={recording} className={recording ? 'recording' : ''}>{recording ? <span>■</span> : <Icon.Voice />}{recording ? `${recordSeconds}s · Stop` : 'Voice'}</button><hr /><button onClick={() => chooseTool('Paper')} className={tool === 'Paper' ? 'selected' : ''}><Icon.Paper />Paper</button><button onClick={() => chooseTool('Envelope')} className={tool === 'Envelope' ? 'selected' : ''}><Icon.Letter />Envelope</button><button onClick={() => chooseTool('Fonts')} className={tool === 'Fonts' ? 'selected' : ''}><span>Aa</span>Fonts</button><button onClick={() => chooseTool('Details')} className={tool === 'Details' ? 'selected' : ''}><Icon.Sparkle />Details</button><input type="file" hidden ref={upload} accept="image/*" onChange={e => photo(e.target.files?.[0])} /></aside>}
      <div className="paper-stage"><div className="paper-overline"><span>To {recipient}</span><span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span></div><article className="letter-paper" style={{ ...paperStyle(draft.paper), '--letter-font': fonts[draft.font] } as CSSProperties}>
        <PaperArtwork paper={draft.paper} />
        {phase === 'write' ? <input className="letter-title-input" aria-label="Letter title" maxLength={100} placeholder="Give this little letter a name…" value={draft.title} onChange={e => change({ title: e.target.value })} /> : <h1 className="reading-title">{draft.title || 'Just for you'}</h1>}
        <div className="letter-salutation">Dear {recipient},</div>
        {draft.blocks.map((block, index) => <div className={`letter-block ${block.kind}-block align-${block.align ?? 'center'} ${activeBlock === block.id ? 'is-active' : ''}`} key={block.id}>
          {phase === 'write' && <><button className="block-menu" onClick={() => setActiveBlock(activeBlock === block.id ? null : block.id)} aria-label="Arrange this piece" aria-expanded={activeBlock === block.id}>•••</button><div className="block-actions"><button disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label="Move this piece up">↑</button><button disabled={index === draft.blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label="Move this piece down">↓</button><button disabled={draft.blocks.length === 1} onClick={() => change({ blocks: draft.blocks.filter(b => b.id !== block.id) })} aria-label="Remove this piece">×</button>{block.kind !== 'text' && <select aria-label="Place this piece" value={block.align ?? 'center'} onChange={e => change({ blocks: draft.blocks.map(b => b.id === block.id ? { ...b, align: e.target.value as LetterBlock['align'] } : b) })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>}</div></>}
          {block.kind === 'text' && phase === 'write' ? <textarea id={`letter-block-${block.id}`} rows={3} aria-label={`Letter text ${index + 1}`} placeholder={index === 0 ? 'I was thinking of you today…' : 'Continue your letter here…'} value={block.value} onChange={e => blockValue(block.id, e.target.value)} /> : <Block block={block} />}
        </div>)}
        {drawing && phase === 'write' && <Doodle onAdd={value => { addBlock('doodle', value); setDrawing(false) }} onCancel={() => setDrawing(false)} />}
        {draft.decoration && <div className="letter-decoration" aria-label="Letter decoration">{draft.decoration}</div>}<div className="letter-signature">With love,<br /><span>{sender}</span></div>
      </article><p className="paper-footnote">{phase === 'write' ? 'A few words are enough. It’s the thought that travels.' : 'Everything here will be tucked inside your envelope.'}</p></div>
      {phase === 'write' && <aside className="customization" ref={panel}><div className="customize-heading"><h2>Make it yours.</h2><p>A little personality on paper.</p></div><div className="customize-tabs">{['Paper', 'Envelope', 'Fonts', 'Details'].map(t => <button key={t} className={tool === t ? 'active' : ''} aria-pressed={tool === t} onClick={() => setTool(t)}>{t}</button>)}</div>
        {tool === 'Paper' && <><div className="stationery-intro"><span>From the stationery drawer</span><strong>{stationery.length} papers for every kind of thought.</strong></div><div className="paper-options">{stationery.map((paper) => <button key={paper.id} className={draft.paper === paper.id ? 'chosen' : ''} onClick={() => change({ paper: paper.id })} aria-pressed={draft.paper === paper.id}><span className="paper-swatch" style={paperStyle(paper.id)}><span className="stationery-art" />{draft.paper === paper.id && <b>✓</b>}</span><strong>{paper.name}</strong><small>{paper.mood}</small></button>)}</div></>}
        {tool === 'Envelope' && <><div className="stationery-intro"><span>Choose the first impression</span><strong>A little hello before they reach the words inside.</strong></div><div className="envelope-options">{envelopes.map((envelope) => <button key={envelope.id} className={draft.envelope === envelope.id ? 'chosen' : ''} onClick={() => change({ envelope: envelope.id })} aria-pressed={draft.envelope === envelope.id}><span className="envelope-swatch" style={envelopeStyle(envelope.id)}><EnvelopeArtwork envelope={envelope.id} />{draft.envelope === envelope.id && <b>✓</b>}</span><strong>{envelope.name}</strong><small>{envelope.mood}</small></button>)}</div></>}
        {tool === 'Fonts' && <div className="font-options">{Object.entries(fonts).map(([name, font]) => <button key={name} aria-pressed={draft.font === name} className={draft.font === name ? 'chosen' : ''} onClick={() => change({ font: name })}><span style={{ fontFamily: font }}>Dear you,</span><small>{name}</small></button>)}</div>}
        {tool === 'Details' && <><h3>A little finishing touch</h3><div className="decoration-options">{['', '♡', '✿', '✧', '❦', '♡ ♡ ♡'].map((d,i) => <button key={i} aria-label={d ? `Add ${d} decoration` : 'No decoration'} aria-pressed={draft.decoration === d} onClick={() => change({ decoration: d })} className={draft.decoration === d ? 'chosen' : ''}>{d || 'None'}</button>)}</div><p className="tool-note">Your botanical stamp and heart seal are already waiting on the envelope.</p></>}
        <div className="desk-tip"><Icon.Nib /><p>Make a mark.<br />It doesn’t have to be perfect<br />to feel like you.</p></div></aside>}
    </motion.div> : phase === 'seal' ? <motion.section key="seal" className="sealing-stage" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }}><span className="little-label">A LITTLE PIECE OF YOU</span><h1>Ready for their letterbox.</h1><p>For {recipient}, with love from {sender}.</p><div className="seal-envelope"><EnvelopeArtwork envelope={draft.envelope} /><span className="seal-address handwritten">For {recipient}<br /><small>with love ♡</small></span></div><label className="delivery-label">When can they open it?<input type="datetime-local" value={draft.unlockAt} onChange={e => change({ unlockAt: e.target.value })} /></label><p className="tool-note">{draft.unlockAt ? 'Your words stay sealed until this time.' : 'Leave empty for a lovely surprise right now.'}</p><button className="primary" onClick={send} disabled={busy}>{busy ? 'Sending your letter…' : demo ? 'Send sample letter ↗' : 'Send this little letter ↗'}</button>{demo && <small>Preview only. This won’t be sent to anyone.</small>}</motion.section> : <motion.section key="sent" className="sent-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="sent-heart">♡</span><h1>A little closer, already.</h1><p>{demo ? 'Your sample letter is in Sent for this preview session.' : `Your letter is waiting for ${recipient}.`}</p><button className="primary" onClick={onSent}>Back to the letterbox →</button></motion.section> }</AnimatePresence>
  </div>
}

function Block({ block }: { block: LetterBlock }) {
  if (block.kind === 'text') return <p className="letter-prose">{block.value}</p>
  if (block.kind === 'voice') return <div className="voice-note"><span>A little of my voice</span><audio controls src={block.value} preload="metadata" /></div>
  return <figure className={block.kind === 'photo' ? 'taped-photo' : 'drawn-piece'}><img src={block.value} alt={block.kind === 'photo' ? 'A photograph tucked into this letter' : 'A drawing made for this letter'} /></figure>
}
function Content({ content }: { content: LetterContent }) { return <>{content.greeting && <div className="letter-salutation">{content.greeting}</div>}{content.blocks.map(b => <div key={b.id} className={`letter-block ${b.kind}-block align-${b.align ?? 'center'}`}><Block block={b} /></div>)}{content.decoration && <div className="letter-decoration">{content.decoration}</div>}</> }

function Doodle({ onAdd, onCancel }: { onAdd: (data: string) => void; onCancel: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), last = useRef<[number,number] | null>(null)
  const [ink, setInk] = useState('#8d455c'), [hasInk, setHasInk] = useState(false)
  function draw(e: PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!, rect = c.getBoundingClientRect()
    const x = (e.clientX - rect.left) * c.width / rect.width, y = (e.clientY - rect.top) * c.height / rect.height
    const ctx = c.getContext('2d')!
    if (e.type === 'pointerdown') { c.setPointerCapture(e.pointerId); last.current = [x,y]; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill(); setHasInk(true) }
    else if (last.current) { ctx.beginPath(); ctx.moveTo(...last.current); ctx.lineTo(x,y); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); last.current = [x,y]; setHasInk(true) }
  }
  return <div className="doodle-area"><p>Leave a little mark. Draw with a finger or mouse.</p><canvas width={1000} height={480} ref={canvas} onPointerDown={draw} onPointerMove={draw} onPointerUp={() => last.current = null} onPointerCancel={() => last.current = null} aria-label="Drawing canvas" /><div className="doodle-controls"><label>Ink<input type="color" value={ink} onChange={e => setInk(e.target.value)} /></label><button onClick={() => { canvas.current!.getContext('2d')!.clearRect(0,0,1000,480); setHasInk(false) }}>Clear</button><button onClick={onCancel}>Cancel</button><button className="secondary" disabled={!hasInk} onClick={() => onAdd(canvas.current!.toDataURL('image/png'))}>Keep drawing ✓</button></div><small>Prefer the keyboard? Add a heart or flower from Details.</small></div>
}

export function Reader({ memory, sender, demo, sampleBody, kept, onKeep, onClose, onOpened, onReply }: {
  memory: Memory; sender: string; demo: boolean; sampleBody?: string; kept: boolean; onKeep: () => void; onClose: () => void; onOpened: () => void; onReply: () => void
}) {
  const { user } = useSession()
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed'), [content, setContent] = useState<LetterContent | null>(null), [error, setError] = useState('')
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false)
  const root = usePageFocus(onClose), alive = useRef(true)
  useEffect(() => { alive.current = true; const t = setInterval(() => setNow(Date.now()), 1000); return () => { alive.current = false; clearInterval(t) } }, [])
  const locked = isSealed(memory, now)
  async function open() {
    if (locked || busy) return
    setBusy(true); setError(''); setPhase('opening'); play('seal')
    const [body] = await Promise.all([demo ? Promise.resolve(sampleBody ?? '') : readLetterBody(memory.id), new Promise(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450))])
    if (!alive.current) return
    if (body === null) { setError('We couldn’t open this letter yet. Check your connection and try again.'); setPhase('sealed'); setBusy(false); return }
    setContent(decodeLetter(body)); onOpened(); setPhase('open'); setBusy(false); play('rustle')
    if (!demo && user && memory.senderId !== user.uid && !memory.viewedAt) markViewed(memory.id).catch(() => {})
  }
  return <div className="workspace-overlay reader" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={memory.title || 'Read your letter'}><header className="workspace-header"><button className="back-button" aria-label="Back to your letterbox" onClick={onClose}><Icon.Back /><span>Your letterbox</span></button><span className="workspace-title">{phase === 'open' ? 'A moment, just for you' : 'Something with your name on it'}</span><button className="secondary" onClick={onKeep} aria-pressed={kept}><Icon.Heart />{kept ? 'Kept close' : 'Keep this'}</button></header>
    <AnimatePresence mode="wait">{phase !== 'open' ? <motion.section key="envelope" className="reader-envelope" exit={{ opacity: 0, y: 50, rotateX: 15 }} transition={{ duration: .35 }}><span className="little-label">FROM {sender.toUpperCase()}, WITH LOVE</span><h1>{memory.title || 'Just for you'}</h1><motion.button className="open-envelope" onClick={open} disabled={locked || busy} animate={phase === 'opening' ? { y: -12, rotate: -2 } : { y: 0, rotate: 0 }} aria-label="Break the seal and open your letter"><EnvelopeArtwork envelope={memory.envelope} /><span className="seal-address handwritten">For you<br /><small>with love ♡</small></span></motion.button>{locked ? <><h2>A little something to look forward to.</h2><p>Sealed until {memory.unlockAt?.toDate().toLocaleString()}</p></> : <><p className="handwritten">Go on, it’s yours. ♡</p><button className="primary" disabled={busy} onClick={open}>{busy ? 'Unfolding your letter…' : 'Break the seal'}</button></>}{error && <p className="error" role="alert">{error}</p>}</motion.section> : <motion.div key="content" className="reader-paper-stage" initial={{ opacity: 0, y: 40, scaleY: .85 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }}><article className="letter-paper" style={{ ...paperStyle(memory.paper ?? ''), '--letter-font': fonts[content?.font ?? 'Literary'] } as CSSProperties}><PaperArtwork paper={memory.paper ?? ''} /><span className="letter-date">{memory.createdAt?.toDate().toLocaleDateString(undefined, { dateStyle: 'long' })}</span><h1 className="reading-title">{memory.title}</h1>{content && <Content content={content} />}<div className="letter-signature">With love,<br /><span>{sender}</span></div></article><div className="reader-actions"><span className="handwritten">A little piece of them, to keep.</span><button className="primary" onClick={onReply}>Write back <Icon.Nib /></button></div></motion.div>}</AnimatePresence>
  </div>
}

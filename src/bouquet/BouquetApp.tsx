import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import './bouquet.css'
import assetManifest from './assets/manifest.json'
import { useSession } from '../lib/session'
import { navigateView, subscribeToViewNavigation, type ViewDirection } from '../lib/viewTransitions'
import { loadDemoBouquets, markBouquetReceived, markBouquetViewed, sendBouquet, sendDemoBouquet, useBouquets } from './bouquetDb'
import { MAX_BOUQUET_ITEMS, NOTE_LIMITS, arrangeBouquet, bouquetStemPose, clamp, createDraftStorage, gatheredStemBase, makeGuidedItem, moveLayer, normalizeLayers, prepareBouquetLayout, type BouquetCompositionV1, type BouquetDraftV1, type BouquetItemV1, type BouquetNoteV1, type BouquetStudioMode, type BouquetStyle, type BouquetTool, type PublishedBouquetV1 } from './studioModel'

type IconName = 'arrow' | 'back' | 'backward' | 'bouquet' | 'check' | 'close' | 'flower' | 'forward' | 'heart' | 'home' | 'minus' | 'plus' | 'redo' | 'rotateLeft' | 'rotateRight' | 'search' | 'trash' | 'undo'

const iconPaths: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="m15 5-7 7 7 7" />,
  backward: <><path d="M9 7H5v12h10v-4" /><path d="M9 5h10v10h-4M12 9 9 12m0-3v3h3" /></>,
  bouquet: <><path d="M8 10c-2.4.2-4-1.1-4.4-3.8 2.7-.4 4.3.7 4.8 3.2M16 10c2.4.2 4-1.1 4.4-3.8-2.7-.4-4.3.7-4.8 3.2" /><path d="M12 10c-2.3-1.3-2.7-3.2-1-5.7 2.5 1.5 2.8 3.4 1 5.7Zm-4.3.2L12 20m4.3-9.8L12 20M8.5 15h7L14 21h-4l-1.5-6Z" /></>,
  check: <path d="m5 12.5 4.3 4.3L19 7.3" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  flower: <><circle cx="12" cy="12" r="2.2" /><path d="M12 9.8c-3.2-.8-4.3-2.8-3.1-5.5 2.8-.1 4.2 1.7 3.1 5.5Zm2.2 2.2c.8-3.2 2.8-4.3 5.5-3.1.1 2.8-1.7 4.2-5.5 3.1ZM12 14.2c3.2.8 4.3 2.8 3.1 5.5-2.8.1-4.2-1.7-3.1-5.5ZM9.8 12c-.8 3.2-2.8 4.3-5.5 3.1-.1-2.8 1.7-4.2 5.5-3.1Z" /></>,
  forward: <><path d="M15 7h4v12H9v-4" /><path d="M15 5H5v10h4M12 9l3 3m0-3v3h-3" /></>,
  heart: <path d="M20.2 8.8c0 4.8-8.2 9.8-8.2 9.8S3.8 13.6 3.8 8.8A4.4 4.4 0 0 1 12 6.7a4.4 4.4 0 0 1 8.2 2.1Z" />,
  home: <><path d="m4 10 8-6 8 6" /><path d="M6.5 9v10h11V9M10 19v-5h4v5" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M19 12h-8.5A5.5 5.5 0 0 0 5 17.5" /></>,
  rotateLeft: <><path d="m8 5-4 4 4 4" /><path d="M5 9h7a7 7 0 1 1-6.2 10.2" /></>,
  rotateRight: <><path d="m16 5 4 4-4 4" /><path d="M19 9h-7a7 7 0 1 0 6.2 10.2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></>,
  undo: <><path d="m9 7-5 5 5 5" /><path d="M5 12h8.5a5.5 5.5 0 0 1 5.5 5.5" /></>,
}

function BloomIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg className="bloom-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</g></svg>
}

function useBouquetRoute() {
  const [route, setRoute] = useState(`${location.pathname}${location.search}`)
  const path = route.split('?')[0]
  useEffect(() => subscribeToViewNavigation(() => setRoute(`${location.pathname}${location.search}`)), [])
  const navigate = (next: string) => {
    const target = new URL(next, location.origin)
    if (new URLSearchParams(location.search).get('demo') === '1' && !target.searchParams.has('demo')) target.searchParams.set('demo', '1')
    const depth = (value: string) => value.startsWith('/bloom/create') || value.startsWith('/bloom/bouquet/') ? 1 : 0
    const direction: ViewDirection = depth(target.pathname) > depth(path) ? 'forward' : depth(target.pathname) < depth(path) ? 'back' : 'fade'
    void navigateView(`${target.pathname}${target.search}`, direction).then(() => scrollTo({ top: 0, behavior: 'auto' }))
  }
  return { path, navigate }
}

type BloomButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'ghost'
  icon?: IconName
}

function BloomButton({ tone = 'primary', icon, children, className = '', ...props }: BloomButtonProps) {
  return <button className={`bloom-button bloom-button--${tone} ${className}`} {...props}>{children}{icon && <BloomIcon name={icon} size={19} />}</button>
}

function HeartInput({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="bloom-field">
    <span>{label}</span>
    <span className="bloom-input-wrap"><BloomIcon name="heart" size={18} /><input {...props} /></span>
    {hint && <small>{hint}</small>}
  </label>
}

function FilterChip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return <button className="bloom-chip" aria-pressed={active} onClick={onClick}>{children}</button>
}

const flowerTones = ['rose', 'butter', 'lavender', 'sage'] as const
type FlowerTone = typeof flowerTones[number]
type StudioCategory = 'Flowers' | 'Greenery' | 'Decor' | 'Wrapping'
type CatalogFilter = 'All' | 'Popular' | 'Filler' | 'Greenery'
type BotanicalAsset = typeof assetManifest.assets[number]
type WrapAsset = typeof assetManifest.wraps[number]
type RibbonAsset = typeof assetManifest.ribbons[number]
type BouquetDisplayComposition = Omit<BouquetCompositionV1, 'ribbonId' | 'bouquetStyle'> & { ribbonId: string | null; bouquetStyle?: BouquetStyle }
type CatalogItem = { name: string; kind: string; tone: FlowerTone; asset?: BotanicalAsset; thumb?: string; wrapId?: string; ribbonId?: string; recommended?: boolean }

const assetById = new Map(assetManifest.assets.map(asset => [asset.id, asset]))
const wrapById = new Map(assetManifest.wraps.map(asset => [asset.id, asset]))
const ribbonById = new Map(assetManifest.ribbons.map(asset => [asset.id, asset]))
const experienceById = new Map(assetManifest.experience.map(asset => [asset.id, asset]))
const validAssetIds = new Set(assetManifest.assets.map(asset => asset.id))
const validWrapIds = new Set(assetManifest.wraps.map(asset => asset.id))
const validRibbonIds = new Set(assetManifest.ribbons.map(asset => asset.id))
const botanical = (id: string) => assetById.get(id)
const catalogBotanical = (id: string, kind: string, tone: FlowerTone): CatalogItem => {
  const asset = botanical(id)
  if (!asset) throw new Error(`Missing bouquet asset: ${id}`)
  return { name: asset.displayName, kind, tone, asset }
}

const studioCatalog: Record<StudioCategory, CatalogItem[]> = {
  Flowers: [
    catalogBotanical('flower_rose_blush', 'Popular', 'rose'), catalogBotanical('flower_peony_pink', 'Popular', 'rose'),
    catalogBotanical('flower_rose_ivory', 'Rose', 'butter'), catalogBotanical('flower_rose_crimson', 'Rose', 'rose'),
    catalogBotanical('flower_peony_coral', 'Peony', 'rose'), catalogBotanical('flower_tulip_lavender', 'Tulip', 'lavender'),
    catalogBotanical('flower_tulip_rose', 'Popular', 'rose'), catalogBotanical('flower_daisy_cream', 'Accent', 'butter'),
    catalogBotanical('flower_sunflower_butter', 'Popular', 'butter'), catalogBotanical('flower_lily_blush', 'Flower', 'rose'),
    catalogBotanical('flower_dahlia_rose', 'Flower', 'rose'), catalogBotanical('flower_hydrangea_lilac', 'Volume', 'lavender'),
    catalogBotanical('flower_hydrangea_blue', 'Volume', 'lavender'), catalogBotanical('flower_anemone_ivory', 'Accent', 'butter'),
    catalogBotanical('flower_ranunculus_peach', 'Accent', 'rose'), catalogBotanical('flower_cosmos_pink', 'Accent', 'rose'),
    catalogBotanical('flower_lavender', 'Filler', 'lavender'), catalogBotanical('flower_babys_breath', 'Filler', 'butter'),
  ],
  Greenery: [
    catalogBotanical('greenery_eucalyptus', 'Rounded', 'sage'), catalogBotanical('greenery_fern', 'Broad', 'sage'),
    catalogBotanical('greenery_ivy', 'Trailing', 'sage'), catalogBotanical('greenery_olive', 'Airy', 'sage'),
    catalogBotanical('greenery_ruscus', 'Structural', 'sage'),
  ],
  Decor: assetManifest.ribbons.map((asset, index) => ({ name: asset.displayName, kind: 'Ribbon', tone: (['rose', 'rose', 'lavender', 'sage'] as const)[index] ?? 'rose', thumb: asset.thumb, ribbonId: asset.id, recommended: index === 0 })),
  Wrapping: assetManifest.wraps.map((asset, index) => ({ name: asset.displayName, kind: 'Wrapping', tone: (['rose', 'butter', 'lavender', 'sage'] as const)[index] ?? 'rose', thumb: asset.thumb, wrapId: asset.id, recommended: index === 0 })),
}

const bouquetStyles: Array<{ id: BouquetStyle; label: string; hint: string }> = [
  { id: 'classic', label: 'Classic', hint: 'A soft rounded dome' },
  { id: 'meadow', label: 'Meadow', hint: 'Airy and gently asymmetric' },
  { id: 'tall', label: 'Garden', hint: 'A taller gathered silhouette' },
]

function BouquetStylePicker({ value, onChange }: { value: BouquetStyle; onChange: (style: BouquetStyle) => void }) {
  return <div className="bloom-style-switcher" role="group" aria-label="Bouquet shape">{bouquetStyles.map(style => <button key={style.id} aria-pressed={value === style.id} title={style.hint} onClick={() => onChange(style.id)}>{style.label}</button>)}</div>
}

function FlowerCard({ name, kind, tone = 'rose', selected, onClick }: { name: string; kind: string; tone?: FlowerTone; selected?: boolean; onClick?: () => void }) {
  return <button className="bloom-flower-card" aria-pressed={selected} onClick={onClick}>
    <span className={`bloom-flower-placeholder bloom-flower-placeholder--${tone}`} aria-hidden="true"><span /><span /><span /><span /><i /></span>
    <span><strong>{name}</strong><small>{kind}</small></span>
    <span className="bloom-card-check"><BloomIcon name="check" size={14} /></span>
  </button>
}

function CompactFlowerTile({ item, selected, count = 0, disabled, onClick }: { item: CatalogItem; selected?: boolean; count?: number; disabled?: boolean; onClick?: () => void }) {
  return <button className="bloom-compact-flower" aria-pressed={selected} aria-label={`${item.asset ? 'Add' : 'Choose'} ${item.name}${item.recommended ? ', suggested' : ''}`} disabled={disabled} onClick={onClick}>
    {item.asset || item.thumb ? <img className="bloom-catalog-botanical" src={item.asset?.thumb ?? item.thumb} alt="" loading="lazy" decoding="async" /> : <span className={`bloom-flower-placeholder bloom-flower-placeholder--${item.tone}`} aria-hidden="true"><span /><span /><span /><span /><i /></span>}
    <strong>{item.name}</strong>
    {item.recommended && <span className="bloom-suggestion">Our pick</span>}
    {count > 0 && <span className="bloom-item-count" aria-label={`${count} in bouquet`}>{count}</span>}
  </button>
}

function StudioSheet({ open, category, selected, itemCount, bouquetStyle, countAsset, onSelect, onClose, onCategory, onStyle }: { open: boolean; category: StudioCategory; selected: string; itemCount: number; bouquetStyle: BouquetStyle; countAsset: (item: CatalogItem) => number; onSelect: (item: CatalogItem) => void; onClose: () => void; onCategory: (category: StudioCategory) => void; onStyle: (style: BouquetStyle) => void }) {
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('All')
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [open])
  if (!open) return null
  const botanicalTools = category === 'Flowers' || category === 'Greenery'
  const source = botanicalTools && filter === 'Greenery' ? studioCatalog.Greenery : studioCatalog[category]
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const items = source.filter(item => {
    if (!botanicalTools) return true
    if (filter === 'Popular' && !item.asset?.popular) return false
    if (filter === 'Filler' && item.kind !== 'Filler') return false
    return !normalizedQuery || `${item.name} ${item.kind}`.toLocaleLowerCase().includes(normalizedQuery)
  })
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') return onClose()
    if (event.key !== 'Tab' || !ref.current) return
    const focusable = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return <section ref={ref} className="bloom-sheet" role="dialog" aria-modal="true" aria-label={`${category} library`} onKeyDown={trapFocus}>
    <div className="bloom-sheet-handle" aria-hidden="true" />
    <div className="bloom-sheet-heading"><h2>{category}</h2><button ref={closeRef} className="bloom-icon-button" onClick={onClose} aria-label={`Close ${category.toLowerCase()} picker`}><BloomIcon name="close" /></button></div>
    <div className="bloom-studio-tabs" role="tablist" aria-label="Bouquet tools">{(Object.keys(studioCatalog) as StudioCategory[]).map(item => <button key={item} role="tab" aria-selected={item === category} onClick={() => onCategory(item)}>{item}</button>)}</div>
    <BouquetStylePicker value={bouquetStyle} onChange={onStyle} />
    {botanicalTools && <div className="bloom-sheet-tools">
      <label className="bloom-catalog-search"><BloomIcon name="search" size={17} /><span className="bloom-sr-only">Search botanical catalog</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search flowers and greenery" /></label>
      <div className="bloom-catalog-filters" aria-label="Catalog filters">{(['All', 'Popular', 'Filler', 'Greenery'] as CatalogFilter[]).map(item => <FilterChip key={item} active={filter === item} onClick={() => setFilter(item)}>{item}</FilterChip>)}</div>
    </div>}
    <div className="bloom-sheet-grid">{items.length ? items.map(item => <CompactFlowerTile key={item.name} item={item} count={countAsset(item)} selected={selected === item.name} disabled={Boolean(item.asset) && itemCount >= MAX_BOUQUET_ITEMS} onClick={() => onSelect(item)} />) : <p className="bloom-catalog-empty">No botanicals match that search.</p>}</div>
  </section>
}

export function BouquetHomePanel({ navigate }: { navigate: (path: string) => void }) {
  const { user, pairingId, me, partner } = useSession()
  const demo = new URLSearchParams(location.search).get('demo') === '1'
  const ownerId = demo ? 'sample' : user?.uid ?? 'guest'
  const startPreset = (preset: typeof starterPresets[number]) => {
    const draft = draftFromComposition(ownerId, demo ? 'sample' : pairingId ?? '', preset.name, preset.composition, demo ? 'Your person' : partner?.name ?? '', demo ? 'You' : me?.name ?? '')
    draftStorage.save(draft)
    navigate(`/bloom/create?draft=${encodeURIComponent(draft.id)}`)
  }
  return <section className="bloom-home bloom-home-panel">
    <section className="bloom-hero">
      <div className="bloom-hero-copy">
        <h1>Gather something beautiful for them.</h1>
        <p>Choose every stem, arrange it with care, and send a bouquet they can keep.</p>
        <div className="bloom-actions"><BloomButton icon="arrow" onClick={() => navigate('/bloom/create')}>Make a bouquet</BloomButton></div>
      </div>
      <div className="bloom-note-preview" aria-label="A preview of the bouquet note">
        <BloomIcon name="flower" size={30} />
        <p>“A little garden,<br />just for you.”</p>
        <span>Made with care in Letters</span>
      </div>
    </section>
    <section className="bloom-home-promise" aria-label="How bouquets work">
      <p><strong>Choose</strong><span>Pick the flowers that feel like them.</span></p>
      <p><strong>Arrange</strong><span>Shape every stem by hand.</span></p>
      <p><strong>Send</strong><span>Share a private keepsake.</span></p>
    </section>
    <section className="bloom-starters" aria-labelledby="bloom-starters-heading">
      <div className="bloom-section-heading"><div><h2 id="bloom-starters-heading">Begin with a garden</h2><p>Choose a starting point, then make every stem your own.</p></div><BloomButton tone="ghost" onClick={() => navigate('/bloom/create')}>Start from scratch</BloomButton></div>
      <div className="bloom-starter-row">{starterPresets.map(preset => <article className="bloom-starter" key={preset.id}><BouquetMiniature composition={preset.composition} /><div><h3>{preset.name}</h3><p>{preset.description}</p><BloomButton tone="secondary" onClick={() => startPreset(preset)}>Remix this bouquet</BloomButton></div></article>)}</div>
    </section>
  </section>
}

const defaultWrap = assetManifest.wraps[0]
const draftStorage = createDraftStorage(localStorage, validAssetIds, validWrapIds, validRibbonIds)
const starterLayout = [
  { assetId: 'greenery_fern', x: .5, y: .84, scale: .64, rotation: -32 },
  { assetId: 'greenery_olive', x: .5, y: .84, scale: .64, rotation: 32 },
  { assetId: 'greenery_eucalyptus', x: .5, y: .84, scale: .67, rotation: -10 },
  { assetId: 'flower_babys_breath', x: .5, y: .84, scale: .56, rotation: 25 },
  { assetId: 'flower_lavender', x: .5, y: .84, scale: .56, rotation: -24 },
  { assetId: 'flower_hydrangea_lilac', x: .5, y: .84, scale: .6, rotation: 18 },
  { assetId: 'flower_daisy_cream', x: .5, y: .84, scale: .59, rotation: -18 },
  { assetId: 'flower_tulip_rose', x: .5, y: .84, scale: .64, rotation: 9 },
  { assetId: 'flower_rose_blush', x: .5, y: .84, scale: .67, rotation: -8 },
  { assetId: 'flower_peony_pink', x: .5, y: .84, scale: .72, rotation: 0 },
] as const
const categoryFromTool: Record<BouquetTool, StudioCategory> = { flowers: 'Flowers', greenery: 'Greenery', decor: 'Decor', wrapping: 'Wrapping' }
const toolFromCategory: Record<StudioCategory, BouquetTool> = { Flowers: 'flowers', Greenery: 'greenery', Decor: 'decor', Wrapping: 'wrapping' }

function starterItems(style: BouquetStyle = 'classic') {
  return arrangeBouquet(starterLayout.map((item, index) => ({ ...item, id: `starter-${index + 1}`, flipX: false, z: index })), style)
}

const starterPresets: Array<{ id: string; name: string; description: string; composition: BouquetCompositionV1 }> = [
  { id: 'blush-garden', name: 'Blush garden', description: 'Peonies, roses, and quiet greenery.', composition: { version: 1, items: starterItems('classic'), wrapId: 'wrap_blush', ribbonId: 'ribbon_rose', bouquetStyle: 'classic', note: { to: '', body: '', from: '' } } },
  { id: 'lavender-evening', name: 'Lavender evening', description: 'A taller garden shape for thoughtful days.', composition: { version: 1, items: starterItems('tall').slice(1), wrapId: 'wrap_lavender', ribbonId: 'ribbon_lavender', bouquetStyle: 'tall', note: { to: '', body: '', from: '' } } },
  { id: 'meadow-paper', name: 'Meadow paper', description: 'An airy meadow in warm parchment.', composition: { version: 1, items: starterItems('meadow').slice(0, 8), wrapId: 'wrap_parchment', ribbonId: 'ribbon_sage', bouquetStyle: 'meadow', note: { to: '', body: '', from: '' } } },
]

function draftFromComposition(ownerId: string, pairingId: string, title: string, composition: BouquetCompositionV1, to = '', from = ''): BouquetDraftV1 {
  const now = Date.now()
  return {
    version: 1, id: crypto.randomUUID(), ownerId, pairingId, title, progress: 3, activeTool: 'flowers', studioMode: 'compose', status: 'draft',
    createdAt: now, updatedAt: now, clientPublicationId: null,
    items: composition.items.map(item => ({ ...item, id: crypto.randomUUID() })), wrapId: composition.wrapId, ribbonId: composition.ribbonId, bouquetStyle: composition.bouquetStyle ?? 'classic',
    note: { to: composition.note.to || to, body: composition.note.body, from: composition.note.from || from },
  }
}

const sampleReceivedBouquet: PublishedBouquetV1 = {
  version: 1, id: 'sample-received', pairingId: 'sample', senderId: 'sample-partner', recipientId: 'sample-self', title: 'A small reminder', itemCount: starterPresets[0].composition.items.length,
  createdAt: Date.now() - 3_600_000, receivedAt: Date.now() - 3_000_000, viewedAt: null,
  composition: { ...starterPresets[0].composition, note: { to: 'You', body: 'For the ordinary days, and all the lovely ones between them.', from: 'Your person' } },
}

function bouquetDate(value: unknown) {
  const millis = typeof value === 'number' ? value : value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function' ? value.toMillis() : Date.now()
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(millis)
}

function normalizeRotation(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180
}

function stemHead(item: BouquetItemV1) {
  return {
    x: clamp(item.x, .06, .94),
    y: clamp(item.y, .08, .88),
  }
}

function placeStem(item: BouquetItemV1, x: number, y: number) {
  const targetX = clamp(x, .16, .84)
  const targetY = clamp(y, .14, .56)
  return { ...item, x: targetX, y: targetY, ...bouquetStemPose(item.assetId, targetX, targetY) }
}

type BouquetPreviewProps = {
  items: BouquetItemV1[]
  selectedId: string | null
  zoom: number
  wrap: WrapAsset
  ribbon: RibbonAsset | null
  interactive: boolean
  previewRef: RefObject<HTMLDivElement>
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, item: BouquetItemV1) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, item: BouquetItemV1) => void
}

function BouquetArtwork({ items, wrap, ribbon, bouquetStyle = 'classic', selectedId = null }: { items: BouquetItemV1[]; wrap: WrapAsset; ribbon: RibbonAsset | null; bouquetStyle?: BouquetStyle; selectedId?: string | null }) {
  return <>
    <img className="bloom-bouquet-wrap bloom-bouquet-wrap--back" src={wrap.back} alt="" decoding="async" />
    {prepareBouquetLayout(items, bouquetStyle).map(item => {
      const asset = botanical(item.assetId)
      if (!asset) return null
      const base = gatheredStemBase(item)
      const rotation = clamp(item.rotation, -38, 38)
      const scale = clamp(item.scale, .35, .82)
      return <span className={`bloom-bouquet-item${selectedId === item.id ? ' is-selected' : ''}`} style={{ zIndex: item.z + 1 }} key={item.id}>
        <img src={asset.file} alt="" draggable={false} decoding="async" style={{ transform: `translate(${(base.x - .5) * 100}%, ${(base.y - .94) * 100}%) rotate(${rotation}deg) scale(${item.flipX ? -scale : scale}, ${scale})` }} />
      </span>
    })}
    <img className="bloom-bouquet-wrap bloom-bouquet-wrap--front" src={wrap.front} alt="" decoding="async" />
    {ribbon && <img className="bloom-bouquet-ribbon" src={ribbon.file} alt="" decoding="async" />}
  </>
}

export function BouquetMiniature({ composition }: { composition: BouquetDisplayComposition }) {
  const wrap = wrapById.get(composition.wrapId) ?? defaultWrap
  const ribbon = composition.ribbonId ? ribbonById.get(composition.ribbonId) ?? null : null
  return <div className="bloom-bouquet-miniature" aria-hidden="true"><div className="bloom-bouquet-scene"><BouquetArtwork items={composition.items} wrap={wrap} ribbon={ribbon} bouquetStyle={composition.bouquetStyle ?? 'classic'} /></div></div>
}

function BouquetPreview({ items, selectedId, zoom, wrap, ribbon, interactive, previewRef, onPointerDown, onPointerMove, onPointerUp, onKeyDown, bouquetStyle = 'classic' }: BouquetPreviewProps & { bouquetStyle?: BouquetStyle }) {
  const ordered = prepareBouquetLayout(items, bouquetStyle)
  return <div ref={previewRef} className={`bloom-bouquet-preview${interactive ? '' : ' is-previewing'}`} aria-label={`${interactive ? 'Editable' : 'Preview'} bouquet with ${items.length} stems`}>
    <div className="bloom-bouquet-scene" style={{ transform: `scale(${zoom})` }}>
      <BouquetArtwork items={ordered} wrap={wrap} ribbon={ribbon} bouquetStyle={bouquetStyle} selectedId={selectedId} />
      {interactive && ordered.map(item => {
        const asset = botanical(item.assetId)
        if (!asset) return null
        const point = stemHead(item)
        return <button
          className={`bloom-stem-handle${selectedId === item.id ? ' is-selected' : ''}`}
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, zIndex: item.z + 50 }}
          aria-label={`${asset.displayName}, ${Math.round(clamp(item.scale, .35, .82) * 100)} percent size, ${Math.round(clamp(item.rotation, -38, 38))} degrees. Drag to fan within the bouquet.`}
          onPointerDown={event => onPointerDown(event, item)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={event => onKeyDown(event, item)}
          key={`handle-${item.id}`}
        />
      })}
      {!items.length && <p className="bloom-canvas-empty">Tap a flower below to begin.</p>}
    </div>
  </div>
}

function StemSelector({ items, selectedId, onSelect }: { items: BouquetItemV1[]; selectedId: string | null; onSelect: (item: BouquetItemV1) => void }) {
  return <div className="bloom-stem-selector" role="listbox" aria-label="Select a stem to adjust">{[...items].sort((a, b) => b.z - a.z).map((item, index) => {
    const asset = botanical(item.assetId)
    if (!asset) return null
    return <button key={item.id} role="option" aria-selected={selectedId === item.id} aria-label={`Select ${asset.displayName}, stem ${index + 1} of ${items.length}`} onClick={() => onSelect(item)}><img src={asset.thumb} alt="" decoding="async" /><span>{index + 1}</span></button>
  })}</div>
}

function CreateFoundation({ navigate }: { navigate: (path: string) => void }) {
  const { user, pairingId, me, partner, partnerUid } = useSession()
  const demo = new URLSearchParams(location.search).get('demo') === '1'
  const ownerId = demo ? 'sample' : user?.uid ?? 'guest'
  const draftId = new URLSearchParams(location.search).get('draft')?.match(/^[A-Za-z0-9_-]{1,80}$/)?.[0] ?? 'current'
  const [initialDraft] = useState(() => draftStorage.load(ownerId, draftId))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [bouquetStyle, setBouquetStyle] = useState<BouquetStyle>(() => initialDraft?.bouquetStyle ?? 'classic')
  const [items, setItems] = useState<BouquetItemV1[]>(() => prepareBouquetLayout(initialDraft ? initialDraft.items : starterItems(), initialDraft?.bouquetStyle ?? 'classic'))
  const [past, setPast] = useState<BouquetItemV1[][]>([])
  const [future, setFuture] = useState<BouquetItemV1[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => (initialDraft?.items ?? starterItems()).at(-1)?.id ?? null)
  const [catalogSelection, setCatalogSelection] = useState(() => botanical((initialDraft?.items ?? starterItems()).at(-1)?.assetId ?? '')?.displayName ?? '')
  const [category, setCategory] = useState<StudioCategory>(() => initialDraft ? categoryFromTool[initialDraft.activeTool] : 'Flowers')
  const [studioMode, setStudioMode] = useState<BouquetStudioMode>(() => initialDraft?.studioMode ?? 'compose')
  const [wrapId, setWrapId] = useState(() => initialDraft?.wrapId ?? defaultWrap.id)
  const [ribbonId, setRibbonId] = useState<string | null>(() => initialDraft?.ribbonId ?? null)
  const [note, setNote] = useState<BouquetNoteV1>(() => initialDraft?.note ?? { to: demo ? 'Your person' : partner?.name ?? '', body: '', from: demo ? 'You' : me?.name ?? '' })
  const [noteErrors, setNoteErrors] = useState<Partial<Record<keyof BouquetNoteV1, string>>>({})
  const [title] = useState(() => initialDraft?.title ?? '')
  const [publicationId] = useState(() => initialDraft?.clientPublicationId ?? crypto.randomUUID())
  const [sending, setSending] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [notice, setNotice] = useState(initialDraft ? 'Your saved bouquet is back.' : '')
  const [createdAt] = useState(() => initialDraft?.createdAt ?? Date.now())
  const previewRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fromRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; before: BouquetItemV1[]; moved: boolean } | null>(null)
  const catalogItems = studioCatalog[category]
  const selectedItem = items.find(item => item.id === selectedId) ?? null
  const selectedWrap = wrapById.get(wrapId) ?? defaultWrap
  const selectedRibbon = ribbonId ? ribbonById.get(ribbonId) ?? null : null
  const progress = (studioMode === 'compose' ? 3 : studioMode === 'message' ? 4 : 5) as BouquetDraftV1['progress']
  const selectedCatalogName = category === 'Decor' ? selectedRibbon?.displayName ?? '' : category === 'Wrapping' ? selectedWrap.displayName : catalogSelection

  const makeDraft = (): BouquetDraftV1 => ({
    version: 1, id: draftId, ownerId, pairingId: pairingId ?? '', title, progress,
    activeTool: toolFromCategory[category], studioMode, status: 'draft', createdAt, updatedAt: Date.now(),
    clientPublicationId: publicationId, items, wrapId: selectedWrap.id, ribbonId: selectedRibbon?.id ?? null, bouquetStyle, note,
  })

  useEffect(() => {
    setNote(current => ({
      ...current,
      to: current.to || (demo ? 'Your person' : partner?.name || ''),
      from: current.from || (demo ? 'You' : me?.name || ''),
    }))
  }, [demo, me?.name, partner?.name])

  useEffect(() => {
    const timer = setTimeout(() => {
      try { draftStorage.save(makeDraft()) } catch { setNotice('This device could not save the bouquet yet.') }
    }, 600)
    return () => clearTimeout(timer)
  }, [bouquetStyle, category, items, note, ribbonId, studioMode, wrapId])

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState !== 'hidden') return
      try { draftStorage.save(makeDraft()) } catch { /* The visible autosave notice handles recovery guidance. */ }
    }
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => document.removeEventListener('visibilitychange', saveWhenHidden)
  }, [bouquetStyle, category, items, note, ribbonId, studioMode, wrapId])

  const commitItems = (next: BouquetItemV1[], message: string) => {
    const normalized = normalizeLayers(next)
    if (JSON.stringify(normalized) === JSON.stringify(items)) return
    setPast(history => [...history, items].slice(-50))
    setFuture([])
    setItems(normalized)
    setNotice(message)
  }

  const addCatalogItem = (item: CatalogItem) => {
    setCatalogSelection(item.name)
    if (item.wrapId) {
      setWrapId(item.wrapId)
      setNotice(`${item.name} wrapped around your bouquet.`)
      return
    }
    if (item.ribbonId) {
      setRibbonId(item.ribbonId)
      setNotice(`${item.name} tied around your bouquet.`)
      return
    }
    if (!item.asset) return
    if (items.length >= MAX_BOUQUET_ITEMS) {
      setNotice('This bouquet has reached the 30-item limit.')
      return
    }
    const next = makeGuidedItem(item.asset.id, items.length, crypto.randomUUID())
    commitItems(arrangeBouquet([...items, next], bouquetStyle), `${item.name} added and gathered into place.`)
    setSelectedId(next.id)
  }

  const changeSelected = (change: Partial<BouquetItemV1>, message: string) => {
    if (!selectedId) return
    commitItems(items.map(item => item.id === selectedId ? { ...item, ...change } : item), message)
  }

  const undo = () => {
    const previous = past.at(-1)
    if (!previous) return
    setPast(past.slice(0, -1)); setFuture([items, ...future].slice(0, 50)); setItems(previous)
    setSelectedId(previous.at(-1)?.id ?? null); setNotice('Last change undone.')
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture(future.slice(1)); setPast([...past, items].slice(-50)); setItems(next)
    setSelectedId(next.at(-1)?.id ?? null); setNotice('Change restored.')
  }

  const removeSelected = () => {
    if (!selectedId) return
    const remaining = arrangeBouquet(items.filter(item => item.id !== selectedId), bouquetStyle)
    commitItems(remaining, 'Stem removed.')
    setSelectedId(remaining.at(-1)?.id ?? null)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, item: BouquetItemV1) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(item.id)
    setCatalogSelection(botanical(item.assetId)?.displayName ?? '')
    dragRef.current = { id: item.id, startX: event.clientX, startY: event.clientY, before: items, moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    const bounds = previewRef.current?.getBoundingClientRect()
    if (!drag || !bounds || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const movement = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY)
    if (movement > 3) drag.moved = true
    const rawX = (event.clientX - bounds.left) / bounds.width
    const rawY = (event.clientY - bounds.top) / bounds.height
    const sceneX = .5 + (rawX - .5) / zoom
    const sceneY = .64 + (rawY - .64) / zoom
    setItems(current => current.map(item => item.id === drag.id ? placeStem(item, sceneX, sceneY) : item))
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved) { setPast(history => [...history, drag.before].slice(-50)); setFuture([]); setNotice('Stem gathered into place.') }
    dragRef.current = null
  }

  const onStemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: BouquetItemV1) => {
    const movement = event.shiftKey ? .04 : .016
    const size = event.shiftKey ? .06 : .025
    let next: BouquetItemV1[] | null = null
    if (event.key === 'ArrowLeft') next = items.map(value => value.id === item.id ? placeStem(value, value.x - movement, value.y) : value)
    if (event.key === 'ArrowRight') next = items.map(value => value.id === item.id ? placeStem(value, value.x + movement, value.y) : value)
    if (event.key === 'ArrowUp') next = items.map(value => value.id === item.id ? placeStem(value, value.x, value.y - movement) : value)
    if (event.key === 'ArrowDown') next = items.map(value => value.id === item.id ? placeStem(value, value.x, value.y + movement) : value)
    if (event.key === '+' || event.key === '=') next = items.map(value => value.id === item.id ? { ...value, scale: clamp(value.scale + .05, .35, .82) } : value)
    if (event.key === '-') next = items.map(value => value.id === item.id ? { ...value, scale: clamp(value.scale - .05, .35, .82) } : value)
    if (event.key === ',') next = items.map(value => value.id === item.id ? { ...value, rotation: clamp(normalizeRotation(value.rotation - 5), -38, 38) } : value)
    if (event.key === '.') next = items.map(value => value.id === item.id ? { ...value, rotation: clamp(normalizeRotation(value.rotation + 5), -38, 38) } : value)
    if (event.key === '[') next = moveLayer(items, item.id, -1)
    if (event.key === ']') next = moveLayer(items, item.id, 1)
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); return }
    if (!next) return
    event.preventDefault(); setSelectedId(item.id); commitItems(next, `${botanical(item.assetId)?.displayName ?? 'Stem'} adjusted.`)
  }

  const countAsset = (item: CatalogItem) => item.asset ? items.filter(value => value.assetId === item.asset!.id).length : 0

  const selectStem = (item: BouquetItemV1) => {
    setSelectedId(item.id)
    setCatalogSelection(botanical(item.assetId)?.displayName ?? '')
    setNotice(`${botanical(item.assetId)?.displayName ?? 'Stem'} selected.`)
  }

  const chooseBouquetStyle = (style: BouquetStyle) => {
    if (style === bouquetStyle) return
    setBouquetStyle(style)
    commitItems(arrangeBouquet(items, style), `${bouquetStyles.find(item => item.id === style)?.label ?? 'Bouquet'} shape applied.`)
  }

  const updateNote = (field: keyof BouquetNoteV1, value: string) => {
    setNote(current => ({ ...current, [field]: value }))
    if (noteErrors[field]) setNoteErrors(current => ({ ...current, [field]: undefined }))
  }

  const continueToMessage = () => {
    setSheetOpen(false)
    setSelectedId(null)
    setStudioMode('message')
    setNotice('Add the note that will travel with your bouquet.')
  }

  const continueToReview = () => {
    const nextNote = { to: note.to.trim(), body: note.body.trim(), from: note.from.trim() }
    const errors: Partial<Record<keyof BouquetNoteV1, string>> = {}
    if (!nextNote.to) errors.to = 'Add who this bouquet is for.'
    if (!nextNote.body) errors.body = 'Write a little something for them.'
    if (!nextNote.from) errors.from = 'Add your name.'
    setNoteErrors(errors)
    const firstInvalid = (['to', 'body', 'from'] as const).find(field => errors[field])
    if (firstInvalid) {
      ({ to: toRef, body: bodyRef, from: fromRef })[firstInvalid].current?.focus()
      setNotice(errors[firstInvalid] ?? 'Finish the note before previewing.')
      return
    }
    setNote(nextNote)
    setStudioMode('review')
    setNotice('Your bouquet and note are ready to review.')
  }

  const goBack = () => {
    if (sheetOpen) { setSheetOpen(false); return }
    if (studioMode === 'review') { setStudioMode('message'); return }
    if (studioMode === 'message') { setStudioMode('compose'); setSelectedId(items.at(-1)?.id ?? null); return }
    navigate('/?view=Bouquets')
  }

  const publishBouquet = async () => {
    if (sending) return
    if (!demo && (!user || !pairingId || !partnerUid)) {
      setNotice('Invite your person before sending. Your bouquet is safe here.')
      return
    }
    if (!demo && !navigator.onLine) {
      setNotice('You’re offline. Your bouquet is safe here; send it when you’re connected.')
      return
    }
    setSending(true)
    setNotice('Tucking your bouquet into your shared garden…')
    try {
      const draft = makeDraft()
      if (demo) sendDemoBouquet(draft)
      else await sendBouquet(draft, user!.uid, partnerUid!, pairingId!)
      draftStorage.remove(ownerId, draftId)
      navigate('/?view=Letters')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The bouquet could not be sent. Please try again.')
      setSending(false)
    }
  }

  return <main className={`bloom-create-studio ${sheetOpen ? 'is-expanded' : ''}`} data-mode={studioMode}>
    <header className="bloom-builder-header">
      <button className="bloom-studio-control" onClick={goBack} aria-label={studioMode === 'compose' ? 'Back to Bloom home' : `Back to ${studioMode === 'review' ? 'message' : 'bouquet editing'}`}><BloomIcon name="back" /></button>
      <h1>Your Bouquet</h1>
      <span aria-label={`Progress ${progress} of 5`}>{progress} / 5</span>
    </header>
    <section className="bloom-studio-canvas" aria-label="Bouquet arrangement canvas">
      <BouquetPreview items={items} selectedId={studioMode === 'compose' ? selectedId : null} zoom={zoom} wrap={selectedWrap} ribbon={selectedRibbon} bouquetStyle={bouquetStyle} interactive={studioMode === 'compose'} previewRef={previewRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onKeyDown={onStemKeyDown} />
      <span className="bloom-canvas-count">{studioMode === 'compose' ? `${items.length} ${items.length === 1 ? 'stem' : 'stems'}` : studioMode === 'message' ? 'Your note' : 'Final preview'}</span>
      <div className="bloom-zoom-controls" role="group" aria-label="Canvas zoom"><button className="bloom-studio-control" onClick={() => setZoom(value => clamp(value - .1, .8, 1.25))} disabled={zoom <= .8} aria-label="Zoom out"><BloomIcon name="minus" /></button><span>{Math.round(zoom * 100)}%</span><button className="bloom-studio-control" onClick={() => setZoom(value => clamp(value + .1, .8, 1.25))} disabled={zoom >= 1.25} aria-label="Zoom in"><BloomIcon name="plus" /></button></div>
      {studioMode === 'compose' && <div className="bloom-canvas-actions"><button className="bloom-studio-control" onClick={undo} disabled={!past.length} aria-label="Undo last change"><BloomIcon name="undo" /></button><button className="bloom-studio-control" onClick={redo} disabled={!future.length} aria-label="Redo last change"><BloomIcon name="redo" /></button><button className="bloom-studio-control" onClick={removeSelected} disabled={!selectedItem} aria-label="Delete selected item"><BloomIcon name="trash" /></button></div>}
      {studioMode === 'compose' && items.length > 0 && <StemSelector items={items} selectedId={selectedId} onSelect={selectStem} />}
      {studioMode === 'compose' && selectedItem && <div className="bloom-transform-controls" role="toolbar" aria-label={`Adjust ${botanical(selectedItem.assetId)?.displayName ?? 'selected stem'}`}>
        <button onClick={() => commitItems(arrangeBouquet(items, bouquetStyle), 'Bouquet gathered into its selected shape.')} aria-label="Gather and balance bouquet"><BloomIcon name="bouquet" size={18} /></button>
        <button onClick={() => changeSelected({ scale: clamp(selectedItem.scale - .06, .35, .82) }, 'Stem made smaller.')} aria-label="Make selected stem smaller"><BloomIcon name="minus" size={18} /></button>
        <button onClick={() => changeSelected(placeStem(selectedItem, selectedItem.x - .025, selectedItem.y), 'Stem fanned left.')} aria-label="Fan selected stem left"><BloomIcon name="rotateLeft" size={18} /></button>
        <button onClick={() => changeSelected(placeStem(selectedItem, selectedItem.x + .025, selectedItem.y), 'Stem fanned right.')} aria-label="Fan selected stem right"><BloomIcon name="rotateRight" size={18} /></button>
        <button onClick={() => changeSelected({ scale: clamp(selectedItem.scale + .06, .35, .82) }, 'Stem made larger.')} aria-label="Make selected stem larger"><BloomIcon name="plus" size={18} /></button>
      </div>}
      <p className="bloom-sr-only" aria-live="polite">{notice}</p>
      {studioMode === 'compose' && sheetOpen && <button className="bloom-canvas-scrim" onClick={() => setSheetOpen(false)} aria-label="Close expanded picker" />}
    </section>
    {studioMode === 'compose' && !sheetOpen && <section className="bloom-studio-tray" aria-label="Bouquet tools">
      <button className="bloom-tray-handle" onClick={() => setSheetOpen(true)} aria-label={`Expand ${category.toLowerCase()} library`}><span /></button>
      <div className="bloom-studio-tabs" role="tablist" aria-label="Bouquet tools">{(Object.keys(studioCatalog) as StudioCategory[]).map(item => <button key={item} role="tab" aria-selected={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <BouquetStylePicker value={bouquetStyle} onChange={chooseBouquetStyle} />
      <div className="bloom-studio-row">{catalogItems.map(item => <CompactFlowerTile key={item.name} item={item} count={countAsset(item)} selected={selectedCatalogName === item.name} disabled={Boolean(item.asset) && items.length >= MAX_BOUQUET_ITEMS} onClick={() => addCatalogItem(item)} />)}</div>
      <BloomButton icon="arrow" className="bloom-studio-continue" disabled={items.length < 3} onClick={continueToMessage}>Continue</BloomButton>
    </section>}
    {studioMode === 'message' && <section className="bloom-studio-tray bloom-note-tray" aria-labelledby="bouquet-note-heading">
      <span className="bloom-tray-handle" aria-hidden="true"><span /></span>
      <div className="bloom-note-heading"><div><h2 id="bouquet-note-heading">A note for them</h2><p>A few words to keep with the flowers.</p></div><BloomIcon name="heart" size={22} /></div>
      <div className="bloom-note-paper">
        <label className="bloom-note-field"><span>To <small>{note.to.length} / {NOTE_LIMITS.to}</small></span><input ref={toRef} value={note.to} maxLength={NOTE_LIMITS.to} autoComplete="name" aria-invalid={Boolean(noteErrors.to)} aria-describedby={noteErrors.to ? 'bouquet-note-to-error' : undefined} onChange={event => updateNote('to', event.target.value)} placeholder="Their name" />{noteErrors.to && <small id="bouquet-note-to-error" role="alert">{noteErrors.to}</small>}</label>
        <label className="bloom-note-field bloom-note-field--message"><span>Message <small>{note.body.length} / {NOTE_LIMITS.body}</small></span><textarea ref={bodyRef} value={note.body} maxLength={NOTE_LIMITS.body} aria-invalid={Boolean(noteErrors.body)} aria-describedby={noteErrors.body ? 'bouquet-note-body-error' : undefined} onChange={event => updateNote('body', event.target.value)} placeholder="A little something from the heart…" />{noteErrors.body && <small id="bouquet-note-body-error" role="alert">{noteErrors.body}</small>}</label>
        <label className="bloom-note-field"><span>From <small>{note.from.length} / {NOTE_LIMITS.from}</small></span><input ref={fromRef} value={note.from} maxLength={NOTE_LIMITS.from} autoComplete="name" aria-invalid={Boolean(noteErrors.from)} aria-describedby={noteErrors.from ? 'bouquet-note-from-error' : undefined} onChange={event => updateNote('from', event.target.value)} placeholder="Your name" />{noteErrors.from && <small id="bouquet-note-from-error" role="alert">{noteErrors.from}</small>}</label>
      </div>
      <BloomButton icon="arrow" className="bloom-studio-continue" onClick={continueToReview}>Preview bouquet</BloomButton>
    </section>}
    {studioMode === 'review' && <section className="bloom-studio-tray bloom-review-tray" aria-labelledby="bouquet-review-heading">
      <span className="bloom-tray-handle" aria-hidden="true"><span /></span>
      <div className="bloom-review-heading"><div><h2 id="bouquet-review-heading">Ready for them</h2><p>Your flowers, wrapping, and note are together.</p></div><span className="bloom-review-check"><BloomIcon name="check" size={18} /></span></div>
      <div className="bloom-review-content">
        <blockquote className="bloom-review-note"><strong>For {note.to}</strong><p>{note.body}</p><span>— {note.from}</span></blockquote>
        <dl className="bloom-review-details"><div><dt>Wrapping</dt><dd>{selectedWrap.displayName}</dd></div><div><dt>Ribbon</dt><dd>{selectedRibbon?.displayName ?? 'Not chosen'}</dd></div><div><dt>Flowers</dt><dd>{items.length} stems</dd></div></dl>
      </div>
      <div className="bloom-review-actions"><BloomButton tone="secondary" disabled={sending} onClick={() => { setStudioMode('compose'); setSelectedId(items.at(-1)?.id ?? null) }}>Edit bouquet</BloomButton><BloomButton tone="secondary" disabled={sending} onClick={() => setStudioMode('message')}>Edit note</BloomButton><span className="bloom-send-unavailable"><BloomButton disabled={sending} onClick={() => void publishBouquet()}>{sending ? 'Sending…' : 'Send bouquet'}</BloomButton><small>Only your person can open it.</small></span></div>
    </section>}
    <StudioSheet open={studioMode === 'compose' && sheetOpen} category={category} selected={selectedCatalogName} itemCount={items.length} bouquetStyle={bouquetStyle} countAsset={countAsset} onSelect={addCatalogItem} onClose={() => setSheetOpen(false)} onCategory={setCategory} onStyle={chooseBouquetStyle} />
  </main>
}

function BouquetDetail({ id, navigate }: { id: string; navigate: (path: string) => void }) {
  const { user, pairingId, me, partner } = useSession()
  const demo = new URLSearchParams(location.search).get('demo') === '1'
  const selfId = demo ? 'sample-self' : user?.uid ?? ''
  const { bouquets: cloudBouquets, error } = useBouquets(demo ? null : user?.uid ?? null, demo ? null : pairingId)
  const bouquets = demo ? [sampleReceivedBouquet, ...loadDemoBouquets()] : cloudBouquets
  const bouquet = bouquets?.find(item => item.id === id) ?? null
  const incoming = bouquet?.recipientId === selfId
  const [openedId, setOpenedId] = useState<string | null>(null)
  const opened = Boolean(bouquet && (!incoming || bouquet.viewedAt || openedId === bouquet.id))

  useEffect(() => {
    if (!demo && bouquet && incoming && !bouquet.receivedAt) void markBouquetReceived(bouquet.id).catch(() => undefined)
  }, [bouquet?.id, bouquet?.receivedAt, demo, incoming])

  if (bouquets === null) return <main className="bloom-receive bloom-receive--loading"><p>Gathering the bouquet…</p></main>
  if (!bouquet) return <main className="bloom-receive bloom-receive--missing"><BloomIcon name="bouquet" size={38} /><h1>{error ? 'This bouquet could not load.' : 'This bouquet isn’t available.'}</h1><p>{error ? 'Check your connection and try again from your letterbox.' : 'It may belong to another shared garden.'}</p><BloomButton onClick={() => navigate('/?view=Letters')}>Back to your letterbox</BloomButton></main>
  const senderName = bouquet.senderId === selfId ? me?.name ?? 'You' : demo ? 'Your person' : partner?.name ?? 'Your person'
  const openBouquet = () => {
    setOpenedId(bouquet.id)
    if (!demo && incoming && !bouquet.viewedAt) void markBouquetViewed(bouquet.id).catch(() => undefined)
  }
  if (!opened) return <main className="bloom-receive bloom-receive--sealed"><button className="bloom-receive-back" onClick={() => navigate('/?view=Letters')} aria-label="Back to your letterbox"><BloomIcon name="back" /></button><div className="bloom-arrival"><p>{senderName} gathered something for you.</p><img src={experienceById.get('envelope_closed')?.file} alt="A sealed envelope holding a bouquet" /><h1>A bouquet is waiting.</h1><BloomButton onClick={openBouquet}>Open it</BloomButton></div></main>
  return <main className="bloom-receive bloom-receive--open"><button className="bloom-receive-back" onClick={() => navigate('/?view=Letters')} aria-label="Back to your letterbox"><BloomIcon name="back" /></button><div className="bloom-received-keepsake"><BouquetMiniature composition={bouquet.composition} /><div className="bloom-received-note"><span>For {bouquet.composition.note.to}</span><p>{bouquet.composition.note.body}</p><strong>— {bouquet.composition.note.from}</strong></div><small>Sent privately by {senderName} · {bouquetDate(bouquet.createdAt)}</small></div></main>
}

function KitchenSink() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState('All')
  return <main className="bloom-kitchen">
    <header><h1>Bouquet foundation</h1><p>A private visual check for the palette, type, controls, states, and iPhone-safe surfaces.</p></header>
    <section><h2>Palette</h2><div className="bloom-swatches">{[
      ['Blush', '#FFF7F8'], ['Petal', '#FCEAEC'], ['Rose', '#EEB5BE'], ['Ribbon', '#D96F80'], ['Berry', '#A94153'], ['Paper', '#FFFDF9'], ['Canvas', '#FBF7F1'], ['Line', '#E9DDE0'], ['Ink', '#796D70'], ['Sage', '#A8B8A0'], ['Lavender', '#B7A4C8'], ['Butter', '#F2D58A'], ['Peach', '#E8A18D'],
    ].map(([name, color]) => <div key={color}><span style={{ background: color }} /><strong>{name}</strong><small>{color}</small></div>)}</div></section>
    <section><h2>Actions</h2><div className="bloom-kitchen-row"><BloomButton icon="arrow">Continue</BloomButton><BloomButton tone="secondary">Save draft</BloomButton><BloomButton tone="ghost">Cancel</BloomButton><BloomButton disabled>Unavailable</BloomButton></div></section>
    <section><h2>Field and filters</h2><HeartInput label="Who is this for?" placeholder="Their name" hint="This appears on the keepsake note." /><div className="bloom-chips">{['All', 'Popular', 'Filler', 'Greenery'].map(item => <FilterChip key={item} active={filter === item} onClick={() => setFilter(item)}>{item}</FilterChip>)}</div></section>
    <section><h2>Studio progress</h2><p className="bloom-kitchen-progress">3 / 5</p></section>
    <section><h2>Flower cards</h2><div className="bloom-flower-grid">{flowerTones.map((tone, index) => <FlowerCard key={tone} name={['Garden rose', 'Buttercup', 'Lavender', 'Eucalyptus'][index]} kind={['Popular', 'Filler', 'Filler', 'Greenery'][index]} tone={tone} selected={index === 0} />)}</div></section>
    <section><h2>Experience artwork</h2><div className="bloom-experience-grid">{assetManifest.experience.map(asset => <figure className={`bloom-experience-item bloom-experience-item--${asset.layout}`} key={asset.id}><img src={asset.file} alt="" loading="lazy" decoding="async" /><figcaption>{asset.displayName}</figcaption></figure>)}</div></section>
    <section><h2>Bottom sheet</h2><BloomButton tone="secondary" onClick={() => setSheetOpen(true)}>Open flower picker</BloomButton></section>
    <StudioSheet open={sheetOpen} category="Flowers" selected="Garden rose" itemCount={0} bouquetStyle="classic" countAsset={() => 0} onSelect={() => {}} onClose={() => setSheetOpen(false)} onCategory={() => {}} onStyle={() => {}} />
  </main>
}

export default function BouquetApp() {
  const { path, navigate } = useBouquetRoute()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    document.body.classList.add('bloom-is-active')
    return () => document.body.classList.remove('bloom-is-active')
  }, [])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    addEventListener('online', update)
    addEventListener('offline', update)
    return () => { removeEventListener('online', update); removeEventListener('offline', update) }
  }, [])
  const privateKitchen = path === '/bloom/kitchen-sink' && import.meta.env.DEV
  const creating = path.startsWith('/bloom/create')
  const bouquetId = path.match(/^\/bloom\/bouquet\/([^/]+)$/)?.[1] ?? null
  const viewing = Boolean(bouquetId)
  return <div className={`bloom-app ${creating ? 'bloom-app--create' : ''}${viewing ? ' bloom-app--receive' : ''}`}>
    {!online && <div className="bloom-offline-banner" role="status">You’re offline. Your bouquet draft stays safely on this device.</div>}
    {privateKitchen ? <KitchenSink /> : creating ? <CreateFoundation navigate={navigate} /> : bouquetId ? <BouquetDetail id={decodeURIComponent(bouquetId)} navigate={navigate} /> : <main className="bloom-home"><BouquetHomePanel navigate={navigate} /></main>}
  </div>
}

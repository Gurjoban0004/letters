// Individual sticker PNGs extracted from vault/details/details.png
// Each file is a tight-trimmed RGBA PNG with only the sticker (no bleed).

export const detailNames = [
  'voiceReady', 'voicePlaying', 'voiceWave',
  'photoPolaroid', 'photoStamp', 'photoDeckled',
  'datePill', 'justForYouTag', 'littleNoteTag',
  'washiPink', 'washiBeige', 'washiGingham', 'tapeHearts',
  'stampTulip', 'stampCat', 'stampBow', 'stamps',
  'noteLined', 'heartNote', 'smallProgress', 'letterNote', 'withLoveTag',
  'botanical', 'petal', 'leaf', 'cloud', 'botanicalFlower', 'floralSprig',
  'bow', 'waxSeal', 'waxSealSmall', 'paperclip', 'miniEnvelope', 'cat',
] as const

export type DetailAssetName = typeof detailNames[number]

export function isDetailAsset(value: string): value is DetailAssetName {
  return (detailNames as readonly string[]).includes(value)
}

export function DetailsAsset({
  name,
  className = '',
  label,
  style,
}: {
  name: DetailAssetName
  className?: string
  label?: string
  style?: React.CSSProperties
}) {
  return (
    <img
      src={`/stationery/details/${name}.png`}
      className={`details-asset ${className}`}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      draggable={false}
      style={style}
    />
  )
}

/** No-op kept for backward compat — shape is no longer needed */
export function detailShape(_name: DetailAssetName): string {
  return 'none'
}

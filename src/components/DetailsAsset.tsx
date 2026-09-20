type Crop = { x: number; y: number; width: number; height: number }

export const detailCrops = {
  voiceReady: { x: 18, y: 48, width: 375, height: 118 },
  voicePlaying: { x: 18, y: 169, width: 375, height: 110 },
  photoPolaroid: { x: 396, y: 58, width: 188, height: 288 },
  photoStamp: { x: 590, y: 58, width: 192, height: 292 },
  photoDeckled: { x: 765, y: 60, width: 205, height: 300 },
  waxHearts: { x: 18, y: 414, width: 175, height: 82 },
  washiPink: { x: 414, y: 402, width: 158, height: 98 },
  washiGingham: { x: 710, y: 402, width: 190, height: 103 },
  stamps: { x: 18, y: 624, width: 400, height: 208 },
  noteLined: { x: 428, y: 625, width: 150, height: 205 },
  heartNote: { x: 574, y: 625, width: 162, height: 205 },
  smallProgress: { x: 733, y: 625, width: 170, height: 208 },
  botanical: { x: 895, y: 615, width: 170, height: 264 },
  bow: { x: 292, y: 875, width: 270, height: 252 },
  waxSeal: { x: 532, y: 866, width: 185, height: 245 },
  paperclip: { x: 725, y: 870, width: 112, height: 190 },
  miniEnvelope: { x: 842, y: 884, width: 215, height: 170 },
  letterNote: { x: 1040, y: 870, width: 168, height: 245 },
  cat: { x: 956, y: 1032, width: 248, height: 200 },
} satisfies Record<string, Crop>

export type DetailAssetName = keyof typeof detailCrops

export function isDetailAsset(value: string): value is DetailAssetName {
  return value in detailCrops
}

export function DetailsAsset({ name, className = '', label }: { name: DetailAssetName; className?: string; label?: string }) {
  const crop = detailCrops[name]
  return <svg className={`details-asset ${className}`} viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <image href="/stationery/details.png" width="1212" height="1297" />
  </svg>
}

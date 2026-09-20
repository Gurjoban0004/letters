import type { CSSProperties, ReactNode } from 'react'
import { getStationery } from '../lib/letters'

type PaperVariables = CSSProperties & {
  '--paper-image': string
  '--paper-aspect': string
  '--paper-padding': string
  '--letter-font'?: string
}

export function StationeryPaper({
  paperId = 'paper_1',
  fontFamily,
  className = '',
  children,
}: {
  paperId?: string
  fontFamily?: string
  className?: string
  children: ReactNode
}) {
  const paper = getStationery(paperId)
  const style: PaperVariables = {
    '--paper-image': `url("${paper.url}")`,
    '--paper-aspect': paper.aspect,
    '--paper-padding': paper.padding,
    ...(fontFamily ? { '--letter-font': fontFamily } : {}),
  }

  return <article className={`stationery-paper ${className}`} style={style}>{children}</article>
}

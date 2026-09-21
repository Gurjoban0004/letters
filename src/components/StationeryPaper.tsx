import { forwardRef, type CSSProperties, type ComponentPropsWithoutRef } from 'react'
import { getStationery } from '../lib/letters'

type PaperVariables = CSSProperties & {
  '--paper-image': string
  '--paper-aspect': string
  '--paper-padding': string
  '--letter-font'?: string
}

type StationeryPaperProps = Omit<ComponentPropsWithoutRef<'article'>, 'style'> & {
  paperId?: string
  fontFamily?: string
}

export const StationeryPaper = forwardRef<HTMLElement, StationeryPaperProps>(function StationeryPaper({
  paperId = 'paper_1',
  fontFamily,
  className = '',
  children,
  ...articleProps
}, ref) {
  const paper = getStationery(paperId)
  const style: PaperVariables = {
    '--paper-image': `url("${paper.url}")`,
    '--paper-aspect': paper.aspect,
    '--paper-padding': paper.padding,
    ...(fontFamily ? { '--letter-font': fontFamily } : {}),
  }

  return <article ref={ref} className={`stationery-paper ${className}`} style={style} {...articleProps}>{children}</article>
})

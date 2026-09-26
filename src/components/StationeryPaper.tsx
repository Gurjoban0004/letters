import { forwardRef, type CSSProperties, type ComponentPropsWithoutRef } from 'react'
import { getStationery } from '../lib/letters'

type PaperVariables = CSSProperties & {
  '--paper-image': string
  '--paper-aspect': string
  '--letter-font'?: string
  '--paper-font': string
  '--paper-ink': string
  '--paper-safe-top': string
  '--paper-safe-right': string
  '--paper-safe-bottom': string
  '--paper-safe-left': string
  '--paper-type-size': string
  '--paper-line-height': string
  '--paper-paragraph-space': string
  '--paper-rule-offset'?: string
  '--paper-rule-step'?: string
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
    '--paper-font': paper.profile.defaultStyle === 'handwritten' ? "'Caveat', 'Segoe Print', cursive" : "'Newsreader', Georgia, serif",
    '--paper-ink': paper.profile.ink,
    '--paper-safe-top': `${paper.profile.safe.top}%`,
    '--paper-safe-right': `${paper.profile.safe.right}%`,
    '--paper-safe-bottom': `${paper.profile.safe.bottom}%`,
    '--paper-safe-left': `${paper.profile.safe.left}%`,
    '--paper-type-size': `${paper.profile.fontSize}px`,
    '--paper-line-height': String(paper.profile.lineHeight),
    '--paper-paragraph-space': `${paper.profile.paragraphSpacing}em`,
    ...(paper.profile.printedBaseline ? {
      '--paper-rule-offset': `${paper.profile.printedBaseline.offset}%`,
      '--paper-rule-step': `${paper.profile.printedBaseline.step}%`,
    } : {}),
    ...(fontFamily ? { '--letter-font': fontFamily } : {}),
  }

  return <article ref={ref} className={`stationery-paper ${className}`} style={style} {...articleProps}>{children}</article>
})

import type { CSSProperties } from 'react'
import { getEnvelope, getStationery } from '../lib/letters'
import desktopStationery from '../assets/stationery-desktop.jpg?url'
import mobileStationery from '../assets/stationery-mobile.jpg?url'
import squareEnvelopes from '../assets/envelopes-square.jpg?url'
import wideEnvelopes from '../assets/envelopes-wide.jpg?url'

type PaperStyle = CSSProperties & Record<'--paper-art-desktop' | '--paper-art-mobile' | '--paper-position-desktop' | '--paper-position-mobile' | '--paper-tint', string>
export function paperStyle(paperId: string): PaperStyle {
  const paper = getStationery(paperId)
  return {
    '--paper-art-desktop': `url(${desktopStationery})`,
    '--paper-art-mobile': `url(${mobileStationery})`,
    '--paper-position-desktop': `${paper.desktop[0] * 20}% ${paper.desktop[1] * 33.333}%`,
    '--paper-position-mobile': `${paper.mobile[0] * 25}% ${paper.mobile[1] * 25}%`,
    '--paper-tint': paper.tint,
  }
}

export function PaperArtwork({ paper }: { paper: string }) {
  return <span className="stationery-art" style={paperStyle(paper)} aria-hidden />
}

type EnvelopeStyle = CSSProperties & Record<'--envelope-art' | '--envelope-position' | '--envelope-size', string>
export function envelopeStyle(envelopeId?: string): EnvelopeStyle {
  const envelope = getEnvelope(envelopeId)
  const wide = envelope.source === 'wide'
  return {
    '--envelope-art': `url(${wide ? wideEnvelopes : squareEnvelopes})`,
    '--envelope-position': `${envelope.cell[0] * (wide ? 20 : 33.333)}% ${envelope.cell[1] * 33.333}%`,
    '--envelope-size': `${wide ? 600 : 400}% auto`,
  }
}

export function EnvelopeArtwork({ envelope, className = '' }: { envelope?: string; className?: string }) {
  return <span className={`envelope-art ${className}`} style={envelopeStyle(envelope)} aria-hidden />
}

import { useEffect, useState } from 'react'
import { readViewportInfo } from './visualViewport'

export function ViewportDebug() {
  const enabled = new URLSearchParams(location.search).get('debug') === 'viewport'
  const [info, setInfo] = useState(() => enabled ? readViewportInfo() : null)

  useEffect(() => {
    if (!enabled) return
    const update = () => setInfo(readViewportInfo())
    const viewport = window.visualViewport
    const timer = window.setInterval(update, 750)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    addEventListener('orientationchange', update)
    return () => {
      window.clearInterval(timer)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      removeEventListener('orientationchange', update)
    }
  }, [enabled])

  if (!info) return null
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
  const worker = navigator.serviceWorker?.controller?.scriptURL.split('/').at(-1) ?? 'none'
  return <output className="viewport-debug" aria-live="off">
    <b>Viewport · Letters {appVersion}</b>
    <span>standalone: {String(info.standalone)} / {info.displayMode}</span>
    <span>inner / screen: {info.inner} / {info.screen}</span>
    <span>visual: {info.visualViewport}</span>
    <span>safe T/R/B/L: {info.insets}</span>
    <span>svh/lvh/dvh: {info.viewportUnits}</span>
    <span>document scroll: {info.documentScroll}</span>
    <span>keyboard: {info.keyboard}</span>
    <span>service worker: {worker}</span>
  </output>
}

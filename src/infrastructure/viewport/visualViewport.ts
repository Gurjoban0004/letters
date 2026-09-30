export function bindVisualViewport(root: HTMLElement = document.documentElement) {
  const viewport = window.visualViewport
  if (!viewport) return () => {}

  let frame = 0
  const apply = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const zoomed = viewport.scale > 1.01
      const keyboardInset = zoomed ? 0 : Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      const keyboardOpen = keyboardInset > 80
      root.style.setProperty('--kb-inset', `${keyboardInset}px`)
      root.style.setProperty('--vv-height', `${viewport.height}px`)
      root.style.setProperty('--vv-top', `${viewport.offsetTop}px`)
      root.dataset.keyboard = keyboardOpen ? 'open' : 'closed'
    })
  }

  viewport.addEventListener('resize', apply)
  viewport.addEventListener('scroll', apply)
  window.addEventListener('orientationchange', apply)
  document.addEventListener('visibilitychange', apply)
  apply()

  return () => {
    cancelAnimationFrame(frame)
    viewport.removeEventListener('resize', apply)
    viewport.removeEventListener('scroll', apply)
    window.removeEventListener('orientationchange', apply)
    document.removeEventListener('visibilitychange', apply)
  }
}

function probe(cssText: string) {
  const element = document.createElement('div')
  element.style.cssText = `position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;${cssText}`
  document.body.appendChild(element)
  const style = getComputedStyle(element)
  const value = {
    height: Math.round(element.getBoundingClientRect().height),
    top: style.paddingTop,
    right: style.paddingRight,
    bottom: style.paddingBottom,
    left: style.paddingLeft,
  }
  element.remove()
  return value
}

export function readViewportInfo() {
  const viewport = window.visualViewport
  const insets = probe('padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)')
  return {
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayMode: matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    inner: `${innerWidth}×${innerHeight}`,
    screen: `${screen.width}×${screen.height}`,
    visualViewport: viewport ? `${Math.round(viewport.width)}×${Math.round(viewport.height)} @ ${Math.round(viewport.offsetLeft)},${Math.round(viewport.offsetTop)} · ${viewport.scale.toFixed(2)}×` : 'unavailable',
    insets: `${insets.top} ${insets.right} ${insets.bottom} ${insets.left}`,
    viewportUnits: `${probe('height:100svh').height}/${probe('height:100lvh').height}/${probe('height:100dvh').height}`,
    documentScroll: Math.round(document.scrollingElement?.scrollTop ?? 0),
    keyboard: `${document.documentElement.dataset.keyboard ?? 'unknown'} · ${getComputedStyle(document.documentElement).getPropertyValue('--kb-inset').trim() || '0px'}`,
  }
}

import { flushSync } from 'react-dom'

export type ViewDirection = 'forward' | 'back' | 'fade' | 'sheet'

type BrowserViewTransition = {
  finished: Promise<void>
  ready?: Promise<void>
  updateCallbackDone?: Promise<void>
  skipTransition: () => void
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => BrowserViewTransition
}

let activeTransition: BrowserViewTransition | null = null
const navigationSubscribers = new Set<() => void>()
let listeningForPopState = false

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function transitionView(update: () => void, direction: ViewDirection = 'forward') {
  const transitionDocument = document as TransitionDocument
  if (!transitionDocument.startViewTransition || prefersReducedMotion()) {
    update()
    return Promise.resolve()
  }

  activeTransition?.skipTransition()
  document.documentElement.dataset.viewTransition = direction

  const transition = transitionDocument.startViewTransition(() => flushSync(update))
  activeTransition = transition
  // Skipping an in-flight transition is expected during fast tab changes.
  // Consume every transition promise so browsers do not report that normal
  // interruption as an unhandled console error.
  void transition.ready?.catch(() => undefined)
  void transition.updateCallbackDone?.catch(() => undefined)

  const finish = () => {
    if (activeTransition !== transition) return
    activeTransition = null
    delete document.documentElement.dataset.viewTransition
  }
  transition.finished.then(finish, finish)
  return transition.finished.catch(() => undefined)
}

export function navigateView(path: string, direction: ViewDirection = 'forward', replace = false) {
  return transitionView(() => {
    if (replace) history.replaceState(null, '', path)
    else history.pushState(null, '', path)
    navigationSubscribers.forEach(update => update())
  }, direction)
}

export function subscribeToViewNavigation(update: () => void) {
  navigationSubscribers.add(update)
  if (!listeningForPopState) {
    addEventListener('popstate', handlePopState)
    listeningForPopState = true
  }
  return () => {
    navigationSubscribers.delete(update)
    if (!navigationSubscribers.size && listeningForPopState) {
      removeEventListener('popstate', handlePopState)
      listeningForPopState = false
    }
  }
}

function handlePopState() {
  void transitionView(() => navigationSubscribers.forEach(update => update()), 'back')
}

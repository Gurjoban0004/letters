import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { SessionProvider, useSession } from './lib/session'
import Letters from './screens/Letters'
import Welcome from './screens/Welcome'
import { EnvelopeSealed } from './components/EnvelopeSealed'
import { DetailsAsset } from './components/DetailsAsset'
import { ViewportDebug } from './infrastructure/viewport/ViewportDebug'
import { subscribeToViewNavigation, transitionView } from './lib/viewTransitions'

const BOUQUET_RELOAD_KEY = 'letters:bloom-chunk-reload'

async function loadBouquetApp() {
  try {
    const module = await Promise.race([
      import('./bouquet/BouquetApp'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Bouquet bundle timed out')), 15_000)),
    ])
    sessionStorage.removeItem(BOUQUET_RELOAD_KEY)
    return module
  } catch (error) {
    if (!sessionStorage.getItem(BOUQUET_RELOAD_KEY)) {
      sessionStorage.setItem(BOUQUET_RELOAD_KEY, '1')
      try {
        const registration = await navigator.serviceWorker?.getRegistration()
        await registration?.update()
      } catch { /* Reload still gives the browser cache a clean second chance. */ }
      location.reload()
      return new Promise<never>(() => undefined)
    }
    sessionStorage.removeItem(BOUQUET_RELOAD_KEY)
    throw error
  }
}

const BouquetApp = lazy(loadBouquetApp)

class BouquetErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Bouquet failed to open:', error, info) }
  render() {
    if (this.state.failed) return <div className="loading-page loading-recovery"><span className="brand">Bloom</span><h1>Let’s gather those flowers again.</h1><p>The bouquet studio couldn’t finish opening.</p><div><button className="primary" onClick={() => location.reload()}>Try again</button><a className="secondary" href="/">Back to letters</a></div></div>
    return this.props.children
  }
}

function UpdateNotice({ update }: { update: () => void }) {
  return <div className="update-notice" role="status"><span>A fresh version is ready.</span><button onClick={update}>Update</button></div>
}

export default function App() {
  return <MotionConfig reducedMotion="user"><SessionProvider><Shell /></SessionProvider></MotionConfig>
}
function Shell() {
  const { user, me, loading, joiningInvite, sessionIssue, retrySession } = useSession()
  const [demo, setDemo] = useState(new URLSearchParams(location.search).get('demo') === '1')
  const [path, setPath] = useState(location.pathname)
  const [startupSlow, setStartupSlow] = useState(false)
  const { needRefresh: [refresh], updateServiceWorker } = useRegisterSW()
  // Bloom's library and home now live inside the main Letters shell. Only the
  // immersive creation and opening moments need their own full-screen route.
  const bouquetRoute = path.startsWith('/bloom/create') || path.startsWith('/bloom/bouquet/') || path === '/bloom/kitchen-sink'
  useEffect(() => subscribeToViewNavigation(() => setPath(location.pathname)), [])
  useEffect(() => {
    if (!bouquetRoute && (demo || import.meta.env.DEV || (user && me && !joiningInvite))) void import('./bouquet/BouquetApp')
  }, [bouquetRoute, demo, joiningInvite, me, user])
  useEffect(() => {
    if (!loading) { setStartupSlow(false); return }
    const timer = setTimeout(() => setStartupSlow(true), 8_000)
    return () => clearTimeout(timer)
  }, [loading])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const checkForUpdate = () => { void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => undefined) }
    checkForUpdate()
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') checkForUpdate() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', checkForUpdate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', checkForUpdate)
    }
  }, [])
  const applyUpdate = () => { void updateServiceWorker(true) }
  if ((loading || sessionIssue) && !demo) return <><div className={`loading-page ${(sessionIssue || startupSlow) ? 'loading-recovery' : ''}`}><div className="loading-cloud cloud-one" /><div className="loading-cloud cloud-two" /><span className="brand">letters<span>♡</span></span><div className="loading-envelope"><EnvelopeSealed envelopeId="env_6" state="open" /><DetailsAsset name="roseGoldStar" /></div><p>{sessionIssue || (startupSlow ? 'This is taking a little longer than usual.' : 'Gathering your letters…')}</p>{sessionIssue || startupSlow ? <button className="secondary" onClick={retrySession}>Try again</button> : <span className="loading-whisper">paper, petals, and a little patience</span>}</div>{refresh ? <UpdateNotice update={applyUpdate} /> : null}<ViewportDebug /></>
  return <>{bouquetRoute && (demo || import.meta.env.DEV || (user && me && !joiningInvite)) ? <BouquetErrorBoundary><Suspense fallback={<div className="loading-page"><span className="brand">Bloom</span><p>Gathering your bouquet studio…</p></div>}><BouquetApp /></Suspense></BouquetErrorBoundary> : demo || (user && me && !joiningInvite) ? <Letters key={demo ? 'preview' : user!.uid} demo={demo} onExitDemo={() => void transitionView(() => setDemo(false), 'back')} /> : <Welcome onPreview={() => void transitionView(() => setDemo(true), 'forward')} />}
    {refresh ? <UpdateNotice update={applyUpdate} /> : null}
    <ViewportDebug />
  </>
}

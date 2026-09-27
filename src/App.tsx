import { useState } from 'react'
import { MotionConfig } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { SessionProvider, useSession } from './lib/session'
import Letters from './screens/Letters'
import Welcome from './screens/Welcome'
import { EnvelopeSealed } from './components/EnvelopeSealed'
import { DetailsAsset } from './components/DetailsAsset'

export default function App() {
  return <MotionConfig reducedMotion="user"><SessionProvider><Shell /></SessionProvider></MotionConfig>
}
function Shell() {
  const { user, me, loading } = useSession()
  const [demo, setDemo] = useState(new URLSearchParams(location.search).get('demo') === '1')
  const { needRefresh: [refresh], updateServiceWorker } = useRegisterSW()
  if (loading && !demo) return <div className="loading-page"><div className="loading-cloud cloud-one" /><div className="loading-cloud cloud-two" /><span className="brand">letters<span>♡</span></span><div className="loading-envelope"><EnvelopeSealed envelopeId="env_5" state="open" /><DetailsAsset name="pinkButterfly" /></div><p>Gathering your letters…</p><span className="loading-whisper">paper, petals, and a little patience</span></div>
  return <>{demo || (user && me) ? <Letters key={demo ? 'preview' : user!.uid} demo={demo} onExitDemo={() => setDemo(false)} /> : <Welcome onPreview={() => setDemo(true)} />}
    {refresh && <div className="update-notice" role="status">A fresh version is ready. Save your draft first.<button onClick={() => updateServiceWorker(true)}>Update</button></div>}
  </>
}

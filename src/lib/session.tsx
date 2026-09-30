import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db, PAIRING_ID } from './firebase'
import { joinPairing } from './join'
import { disablePush } from './push'
import { firstName } from './names'

export type Edition = 'rose' | 'graphite'

export type Profile = { name: string; edition: Edition; joinedAt?: unknown }

export type Pairing = {
  members: string[]
  profiles: Record<string, Profile>
  createdBy?: string
  status?: 'waiting' | 'active' | 'cancelled'
  acceptedAt?: unknown
  cancelledAt?: unknown
  metOn?: string | null
  lastPulse?: { from: string; at: unknown } | null
}

type Session = {
  user: User | null
  pairing: Pairing | null
  me: Profile | null
  partnerUid: string | null
  partner: Profile | null
  loading: boolean
  pairingId: string | null
  inviteUrl: string | null
  joiningInvite: boolean
  invitation: Pairing | null
  invitationUnavailable: boolean
  dismissInvite: () => void
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  claimSlot: (name: string, edition: Edition) => Promise<void>
}

const Ctx = createContext<Session | null>(null)

function inviteIdFromLocation() {
  return new URLSearchParams(location.search).get('invite')?.match(/^[\w-]{20,80}$/)?.[0] ?? null
}

function isWaitingPairing(value: Pairing | null) {
  return !!value && (value.members ?? []).length === 1 && value.status !== 'active' && value.status !== 'cancelled'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [identityReady, setIdentityReady] = useState(false)
  const [pairingReady, setPairingReady] = useState(false)
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<Pairing | null>(null)
  const [invitationUnavailable, setInvitationUnavailable] = useState(false)
  const [invitationReady, setInvitationReady] = useState(true)
  const [retry, setRetry] = useState(0)
  const [inviteId, setInviteId] = useState(inviteIdFromLocation)

  useEffect(() => {
    const syncInvite = () => setInviteId(inviteIdFromLocation())
    addEventListener('popstate', syncInvite)
    return () => removeEventListener('popstate', syncInvite)
  }, [])

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u); setAuthReady(true); setIdentityReady(!u)
    if (!u) { setPairingId(null); setPairing(null); setPairingReady(true) }
  }), [])

  useEffect(() => {
    if (!user) return
    let active = true
    setIdentityReady(false)
    const identityRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(identityRef, async identity => {
      let id = identity.exists() ? String(identity.data().pairingId ?? '') : ''
      if (!id && PAIRING_ID) {
        try {
          const legacy = await getDoc(doc(db, 'pairings', PAIRING_ID))
          if (legacy.exists() && (legacy.data().members ?? []).includes(user.uid)) {
            id = PAIRING_ID
            await setDoc(identityRef, { pairingId: id }, { merge: true })
          }
        } catch { /* A new user does not have access to the legacy pairing. */ }
      }
      if (active) { setPairingReady(!id); setPairingId(id || null); setIdentityReady(true) }
    }, () => { if (active) setIdentityReady(true) })
    return () => { active = false; unsubscribe() }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !inviteId || inviteId === pairingId) {
      setInvitation(null)
      setInvitationUnavailable(false)
      setInvitationReady(true)
      return
    }
    if (pairingId && !pairingReady) return
    if (pairingId && !isWaitingPairing(pairing)) {
      setInvitation(null)
      setInvitationUnavailable(true)
      setInvitationReady(true)
      return
    }
    let active = true
    setInvitationUnavailable(false)
    setInvitationReady(false)
    getDoc(doc(db, 'pairings', inviteId)).then(snap => {
      if (!active) return
      const data = snap.exists() ? snap.data() as Pairing : null
      if (!isWaitingPairing(data)) {
        setInvitation(null)
        setInvitationUnavailable(true)
        setInvitationReady(true)
        return
      }
      setInvitation(data)
      setInvitationReady(true)
    }).catch(() => {
      if (active) { setInvitation(null); setInvitationUnavailable(true); setInvitationReady(true) }
    })
    return () => { active = false }
  }, [user?.uid, inviteId, pairingId, pairingReady, pairing])

  useEffect(() => {
    if (!user?.uid || !pairingId) { setPairing(null); setPairingReady(true); return }
    setPairingReady(false)
    return onSnapshot(
      doc(db, 'pairings', pairingId),
      (snap) => { setPairing(snap.exists() ? (snap.data() as Pairing) : null); setPairingReady(true) },
      (err) => {
        // Firestore tears a listener down permanently on error, including the
        // brief permission gap right after signing in as someone else. Without
        // re-attaching, the app stays blank until a manual reload.
        console.warn('pairing listener dropped:', err.code)
        setTimeout(() => setRetry((n) => n + 1), 1500)
      },
    )
  }, [user?.uid, pairingId, retry])

  const displayPairing = pairing ? {
    ...pairing,
    profiles: Object.fromEntries(Object.entries(pairing.profiles ?? {}).map(([uid, profile]) => [uid, { ...profile, name: firstName(profile.name) || 'Friend' }])),
  } : null
  const me = user && displayPairing?.profiles?.[user.uid] ? displayPairing.profiles[user.uid] : null
  const partnerUid = user && pairing ? (pairing.members ?? []).find((m) => m !== user.uid) ?? null : null
  const partner = partnerUid ? displayPairing?.profiles?.[partnerUid] ?? null : null
  const inviteUrl = pairingId ? (() => { const url = new URL(location.origin + location.pathname); url.searchParams.set('invite', pairingId); return url.toString() })() : null
  const joiningInvite = !!inviteId && inviteId !== pairingId && (!pairingId || isWaitingPairing(pairing))
  const dismissInvite = () => {
    const url = new URL(location.href)
    url.searchParams.delete('invite')
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    setInviteId(null)
  }

  // The whole press changes ink when you change edition.
  useEffect(() => {
    document.documentElement.dataset.edition = me?.edition ?? 'graphite'
  }, [me?.edition])

  const value: Session = {
    user, pairing: displayPairing, me, partnerUid, partner, pairingId, inviteUrl, joiningInvite,
    invitation, invitationUnavailable,
    dismissInvite,
    loading: !authReady || (!!user && (!identityReady || (!!pairingId && !pairingReady) || (joiningInvite && !invitationReady))),
    signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email, password) },
    register: async (email, password) => { await createUserWithEmailAndPassword(auth, email, password) },
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    signOut: async () => { await disablePush(); await fbSignOut(auth) },
    claimSlot: async (name, edition) => {
      if (!user) return
      const profile = { name: firstName(name) || 'Friend', edition, joinedAt: Date.now() }
      if (inviteId && inviteId !== pairingId) {
        const joinedPairingId = await joinPairing(user, inviteId, name, edition)
        setPairingReady(false); setPairingId(joinedPairingId)
        dismissInvite()
        return
      }
      if (pairingId) {
        await updateDoc(doc(db, 'pairings', pairingId), { [`profiles.${user.uid}`]: profile })
        return
      }
      const id = crypto.randomUUID(), batch = writeBatch(db)
      batch.set(doc(db, 'pairings', id), {
        members: [user.uid],
        profiles: { [user.uid]: profile },
        createdBy: user.uid,
        status: 'waiting',
        createdAt: serverTimestamp(),
      })
      batch.set(doc(db, 'users', user.uid), { pairingId: id })
      await batch.commit()
      setPairingReady(false); setPairingId(id)
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession outside SessionProvider')
  return ctx
}

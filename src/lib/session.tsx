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
import { doc, getDoc, onSnapshot, runTransaction, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db, PAIRING_ID } from './firebase'

export type Edition = 'rose' | 'graphite'

export type Profile = { name: string; edition: Edition; joinedAt?: unknown }

export type Pairing = {
  members: string[]
  profiles: Record<string, Profile>
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
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  claimSlot: (name: string, edition: Edition) => Promise<void>
}

const Ctx = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [identityReady, setIdentityReady] = useState(false)
  const [pairingReady, setPairingReady] = useState(false)
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const inviteId = new URLSearchParams(location.search).get('invite')?.match(/^[\w-]{20,80}$/)?.[0] ?? null

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u); setAuthReady(true); setIdentityReady(!u)
    if (!u) { setPairingId(null); setPairing(null); setPairingReady(true) }
  }), [])

  useEffect(() => {
    if (!user) return
    let active = true
    setIdentityReady(false)
    ;(async () => {
      const identity = await getDoc(doc(db, 'users', user.uid))
      let id = identity.exists() ? String(identity.data().pairingId ?? '') : ''
      if (!id && PAIRING_ID) {
        try {
          const legacy = await getDoc(doc(db, 'pairings', PAIRING_ID))
          if (legacy.exists() && (legacy.data().members ?? []).includes(user.uid)) {
            id = PAIRING_ID
            await setDoc(doc(db, 'users', user.uid), { pairingId: id }, { merge: true })
          }
        } catch { /* A new user does not have access to the legacy pairing. */ }
      }
      if (active) { setPairingReady(!id); setPairingId(id || null); setIdentityReady(true) }
    })().catch(() => { if (active) setIdentityReady(true) })
    return () => { active = false }
  }, [user?.uid])

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

  const me = user && pairing?.profiles?.[user.uid] ? pairing.profiles[user.uid] : null
  const partnerUid = user && pairing ? (pairing.members ?? []).find((m) => m !== user.uid) ?? null : null
  const partner = partnerUid ? pairing?.profiles?.[partnerUid] ?? null : null
  const inviteUrl = pairingId ? (() => { const url = new URL(location.origin + location.pathname); url.searchParams.set('invite', pairingId); return url.toString() })() : null

  // The whole press changes ink when you change edition.
  useEffect(() => {
    document.documentElement.dataset.edition = me?.edition ?? 'graphite'
  }, [me?.edition])

  const value: Session = {
    user, pairing, me, partnerUid, partner, pairingId, inviteUrl, joiningInvite: !!inviteId && !pairingId, loading: !authReady || (!!user && (!identityReady || (!!pairingId && !pairingReady))),
    signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email, password) },
    register: async (email, password) => { await createUserWithEmailAndPassword(auth, email, password) },
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    signOut: async () => { await fbSignOut(auth) },
    claimSlot: async (name, edition) => {
      if (!user) return
      const profile = { name, edition, joinedAt: Date.now() }
      if (pairingId) {
        await updateDoc(doc(db, 'pairings', pairingId), { [`profiles.${user.uid}`]: profile })
        return
      }
      if (inviteId) {
        await runTransaction(db, async transaction => {
          const ref = doc(db, 'pairings', inviteId), snap = await transaction.get(ref)
          if (!snap.exists()) throw new Error('invite-not-found')
          const members = (snap.data().members ?? []) as string[]
          if (!members.includes(user.uid) && members.length >= 2) throw new Error('invite-full')
          transaction.update(ref, { members: Array.from(new Set([...members, user.uid])), [`profiles.${user.uid}`]: profile })
          transaction.set(doc(db, 'users', user.uid), { pairingId: inviteId })
        })
        setPairingReady(false); setPairingId(inviteId)
        history.replaceState({}, '', location.pathname)
        return
      }
      const id = crypto.randomUUID(), batch = writeBatch(db)
      batch.set(doc(db, 'pairings', id), { members: [user.uid], profiles: { [user.uid]: profile }, createdAt: serverTimestamp() })
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

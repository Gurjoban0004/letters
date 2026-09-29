export type PairingRecord = {
  members?: unknown
  status?: unknown
}

export type JoinPlan = {
  members: string[]
  cancelCurrent: boolean
  alreadyJoined: boolean
}

export class JoinFailure extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

function membersOf(pairing: PairingRecord | null) {
  return Array.isArray(pairing?.members)
    ? pairing.members.filter((member): member is string => typeof member === 'string')
    : []
}

function waiting(pairing: PairingRecord | null) {
  const members = membersOf(pairing)
  return !!pairing && members.length === 1 && pairing.status !== 'active' && pairing.status !== 'cancelled'
}

export function planJoin({
  uid,
  inviteId,
  currentPairingId,
  target,
  current,
}: {
  uid: string
  inviteId: string
  currentPairingId: string
  target: PairingRecord | null
  current: PairingRecord | null
}): JoinPlan {
  if (!target) throw new JoinFailure('invite-not-found', 404)
  const targetMembers = membersOf(target)
  if (currentPairingId === inviteId && targetMembers.includes(uid) && targetMembers.length === 2 && target.status === 'active') {
    return { members: targetMembers, cancelCurrent: false, alreadyJoined: true }
  }
  if (targetMembers.includes(uid)) throw new JoinFailure('invite-is-yours', 400)
  if (!waiting(target)) {
    throw new JoinFailure(targetMembers.length >= 2 || target.status === 'active' ? 'invite-full' : 'invite-not-found', targetMembers.length >= 2 || target.status === 'active' ? 409 : 404)
  }

  let cancelCurrent = false
  if (currentPairingId && currentPairingId !== inviteId && current) {
    const currentMembers = membersOf(current)
    if (currentMembers.length >= 2 || current.status === 'active') {
      throw new JoinFailure('invite-already-paired', 409)
    }
    if (current.status !== 'cancelled') {
      if (!waiting(current) || !currentMembers.includes(uid)) throw new JoinFailure('current-pairing-invalid', 409)
      cancelCurrent = true
    }
  }

  return { members: [...targetMembers, uid], cancelCurrent, alreadyJoined: false }
}

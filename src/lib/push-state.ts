export type PushStatus =
  | 'ready'
  | 'needs-permission'
  | 'blocked'
  | 'needs-install'
  | 'misconfigured'
  | 'unsupported'

export function resolvePushStatus(input: {
  configured: boolean
  supported: boolean
  ios: boolean
  installed: boolean
  permission: NotificationPermission
  token: string | null
  owner: string | null
  uid?: string
}): PushStatus {
  if (!input.configured) return 'misconfigured'
  if (!input.supported) return input.ios && !input.installed ? 'needs-install' : 'unsupported'
  if (input.ios && !input.installed) return 'needs-install'
  if (input.permission === 'denied') return 'blocked'
  if (input.permission !== 'granted') return 'needs-permission'
  return input.token && (!input.uid || input.owner === input.uid) ? 'ready' : 'needs-permission'
}

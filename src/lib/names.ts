/** Keep personal names warm, compact, and consistent across narrow iPhone UI. */
export function firstName(value: string | null | undefined, maxLength = 18) {
  const first = (value ?? '').trim().split(/\s+/u)[0] ?? ''
  if (!first) return ''
  return first.length > maxLength ? `${first.slice(0, Math.max(1, maxLength - 1))}…` : first
}

/** Push titles must start with the sender and stay within iOS's compact title line. */
export function letterPushTitle(value: string | null | undefined) {
  const sender = firstName(value, 7) || 'Someone'
  return `${sender} wrote to you`
}

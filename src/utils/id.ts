export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}_${time}_${random}`
}

export function generateSessionId(): string {
  return generateId("sess")
}

export function generateEventId(): string {
  return generateId("evt")
}

export function generateSnapshotId(): string {
  return generateId("snap")
}

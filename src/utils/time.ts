export function now(): number {
  return Date.now()
}

export function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export function formatDuration(startTime: number, endTime: number | null): string {
  const end = endTime ?? Date.now()
  const seconds = Math.max(0, Math.floor((end - startTime) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

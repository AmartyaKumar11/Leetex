export function now(): number {
  return Date.now()
}

export function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export function formatDuration(startTime: number, endTime: number | null): string {
  const end = endTime ?? Date.now()
  const seconds = Math.max(0, Math.floor((end - startTime) / 1000))
  return formatElapsedSeconds(seconds)
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}s`
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${remainingSeconds}s`
}

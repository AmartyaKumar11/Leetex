/**
 * Clamp confidence to [0, 1] and round to 2 decimal places.
 */
export function clampConfidence(value: number): number {
  const clamped = Math.min(1, Math.max(0, value))
  return Math.round(clamped * 100) / 100
}

/**
 * Higher confidence when value is further below threshold (for "below" rules).
 */
export function confidenceBelowThreshold(
  value: number,
  threshold: number,
  base = 0.75
): number {
  if (value >= threshold) {
    return 0
  }

  const ratio = 1 - value / threshold
  return clampConfidence(base + ratio * 0.2)
}

/**
 * Higher confidence when value is further above threshold (for "above" rules).
 */
export function confidenceAboveThreshold(
  value: number,
  threshold: number,
  base = 0.75
): number {
  if (value <= threshold) {
    return 0
  }

  const excess = Math.min(value / threshold - 1, 1)
  return clampConfidence(base + excess * 0.2)
}

/**
 * Boost confidence when multiple evidence lines support the signal.
 */
export function boostWithEvidence(base: number, evidenceCount: number): number {
  const boost = Math.min(0.1, (evidenceCount - 1) * 0.03)
  return clampConfidence(base + boost)
}

/**
 * Fixed high confidence when a clear pattern is detected.
 */
export function patternConfidence(strength: number): number {
  return clampConfidence(0.7 + strength * 0.25)
}

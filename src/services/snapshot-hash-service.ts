export class SnapshotHashService {
  async hashCode(code: string): Promise<string> {
    const normalized = code.replace(/\r\n/g, "\n").trim()
    const encoded = new TextEncoder().encode(normalized)
    const digest = await crypto.subtle.digest("SHA-256", encoded)
    return bufferToHex(digest)
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export const snapshotHashService = new SnapshotHashService()

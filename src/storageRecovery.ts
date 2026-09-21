const MAX_RECOVERY_BYTES = 1_500_000

export function preserveCorruptStorage(key: string, raw: string, reason: string): void {
  if (!raw) return
  const recoveryKey = `${key}:recovery:v1`
  try {
    if (localStorage.getItem(recoveryKey)) return
    localStorage.setItem(recoveryKey, JSON.stringify({
      schema: 'noortools.storage-recovery',
      version: 1,
      sourceKey: key,
      recoveredAt: new Date().toISOString(),
      reason,
      raw: raw.slice(0, MAX_RECOVERY_BYTES),
      truncated: raw.length > MAX_RECOVERY_BYTES,
    }))
  } catch {
    // Local storage may itself be unavailable or full; never make recovery failure fatal.
  }
}

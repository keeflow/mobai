export interface RecoveryCopy {
  path: string
  content: string
  savedAt: number
}

export function shouldOfferRecovery(recovery: RecoveryCopy, diskContent: string | null): boolean {
  if (diskContent === null) return true
  return normalize(diskContent) !== normalize(recovery.content)
}

function normalize(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`
}

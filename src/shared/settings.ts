export function sanitizeAssetDir(value: string): string | null {
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(trimmed)) return null
  return trimmed
}

export type ImagePlacement = 'copy' | 'move'

export function sanitizeImageMode(value: string | undefined): ImagePlacement {
  return value === 'move' ? 'move' : 'copy'
}

export type ExternalChange = 'unchanged' | 'updated' | 'conflict'

export function classifyExternalChange(knownMtime: number | null, diskMtime: number, dirty: boolean): ExternalChange {
  if (knownMtime === null) return 'unchanged'
  if (diskMtime <= knownMtime + 2) return 'unchanged'
  return dirty ? 'conflict' : 'updated'
}

export type EditorMeasure = 'narrow' | 'normal' | 'wide'
export type EditorFont = 'serif' | 'sans'

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.min(160, Math.max(80, Math.round(value)))
}

export function editorMeasure(value: string): EditorMeasure {
  if (value === 'narrow' || value === 'wide') return value
  return 'normal'
}

export function editorFont(value: string): EditorFont {
  return value === 'sans' ? 'sans' : 'serif'
}

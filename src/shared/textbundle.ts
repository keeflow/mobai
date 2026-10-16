export const TEXTBUNDLE_INFO = {
  version: 2,
  type: 'net.daringfireball.markdown',
  transient: false
}

export function markdownNameInBundle(names: string[]): 'text.md' | 'text.markdown' | null {
  if (names.includes('text.md')) return 'text.md'
  if (names.includes('text.markdown')) return 'text.markdown'
  return null
}

export function bundleDirectoryName(name: string): string {
  const trimmed = name.trim() || '未命名'
  return trimmed.toLowerCase().endsWith('.textbundle') ? trimmed : `${trimmed}.textbundle`
}

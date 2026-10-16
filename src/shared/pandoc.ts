export type PandocFormat = 'docx' | 'epub' | 'latex'

export const PANDOC_INSTALL_HINT =
  '没有找到 Pandoc。Word、EPUB 和 LaTeX 需要本机已安装的 Pandoc（https://pandoc.org/installing.html）。墨白不会自带 Pandoc。'

export function pandocExtension(format: PandocFormat): string {
  if (format === 'epub') return 'epub'
  if (format === 'latex') return 'tex'
  return 'docx'
}

export function pandocLabel(format: PandocFormat): string {
  if (format === 'epub') return 'EPUB'
  if (format === 'latex') return 'LaTeX'
  return 'Word'
}

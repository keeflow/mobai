import { describe, expect, it } from 'vitest'
import {
  collectDocumentFiles,
  collectDocumentFilesFromDataTransfer,
  fileExtension,
  isOpenableDocumentName
} from '../src/shared/documents'

describe('dropped documents', () => {
  it('recognizes markdown names and ignores other files', () => {
    expect(fileExtension('笔记.MD')).toBe('.md')
    expect(fileExtension('.gitignore')).toBe('')
    expect(isOpenableDocumentName('笔记.md')).toBe(true)
    expect(isOpenableDocumentName('notes.markdown')).toBe(true)
    expect(isOpenableDocumentName('draft.txt')).toBe(true)
    expect(isOpenableDocumentName('文章.textbundle')).toBe(true)
    expect(isOpenableDocumentName('photo.png')).toBe(false)
    expect(isOpenableDocumentName('folder')).toBe(false)
    const files = [
      { name: 'photo.png' } as File,
      { name: '笔记.md' } as File,
      { name: '其它.markdown' } as File
    ]
    expect(collectDocumentFiles(files).map((file) => file.name)).toEqual(['笔记.md', '其它.markdown'])
    expect(
      collectDocumentFilesFromDataTransfer({
        files: [] as unknown as FileList,
        items: [
          { kind: 'file', getAsFile: () => ({ name: 'a.md' }) as File },
          { kind: 'file', getAsFile: () => ({ name: 'b.png' }) as File },
          { kind: 'string', getAsFile: () => null }
        ],
        types: ['Files']
      } as unknown as DataTransfer).map((file) => file.name)
    ).toEqual(['a.md'])
  })
})
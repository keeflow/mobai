import { describe, expect, it } from 'vitest'
import {
  collectImageFiles,
  collectImageFilesFromDataTransfer,
  dataTransferHasImage,
  isImageFile,
  isImageFileName
} from '../src/shared/images'

describe('image helpers', () => {
  it('recognizes image files by mime or extension', () => {
    expect(isImageFile({ name: 'a.png', type: '' })).toBe(true)
    expect(isImageFile({ name: 'photo', type: 'image/jpeg' })).toBe(true)
    expect(isImageFile({ name: 'shot', type: 'image/jpg' })).toBe(true)
    expect(isImageFile({ name: 'notes.md', type: 'text/markdown' })).toBe(false)
    expect(isImageFileName('图.webp')).toBe(true)
    expect(collectImageFiles([{ name: 'a.gif', type: '' } as File, { name: 'b.txt', type: 'text/plain' } as File])).toHaveLength(1)
    expect(dataTransferHasImage({ files: [] as unknown as FileList, types: ['Files'] } as unknown as DataTransfer)).toBe(true)
    expect(
      collectImageFilesFromDataTransfer({
        files: [] as unknown as FileList,
        items: [],
        types: ['Files']
      } as unknown as DataTransfer)
    ).toEqual([])
  })
})

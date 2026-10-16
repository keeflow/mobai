import { describe, expect, it } from 'vitest'
import { ancestorFolderIds, branchIsEmpty, buildFileTree, type TreeFile } from '../src/renderer/src/fileTree'

const files: TreeFile[] = [
  { path: '/notes/readme.md', name: 'readme.md', relativePath: 'readme.md' },
  { path: '/notes/docs/b.md', name: 'b.md', relativePath: 'docs/b.md' },
  { path: '/notes/docs/a.md', name: 'a.md', relativePath: 'docs/a.md' },
  { path: '/notes/docs/sub/c.md', name: 'c.md', relativePath: 'docs/sub/c.md' }
]

describe('file tree', () => {
  it('groups files under their folders and sorts names', () => {
    const tree = buildFileTree(files)
    expect(tree.files.map((file) => file.name)).toEqual(['readme.md'])
    expect(tree.folders.map((folder) => folder.name)).toEqual(['docs'])
    expect(tree.folders[0]?.files.map((file) => file.name)).toEqual(['a.md', 'b.md'])
    expect(tree.folders[0]?.folders[0]?.name).toBe('sub')
    expect(tree.folders[0]?.folders[0]?.files[0]?.name).toBe('c.md')
  })

  it('keeps ancestor folders when a nested file matches', () => {
    const tree = buildFileTree(files, 'C.MD')
    expect(tree.files).toEqual([])
    expect(tree.folders[0]?.files).toEqual([])
    expect(tree.folders[0]?.folders[0]?.files.map((file) => file.name)).toEqual(['c.md'])
    expect(branchIsEmpty(buildFileTree(files, '没有'))).toBe(true)
  })

  it('lists ancestor folder ids from the root', () => {
    expect(ancestorFolderIds('docs/sub/c.md')).toEqual(['docs', 'docs/sub'])
    expect(ancestorFolderIds('readme.md')).toEqual([])
    expect(ancestorFolderIds('docs\\sub\\c.md')).toEqual(['docs', 'docs/sub'])
  })
})

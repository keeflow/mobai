export interface TreeFile {
  path: string
  name: string
  relativePath: string
}

export interface FileBranch {
  id: string
  name: string
  files: TreeFile[]
  folders: FileBranch[]
}

function pathParts(relativePath: string): string[] {
  return relativePath.split(/[/\\]/).filter(Boolean)
}

function byName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name, 'zh')
}

function sortBranch(branch: FileBranch): void {
  branch.folders.sort(byName)
  branch.files.sort(byName)
  for (const folder of branch.folders) sortBranch(folder)
}

export function buildFileTree(files: TreeFile[], query = ''): FileBranch {
  const needle = query.trim().toLocaleLowerCase()
  const root: FileBranch = { id: '', name: '', files: [], folders: [] }
  for (const file of files) {
    const haystack = `${file.relativePath}\n${file.name}`.toLocaleLowerCase()
    if (needle && !haystack.includes(needle)) continue
    const parts = pathParts(file.relativePath)
    const dirs = parts.slice(0, -1)
    let node = root
    let id = ''
    for (const dir of dirs) {
      id = id ? `${id}/${dir}` : dir
      let next = node.folders.find((item) => item.id === id)
      if (!next) {
        next = { id, name: dir, files: [], folders: [] }
        node.folders.push(next)
      }
      node = next
    }
    node.files.push(file)
  }
  sortBranch(root)
  return root
}

export function ancestorFolderIds(relativePath: string): string[] {
  const dirs = pathParts(relativePath).slice(0, -1)
  const ids: string[] = []
  let id = ''
  for (const dir of dirs) {
    id = id ? `${id}/${dir}` : dir
    ids.push(id)
  }
  return ids
}

export function branchIsEmpty(branch: FileBranch): boolean {
  return branch.files.length === 0 && branch.folders.length === 0
}

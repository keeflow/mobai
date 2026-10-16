const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp)$/i
const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp)$/i

export function isImageFileName(name: string): boolean {
  return IMAGE_EXTENSION.test(name.trim())
}

export function isImageMime(type: string): boolean {
  return IMAGE_MIME.test(type.trim())
}

export function isImageFile(file: { name: string; type: string }): boolean {
  return isImageMime(file.type) || isImageFileName(file.name)
}

export function collectImageFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return []
  return Array.from(list).filter((file) => isImageFile(file))
}

export function collectImageFilesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return []
  const fromFiles = collectImageFiles(data.files)
  if (fromFiles.length > 0) return fromFiles
  const fromItems: File[] = []
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file && isImageFile(file)) fromItems.push(file)
  }
  return fromItems
}

export function dataTransferHasFiles(data: DataTransfer | null | undefined): boolean {
  if (!data) return false
  if ((data.files?.length ?? 0) > 0) return true
  return Array.from(data.types).some((type) => type === 'Files' || type.startsWith('image/'))
}

export function dataTransferHasImage(data: DataTransfer | null | undefined): boolean {
  if (!data) return false
  if (collectImageFilesFromDataTransfer(data).length > 0) return true
  return Array.from(data.types).some((type) => type === 'Files' || type.startsWith('image/'))
}

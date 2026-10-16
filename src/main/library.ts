import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app } from 'electron'
import { rememberRecent, type RecentEntry } from '../shared/recent'
import { shouldOfferRecovery, type RecoveryCopy } from '../shared/recovery'
import { sanitizeAssetDir, sanitizeImageMode, type ImagePlacement } from '../shared/settings'
import { readUtf8File } from './files'

export interface AppSettings {
  assetDir: string
  imageMode: ImagePlacement
  userCssPath: string | null
}

const defaults: AppSettings = { assetDir: 'assets', imageMode: 'copy', userCssPath: null }

function userFile(name: string): string {
  return join(app.getPath('userData'), name)
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const parsed = JSON.parse(await readFile(userFile('settings.json'), 'utf8')) as Partial<AppSettings>
    return {
      assetDir: sanitizeAssetDir(String(parsed.assetDir ?? '')) ?? 'assets',
      imageMode: sanitizeImageMode(parsed.imageMode),
      userCssPath: typeof parsed.userCssPath === 'string' ? parsed.userCssPath : null
    }
  } catch {
    return { ...defaults }
  }
}

export async function writeSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await readSettings()
  const next: AppSettings = { ...current, ...patch }
  if (patch.assetDir !== undefined) {
    const assetDir = sanitizeAssetDir(patch.assetDir)
    if (!assetDir) throw new Error('图片目录名只能包含字母、数字、点、下划线和短横线。')
    next.assetDir = assetDir
  }
  if (patch.imageMode !== undefined) next.imageMode = sanitizeImageMode(patch.imageMode)
  await writeFile(userFile('settings.json'), JSON.stringify(next, null, 2))
  return next
}

export async function readUserCss(): Promise<{ path: string | null; css: string }> {
  const settings = await readSettings()
  if (!settings.userCssPath) return { path: null, css: '' }
  try {
    return { path: settings.userCssPath, css: await readFile(settings.userCssPath, 'utf8') }
  } catch {
    return { path: settings.userCssPath, css: '' }
  }
}

export async function listRecent(): Promise<RecentEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(userFile('recent.json'), 'utf8')) as RecentEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.path === 'string' && typeof item.name === 'string').slice(0, 20)
  } catch {
    return []
  }
}

export async function touchRecent(filePath: string): Promise<RecentEntry[]> {
  const next = rememberRecent(await listRecent(), {
    path: filePath,
    name: basename(filePath),
    openedAt: Date.now()
  })
  await writeFile(userFile('recent.json'), JSON.stringify(next, null, 2))
  return next
}

export async function listRecentFolders(): Promise<RecentEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(userFile('recent-folders.json'), 'utf8')) as RecentEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.path === 'string' && typeof item.name === 'string').slice(0, 20)
  } catch {
    return []
  }
}

export async function touchRecentFolder(folderPath: string): Promise<RecentEntry[]> {
  const next = rememberRecent(await listRecentFolders(), {
    path: folderPath,
    name: basename(folderPath),
    openedAt: Date.now()
  })
  await writeFile(userFile('recent-folders.json'), JSON.stringify(next, null, 2))
  return next
}

function recoveryFile(filePath: string): string {
  const id = createHash('sha1').update(filePath).digest('hex').slice(0, 16)
  return join(app.getPath('userData'), 'recovery', `${id}.json`)
}

export async function keepRecovery(filePath: string, content: string): Promise<void> {
  const target = recoveryFile(filePath)
  await mkdir(join(app.getPath('userData'), 'recovery'), { recursive: true })
  const copy: RecoveryCopy = { path: filePath, content, savedAt: Date.now() }
  await writeFile(target, JSON.stringify(copy))
}

export async function clearRecovery(filePath: string): Promise<void> {
  await rm(recoveryFile(filePath), { force: true })
}

export async function pendingRecoveries(): Promise<RecoveryCopy[]> {
  const directory = join(app.getPath('userData'), 'recovery')
  let names: string[] = []
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith('.json'))
  } catch {
    return []
  }
  const pending: RecoveryCopy[] = []
  for (const name of names) {
    const full = join(directory, name)
    try {
      const recovery = JSON.parse(await readFile(full, 'utf8')) as RecoveryCopy
      if (!recovery?.path || typeof recovery.content !== 'string') continue
      let diskContent: string | null = null
      try {
        diskContent = (await readUtf8File(recovery.path)).text
      } catch {
        diskContent = null
      }
      if (!shouldOfferRecovery(recovery, diskContent)) {
        await rm(full, { force: true })
        continue
      }
      pending.push(recovery)
    } catch {
      await rm(full, { force: true })
    }
  }
  return pending.sort((left, right) => right.savedAt - left.savedAt)
}

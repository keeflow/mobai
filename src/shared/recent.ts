export interface RecentEntry {
  path: string
  name: string
  openedAt: number
}

export function rememberRecent(entries: RecentEntry[], entry: RecentEntry, limit = 20): RecentEntry[] {
  return [entry, ...entries.filter((item) => item.path !== entry.path)].slice(0, limit)
}

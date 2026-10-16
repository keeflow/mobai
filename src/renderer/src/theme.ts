import { ref } from 'vue'

export type ThemeName = 'light' | 'dark'
export type ThemePreference = ThemeName | 'system'

const preference = ref<ThemePreference>(readPreference())
const theme = ref<ThemeName>(resolveTheme(preference.value))
let listening = false

function readPreference(): ThemePreference {
  const stored = localStorage.getItem('mobai-theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'light'
}

function systemTheme(): ThemeName {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(next: ThemePreference): ThemeName {
  return next === 'system' ? systemTheme() : next
}

function apply(next: ThemePreference): void {
  preference.value = next
  theme.value = resolveTheme(next)
  document.documentElement.dataset.theme = theme.value
  localStorage.setItem('mobai-theme', next)
}

export function installTheme(): void {
  theme.value = resolveTheme(preference.value)
  document.documentElement.dataset.theme = theme.value
  if (listening) return
  listening = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (preference.value !== 'system') return
    theme.value = systemTheme()
    document.documentElement.dataset.theme = theme.value
  })
}

export function useTheme(): {
  theme: typeof theme
  preference: typeof preference
  toggle: () => void
} {
  function toggle(): void {
    const order: ThemePreference[] = ['light', 'dark', 'system']
    const index = order.indexOf(preference.value)
    apply(order[(index + 1) % order.length] ?? 'light')
  }

  return { theme, preference, toggle }
}

export function applyUserCss(css: string): void {
  let style = document.getElementById('user-css')
  if (!style) {
    style = document.createElement('style')
    style.id = 'user-css'
    document.head.appendChild(style)
  }
  style.textContent = css
}

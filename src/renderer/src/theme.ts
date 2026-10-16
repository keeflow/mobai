import { ref } from 'vue'

export type ThemeName = 'light' | 'dark'

const theme = ref<ThemeName>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

export function useTheme(): {
  theme: typeof theme
  toggle: () => void
} {
  function apply(next: ThemeName): void {
    theme.value = next
    document.documentElement.dataset.theme = next
    localStorage.setItem('mobai-theme', next)
  }

  return {
    theme,
    toggle: () => apply(theme.value === 'dark' ? 'light' : 'dark')
  }
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

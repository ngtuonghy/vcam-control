import { ref, onMounted, onUnmounted } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const theme = ref<Theme>('dark')
  let systemMediaQuery: MediaQueryList | null = null

  if (typeof window !== 'undefined') {
    systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  }

  function applyTheme() {
    const isDark = theme.value === 'dark' || (theme.value === 'system' && systemMediaQuery?.matches)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark)
    }
  }

  function systemListener() {
    if (theme.value === 'system') applyTheme()
  }

  function cycleTheme() {
    const order: Theme[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme.value) + 1) % order.length]
    theme.value = next
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', next)
    }
    applyTheme()
  }

  onMounted(() => {
    if (typeof localStorage !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme
      theme.value = storedTheme || 'dark'
    }
    applyTheme()
    systemMediaQuery?.addEventListener('change', systemListener)
  })

  onUnmounted(() => {
    systemMediaQuery?.removeEventListener('change', systemListener)
  })

  return {
    theme,
    cycleTheme
  }
}

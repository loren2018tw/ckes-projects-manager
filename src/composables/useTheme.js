import { ref, watch } from 'vue'

const THEME_KEY = 'ckes-theme'

const themes = [
  { value: 'default', label: '預設主題' },
  { value: 'clay', label: 'Clay 主題' }
]

const currentTheme = ref(localStorage.getItem(THEME_KEY) || 'default')

function applyTheme(theme) {
  document.documentElement.classList.remove('theme-default', 'theme-clay')
  document.documentElement.classList.add(`theme-${theme}`)
  currentTheme.value = theme
  localStorage.setItem(THEME_KEY, theme)
}

export function useTheme() {
  function setTheme(theme) {
    applyTheme(theme)
  }

  applyTheme(currentTheme.value)

  return {
    themes,
    currentTheme,
    setTheme
  }
}

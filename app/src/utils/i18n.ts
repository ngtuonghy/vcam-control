import { createI18n } from 'vue-i18n'
import vi from '../locales/vi.json'
import en from '../locales/en.json'

const savedLanguage = localStorage.getItem('language') || 'en'

export const i18n = createI18n({
  locale: savedLanguage,
  fallbackLocale: 'en',
  messages: {
    vi,
    en
  },
  legacy: false
})

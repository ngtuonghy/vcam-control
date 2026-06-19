if (typeof window === 'undefined') {
  ;(globalThis as any).__VUE_PROD_DEVTOOLS__ = false
  ;(globalThis as any).__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false
}

import { ViteSSG } from 'vite-ssg/single-page'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

import en from './locales/en.json'
import vi from './locales/vi.json'

export const createApp = ViteSSG(
  App,
  ({ app }) => {
    const isClient = typeof window !== 'undefined'
    const defaultLocale = isClient 
      ? (localStorage.getItem('lang') || (navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en'))
      : 'en'
      
    const i18n = createI18n({
      legacy: false,
      locale: defaultLocale,
      fallbackLocale: 'en',
      messages: {
        en,
        vi
      }
    })
    
    app.use(i18n)
  }
)

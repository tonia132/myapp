// frontend/src/i18n.js
import { createI18n } from 'vue-i18n'
import zhTW from './locales/zh-TW'
import en from './locales/en'

const savedLocale = localStorage.getItem('locale') || 'zh-TW'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    'zh-TW': zhTW,
    en,
  },
})

export default i18n
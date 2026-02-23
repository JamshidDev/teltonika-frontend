import { createI18n } from 'vue-i18n'
import uz from './locales/uz.json'
import ru from './locales/ru.json'
import en from './locales/en.json'

// Type-safe message schema
type MessageSchema = typeof uz

// Get saved language or default to 'uz'
const savedLanguage = localStorage.getItem('language') || 'uz'

// Create i18n instance
const i18n = createI18n<[MessageSchema], 'uz' | 'ru' | 'en'>({
  legacy: false, // Use Composition API mode
  locale: savedLanguage,
  fallbackLocale: 'uz',
  messages: {
    uz,
    ru,
    en,
  },
})

export default i18n

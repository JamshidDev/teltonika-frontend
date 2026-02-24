import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone constant
const TIMEZONE = 'Asia/Tashkent'

// Format date to Asia/Tashkent timezone (DD.MM.YYYY format)
export function formatDate(dateString: string, _locale?: string): string {
  const date = new Date(dateString)

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return formatter.format(date)
}

// Format datetime to Asia/Tashkent timezone (DD.MM.YYYY HH:mm format)
export function formatDateTime(dateString: string, _locale?: string): string {
  const date = new Date(dateString)

  const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`
}

// Format time only to Asia/Tashkent timezone
export function formatTime(dateString: string, locale: string = 'uz'): string {
  const date = new Date(dateString)
  const localeCode = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US'

  return date.toLocaleTimeString(localeCode, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatRelativeTime(dateString: string, locale: string = 'uz'): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  const labels: Record<string, { sec: string; min: string; hour: string; day: string }> = {
    uz: { sec: 'soniya oldin', min: 'daqiqa oldin', hour: 'soat oldin', day: 'kun oldin' },
    ru: { sec: 'сек назад', min: 'мин назад', hour: 'ч назад', day: 'дн назад' },
    en: { sec: 'sec ago', min: 'min ago', hour: 'h ago', day: 'd ago' },
  }

  const l = labels[locale] ?? labels.uz

  if (diffSec < 60) return `${diffSec} ${l!.sec}`
  if (diffMin < 60) return `${diffMin} ${l!.min}`
  if (diffHour < 24) return `${diffHour} ${l!.hour}`
  if (diffDay < 7) return `${diffDay} ${l!.day}`

  return formatDate(dateString, locale)
}

export function formatSpeed(speed: number): string {
  return `${Math.round(speed)} km/h`
}

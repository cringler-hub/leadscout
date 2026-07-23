import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { de } from 'date-fns/locale'

export function formatDateTime(iso: string) {
  const date = new Date(iso)
  const time = format(date, 'HH:mm', { locale: de })
  if (isToday(date)) return `Heute, ${time} Uhr`
  if (isYesterday(date)) return `Gestern, ${time} Uhr`
  return `${format(date, 'dd.MM.yyyy', { locale: de })}, ${time} Uhr`
}

export function formatRelative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '–'
  return new Intl.NumberFormat('de-DE').format(value)
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '–'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

// Berechnet den nächsten Zeitpunkt, zu dem ein Lauf gemäß schedule_time (HH:mm:ss)
// ausgeführt werden würde – heute, falls die Uhrzeit noch bevorsteht, sonst morgen.
export function nextRunLabel(scheduleTime: string) {
  const [hours, minutes] = scheduleTime.split(':').map(Number)
  const next = new Date()
  next.setHours(hours, minutes, 0, 0)
  const isFuture = next.getTime() > Date.now()
  const time = format(next, 'HH:mm', { locale: de })
  return isFuture ? `Heute, ${time} Uhr` : `Morgen, ${time} Uhr`
}

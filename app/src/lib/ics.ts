import type { Plan } from '../data/types'
import { addDays, weekday } from './dates'

const esc = (t: string) => t.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n')

// Rappels sous forme de calendrier : un événement chaque semaine, les jours où une séance est prévue,
// avec une alarme à l'heure choisie. Le téléphone s'en charge, même quand l'app est fermée.
export function remindersIcs(plans: Plan[], time: string, today: string, appName = 'NextRep'): string {
  const [h, m] = time.split(':')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${appName}//Rappels//FR`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const p of [...plans].sort((a, b) => a.weekday - b.weekday)) {
    if (!p.items.length) continue
    const day = addDays(today, (p.weekday - weekday(today) + 7) % 7).replace(/-/g, '')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${appName.toLowerCase()}-jour-${p.weekday}@rappels`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${day}T${h}${m}00`,
      'DURATION:PT1H',
      'RRULE:FREQ=WEEKLY',
      `SUMMARY:${esc(p.title ? 'Séance : ' + p.title : 'Séance prévue')}`,
      `DESCRIPTION:${esc(`${p.items.length} exercice${p.items.length > 1 ? 's' : ''} prévu${p.items.length > 1 ? 's' : ''} dans ${appName}.`)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(p.title || 'Séance prévue')}`, 'TRIGGER:PT0S', 'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

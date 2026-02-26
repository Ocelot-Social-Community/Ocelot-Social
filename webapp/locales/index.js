import { enUS, de, nl, fr, es, it, pt, pl, ru, sq } from 'date-fns/locale'
import find from 'lodash/find'

const locales = [
  {
    name: 'English',
    code: 'en',
    iso: 'en-US',
    flag: '🇬🇧',
    enabled: true,
    dateFnsLocale: enUS,
  },
  {
    name: 'Deutsch',
    code: 'de',
    iso: 'de-DE',
    flag: '🇩🇪',
    enabled: true,
    dateFnsLocale: de,
  },
  {
    name: 'Nederlands',
    code: 'nl',
    iso: 'nl-NL',
    flag: '🇳🇱',
    enabled: true,
    dateFnsLocale: nl,
  },
  {
    name: 'Français',
    code: 'fr',
    iso: 'fr-FR',
    flag: '🇫🇷',
    enabled: true,
    dateFnsLocale: fr,
  },
  {
    name: 'Italiano',
    code: 'it',
    iso: 'it-IT',
    flag: '🇮🇹',
    enabled: true,
    dateFnsLocale: it,
  },
  {
    name: 'Español',
    code: 'es',
    iso: 'es-ES',
    flag: '🇪🇸',
    enabled: true,
    dateFnsLocale: es,
  },
  {
    name: 'Português',
    code: 'pt',
    iso: 'pt-PT',
    flag: '🇵🇹',
    enabled: true,
    dateFnsLocale: pt,
  },
  {
    name: 'Polski',
    code: 'pl',
    iso: 'pl-PL',
    flag: '🇵🇱',
    enabled: true,
    dateFnsLocale: pl,
  },
  {
    name: 'Русский',
    code: 'ru',
    iso: 'ru-RU',
    flag: '🇷🇺',
    enabled: true,
    dateFnsLocale: ru,
  },
  {
    name: 'Shqip',
    code: 'sq',
    iso: 'sq-AL',
    flag: '🇦🇱',
    enabled: true,
    dateFnsLocale: sq,
  },
]

export default locales
export function getDateFnsLocale({ $i18n }) {
  const { dateFnsLocale } = find(locales, { code: $i18n.locale() }) || {}
  return dateFnsLocale || enUS
}

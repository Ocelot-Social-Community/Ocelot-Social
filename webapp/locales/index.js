import find from 'lodash/find'

const locales = [
  {
    name: 'English',
    code: 'en',
    iso: 'en-US',
    flag: '🇬🇧',
    enabled: true,
  },
  {
    name: 'Deutsch',
    code: 'de',
    iso: 'de-DE',
    flag: '🇩🇪',
    enabled: true,
  },
  {
    name: 'Nederlands',
    code: 'nl',
    iso: 'nl-NL',
    flag: '🇳🇱',
    enabled: true,
  },
  {
    name: 'Français',
    code: 'fr',
    iso: 'fr-FR',
    flag: '🇫🇷',
    enabled: true,
  },
  {
    name: 'Italiano',
    code: 'it',
    iso: 'it-IT',
    flag: '🇮🇹',
    enabled: true,
  },
  {
    name: 'Español',
    code: 'es',
    iso: 'es-ES',
    flag: '🇪🇸',
    enabled: true,
  },
  {
    name: 'Português',
    code: 'pt',
    iso: 'pt-PT',
    flag: '🇵🇹',
    enabled: true,
  },
  {
    name: 'Polski',
    code: 'pl',
    iso: 'pl-PL',
    flag: '🇵🇱',
    enabled: true,
  },
  {
    name: 'Русский',
    code: 'ru',
    iso: 'ru-RU',
    flag: '🇷🇺',
    enabled: true,
  },
  {
    name: 'Shqip',
    code: 'sq',
    iso: 'sq-AL',
    flag: '🇦🇱',
    enabled: true,
  },
  {
    name: 'Українська',
    code: 'uk',
    iso: 'uk-UA',
    flag: '🇺🇦',
    enabled: true,
  },
]

export default locales
// The BCP 47 tag Intl formats dates with, for the current UI locale.
export function getLocaleIso({ $i18n }) {
  const { iso } = find(locales, { code: $i18n && $i18n.locale() }) || {}
  return iso || 'en-US'
}

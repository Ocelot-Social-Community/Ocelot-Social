// The UI / email languages this backend supports — the single source of truth for "a valid
// locale". It MUST stay in lockstep with the email template files in emails/locales (guarded
// by locales.spec.ts) and is reused as email-templates' `locales` list (sendEmail.ts), so the
// two can never drift.

export const SUPPORTED_LOCALES = [
  'en',
  'de',
  'nl',
  'fr',
  'it',
  'es',
  'pt',
  'pl',
  'ru',
  'sq',
  'uk',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// Whether a value is one of the supported locales (case-insensitive).
export function isSupportedLocale(value: string | undefined): boolean {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value.toLowerCase())
}

// Resolve a configured locale (e.g. LANGUAGE_DEFAULT) to a supported one, case-insensitively,
// returning the canonical lowercase form. An empty, missing, or unsupported value falls back
// to `fallback` — plain `?? default` lets '' or an invalid code (e.g. 'xx') through as the
// app-wide default locale, which then breaks email localisation (i18n defaultLocale) and the
// request context's languageDefault.
export function resolveLocale(value: string | undefined, fallback: string): string {
  return isSupportedLocale(value) ? (value as string).toLowerCase() : fallback
}

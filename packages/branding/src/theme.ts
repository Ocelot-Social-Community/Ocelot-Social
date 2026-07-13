// The overridable runtime THEME tokens (CSS custom properties applied on :root) and their framework
// default values. A brand overrides a subset via `theme.cssVars` (keyed WITHOUT the leading `--`);
// plugins/branding-head.js writes them onto :root, and both the webapp SCSS tokens and packages/ui
// read them (see the SCSS→CSS-custom-property theme layer). Vanilla's `theme.cssVars` is EMPTY (the
// compiled SCSS already carries these values), so the admin has no other place to learn the full
// overridable palette + defaults — hence this list.
//
// It MIRRORS the :root defaults in webapp/assets/_new/styles/ocelot-ui-variables.scss (+ tokens.scss
// shades). Display/contract only — not injected at runtime; keep it in sync with the SCSS if those
// defaults change. The runtime-derived `-active` shades (color-mix on the base var) are intentionally
// omitted: a brand rarely overrides them, they follow the base automatically.
export const THEME_DEFAULTS: Record<string, string> = {
  'color-primary': 'rgb(23, 181, 63)',
  'color-primary-hover': 'rgb(96, 214, 98)',
  'color-primary-active': 'rgb(25, 122, 49)',
  'color-primary-contrast': 'rgb(241, 253, 244)',
  'color-secondary': 'rgb(0, 142, 230)',
  'color-secondary-hover': 'rgb(10, 161, 255)',
  'color-secondary-contrast': 'rgb(240, 249, 255)',
  'color-success': 'rgb(23, 181, 63)',
  'color-success-hover': 'rgb(26, 203, 71)',
  'color-success-contrast': 'rgb(241, 253, 244)',
  'color-danger': 'rgb(219, 57, 36)',
  'color-danger-hover': 'rgb(242, 97, 65)',
  'color-danger-active': 'rgb(158, 43, 28)',
  'color-danger-contrast': 'rgb(253, 243, 242)',
  'color-warning': 'rgb(230, 121, 25)',
  'color-warning-hover': 'rgb(233, 137, 53)',
  'color-warning-contrast': 'rgb(241, 253, 244)',
  'color-secondary-active': 'color-mix(in srgb, var(--color-secondary), black 15%)',
  'font-family-heading': "'LatoWeb', sans-serif",
  'font-family-text': "'LatoWeb', sans-serif",
  // Semantic surface tokens (also var()-backed in tokens.scss). Defaults that follow another token
  // are given as that var(), so their swatch tracks it (browsers resolve var()/color-mix()).
  'color-header-background': 'rgb(255, 255, 255)',
  'color-donation-bar': 'var(--color-primary)',
  'color-toast-green': 'var(--color-success)',
  'color-ribbon-article': 'rgb(10, 161, 255)',
  // Chat colours (vue-advanced-chat), overridable via theme.cssVars — see tokens.scss chat section.
  'chat-message-bg-me': 'rgb(96, 214, 98)',
  'chat-sidemenu-background-active': 'rgb(96, 214, 98)',
  'chat-new-message-color': 'rgb(10, 161, 255)',
  'chat-message-checkmark': 'rgb(112, 103, 126)',
  'chat-message-checkmark-seen': 'var(--color-secondary)',
  'chat-room-color-counter-badge': 'rgb(250, 249, 250)',
  'chat-room-background-counter-badge': 'var(--color-danger)',
}

/**
 * The browser-chrome / PWA `theme_color` — the brand's primary colour. It is NOT a separate metadata
 * field (that used to be a special `metadata.themeColor` carved from identity into theme, which broke
 * for partial packages that provide identity but not theme). It is simply the `color-primary` theme
 * token, with the framework default as fallback. A concrete colour (the PWA manifest can't resolve
 * CSS vars), so brands set a literal `theme.cssVars['color-primary']`.
 */
export function resolveThemeColor(cssVars?: Record<string, string>): string {
  return (cssVars && cssVars['color-primary']) || THEME_DEFAULTS['color-primary']
}

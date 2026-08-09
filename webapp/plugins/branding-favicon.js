// The brand's favicon, on BOTH render paths — so the FIRST byte the browser receives already names the
// right icon and nothing has to be swapped afterwards.
//
// This one goes through vue-meta, unlike the brand's stylesheets in utils/brandingHead.js. That file's
// reason for avoiding vue-meta is purely about cascade POSITION (vue-meta's tags precede the app's CSS
// bundles, so `:root` vs `:root` loses on equal specificity). An icon link takes part in no cascade,
// so the objection does not apply — and vue-meta buys the one thing the string-append hook cannot:
// `hid` deduplication. The tag declared in nuxt.config is REWRITTEN rather than joined by a second
// one, which is exactly what previously forced the favicon to be a client-only retarget.
//
// Runs on both server and client (no `ssr: false`): the server renders the branded href, and the
// client resolves the identical value from window.__NUXT__.branding, so hydration matches. Must be
// registered AFTER plugins/branding.js — that is what sets the runtime accessor this reads.
import { branding } from '@ocelot-social/branding'

import { iconType } from '~/utils/iconType.js'

/**
 * Points the `hid`'d icon slot at `href`, rewriting the entry in place so vue-meta still renders
 * exactly one link for it. Appends only if the slot is missing entirely — two entries sharing a hid
 * would collapse to one anyway, but an absent one has to come from somewhere.
 */
export function setIcon(links, hid, href) {
  const type = iconType(href)
  const existing = links.find((link) => link && link.hid === hid)
  const target = existing || { hid, rel: hid }
  target.href = href
  // The type is REPLACED, not merged: nuxt.config's fallback says `image/x-icon` for the vanilla .ico,
  // and a brand shipping an .svg would otherwise be announced as an icon file it is not. An
  // unrecognised extension drops the attribute entirely and lets the browser sniff.
  if (type) target.type = type
  else delete target.type
  if (!existing) links.push(target)
}

export default ({ app }) => {
  const assets = (branding && branding.assets) || {}

  const links = app && app.head && app.head.link
  // `app.head` is built per request inside createApp() (see .nuxt/index.js), so mutating it here
  // brands THIS render only — it cannot leak into the next request the way a module-scope value would.
  if (!Array.isArray(links)) return

  // Each slot is independent: a brand supplying only one of the two keeps the vanilla fallback for the
  // other rather than losing it. Same reason nuxt.config declares both up front.
  if (assets.favicon) setIcon(links, 'icon', assets.favicon)
  // `assets.icon`, not the favicon: iOS ignores an .ico for the home screen, and .ico is what every
  // brand ships as its favicon. The two are separate slots in the schema for exactly this reason.
  if (assets.icon) setIcon(links, 'apple-touch-icon', assets.icon)
}

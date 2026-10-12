import metadata from '~/constants/metadata'

// The Open Graph spec asks for an absolute og:image URL. Discord resolves a relative one against the
// page, but a link preview cannot count on every crawler doing so — one that does not shows no image
// at all. The origin is the CONFIGURED one rather than the request's Host
// header: a client controls that header, and a cache in front of the webapp would replay the image URL
// it injected to everybody else. Without a configured origin the path stays as it is.
export const absoluteUrl = (path, origin) => {
  if (!path || !origin) return path
  try {
    return new URL(path, origin).href
  } catch {
    return path
  }
}

// Applied to the layouts, so it runs on every page (SSR + client). Besides the html lang / body
// class it emits the RUNTIME-branded document title + SEO / Open-Graph meta: these were baked at
// build time in nuxt.config.js (from constants/manifest.js + metadata); reading the metadata adapter
// here (a Proxy over the injected branding.metadata) makes them follow a live brand switch instead,
// while staying server-rendered so crawlers / link previews still see them. The `hid`s override the
// (now fallback) build-time tags from nuxt.config; a page's own head() title still merges on top.
export default {
  head() {
    const name = metadata.APPLICATION_NAME
    const description = metadata.APPLICATION_DESCRIPTION
    return {
      htmlAttrs: {
        lang: this.$i18n.locale(),
      },
      bodyAttrs: {
        class: `page-name-${this.$route.name}`,
      },
      title: name,
      titleTemplate: `%s - ${name}`,
      meta: [
        { hid: 'description', name: 'description', content: description },
        // Browser-chrome colour (also the PWA manifest theme_color) — runtime so it follows a switch.
        { hid: 'theme-color', name: 'theme-color', content: metadata.THEME_COLOR },
        { hid: 'og:title', property: 'og:title', content: name },
        { hid: 'og:description', property: 'og:description', content: description },
        { hid: 'og:site_name', property: 'og:site_name', content: name },
        {
          hid: 'og:image',
          property: 'og:image',
          content: absoluteUrl(metadata.OG_IMAGE, this.$env.CLIENT_URI),
        },
        { hid: 'og:image:alt', property: 'og:image:alt', content: metadata.OG_IMAGE_ALT },
        { hid: 'og:image:width', property: 'og:image:width', content: metadata.OG_IMAGE_WIDTH },
        { hid: 'og:image:height', property: 'og:image:height', content: metadata.OG_IMAGE_HEIGHT },
        { hid: 'og:image:type', property: 'og:image:type', content: metadata.OG_IMAGE_TYPE },
        // An empty value is SKIPPED, not filtered out: nuxt.config.js carries a build-time tag under the
        // same hid, holding the vanilla value — dropping ours would let that one through, and a brand
        // that clears a field (branding's resolveOgImage drops the vanilla image size) would announce
        // the vanilla one again. vue-meta merges by hid first, then renders no tag marked `skip`.
      ].map((tag) => (tag.content ? tag : { ...tag, skip: true })),
    }
  },
}

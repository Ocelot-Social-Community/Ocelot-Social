import metadata from '~/constants/metadata'

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
        { hid: 'og:image', property: 'og:image', content: metadata.OG_IMAGE },
        { hid: 'og:image:alt', property: 'og:image:alt', content: metadata.OG_IMAGE_ALT },
        { hid: 'og:image:width', property: 'og:image:width', content: metadata.OG_IMAGE_WIDTH },
        { hid: 'og:image:height', property: 'og:image:height', content: metadata.OG_IMAGE_HEIGHT },
        { hid: 'og:image:type', property: 'og:image:type', content: metadata.OG_IMAGE_TYPE },
      ].filter((tag) => tag.content),
    }
  },
}

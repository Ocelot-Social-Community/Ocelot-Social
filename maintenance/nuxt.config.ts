import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";

import { SUPPORT_EMAIL_PLACEHOLDER } from "./app/constants/emails";

// Branding is applied at BUILD time by build-maintenance-branding.ts (the page is static and is shown
// precisely when the backend is unreachable, so it cannot fetch anything at runtime). Everything the
// generator writes is a SEPARATE, git-ignored file that this config picks up only when present — no
// committed source is ever edited, and removing the files is a complete reset.
const file = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const has = (rel: string): boolean => existsSync(file(rel));

// The brand's own stylesheets (:root tokens + @font-face rules), LINKED rather than bundled: the
// generator unpacks them under public/brand/ and lists the URLs they are served from. A relative
// url() inside such a sheet then resolves against the sheet itself, and vite never has to resolve a
// publicDir path at build time (which it cannot — an `@import url("/brand/…")` from a bundled
// stylesheet fails with ENOENT). The tokens do not depend on the cascade — the archive raises the
// brand's `:root` to `:root:root`, so they outrank the vanilla ones in assets/css/branding.css
// whatever the order — but a brand's plain rules do, which is why the links go LAST (see tagPriority).
const BRAND_STYLESHEETS = "app/constants/stylesheets.brand.json";
const brandStylesheets: string[] = has(BRAND_STYLESHEETS)
  ? (JSON.parse(readFileSync(file(BRAND_STYLESHEETS), "utf8")) as string[])
  : [];

// The favicon is read HERE rather than declared via useHead in app.vue, because with `ssr: false`
// useHead contributes nothing to the prerendered index.html — the link would only appear once the
// bundle has run, and until then the browser issues its implicit /favicon.ico request and gets the
// vanilla icon. Emitting it from the config puts it in the built markup, where it belongs.
//
// The same overlay app/constants/metadata.ts reads, so there is one artifact and no second file to
// keep in step; the default below matches its own FAVICON default.
const BRAND_METADATA = "app/constants/metadata.brand.json";
const brandMetadata: Record<string, string> = has(BRAND_METADATA)
  ? (JSON.parse(readFileSync(file(BRAND_METADATA), "utf8")) as Record<string, string>)
  : {};
const favicon = brandMetadata.FAVICON ?? "/favicon.ico";

// A wrong type can make a browser discard the icon outright, so an extension we do not recognise is
// announced as nothing at all and left to sniffing.
const ICON_TYPES: Record<string, string> = {
  ico: "image/x-icon",
  png: "image/png",
  svg: "image/svg+xml",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const faviconType = ICON_TYPES[/\.([a-z0-9]+)(?:[?#]|$)/i.exec(favicon)?.[1]?.toLowerCase() ?? ""];

// Per-locale overlays holding just the namespaces this page renders. `files` is a merge list: the
// vanilla file first, the brand's on top, so an untranslated key keeps its default.
const localeFiles = (code: string): string[] =>
  has(`app/locales/${code}.json`) ? [`${code}.json`, `../app/locales/${code}.json`] : [`${code}.json`];

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  runtimeConfig: {
    public: {
      // Deployment config, not branding (see app/constants/emails.ts). $SUPPORT_EMAIL at build time
      // wins; otherwise the PLACEHOLDER goes into the payload for nginx/40-support-email.sh to
      // replace when the container starts — that is the production path, and it keeps the value in
      // the helm chart instead of a build arg in every brand repo's CI.
      supportEmail: process.env.SUPPORT_EMAIL || SUPPORT_EMAIL_PLACEHOLDER,
    },
  },
  devServer: { host: "0.0.0.0" },
  modules: ["@nuxt/eslint", "@nuxtjs/i18n"],
  css: ["~/assets/css/branding.css", "~/assets/css/main.css", "@ocelot-social/ui/style.css"],
  app: {
    head: {
      // `tagPriority: "low"` puts these AFTER the bundled css above — the position the brand sheet
      // held while it was the last entry in `css`. Without it unhead emits config head tags before
      // the build's own stylesheet links, and a brand rule would lose every tie on specificity.
      link: [
        { rel: "icon", href: favicon, ...(faviconType ? { type: faviconType } : {}) },
        ...brandStylesheets.map((href) => ({
          rel: "stylesheet",
          href,
          tagPriority: "low" as const,
        })),
      ],
    },
  },
  i18n: {
    locales: [
      { code: "en", name: "English", files: localeFiles("en") },
      { code: "de", name: "Deutsch", files: localeFiles("de") },
      { code: "es", name: "Español", files: localeFiles("es") },
      { code: "fr", name: "Français", files: localeFiles("fr") },
      { code: "it", name: "Italiano", files: localeFiles("it") },
      { code: "nl", name: "Nederlands", files: localeFiles("nl") },
      { code: "pl", name: "Polski", files: localeFiles("pl") },
      { code: "pt", name: "Português", files: localeFiles("pt") },
      { code: "ru", name: "Русский", files: localeFiles("ru") },
      { code: "sq", name: "Shqip", files: localeFiles("sq") },
      { code: "uk", name: "Українська", files: localeFiles("uk") },
    ],
    defaultLocale: "en",
    strategy: "no_prefix",
    langDir: "../locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "locale",
      fallbackLocale: "en",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Pre-bundle for dev server (avoids re-processing minified code)
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "@ocelot-social/ui",
        "@ocelot-social/ui/ocelot",
        "floating-vue",
      ],
    },
    server: {
      fs: {
        allow: ["/packages/ui"],
      },
    },
    build: {
      minify: 'esbuild',
    },
  },
  eslint: {
    config: {
      typescript: {
        strict: true,
      },
    },
  },
});

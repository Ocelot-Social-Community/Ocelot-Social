# Maintenance Page

Static maintenance page for [ocelot.social](https://ocelot.social) instances. Shown to users during planned downtime, returning HTTP 503 for all routes so search engines know the outage is temporary.

Built with **Nuxt 4** (static generation), **Tailwind CSS v4**, and the **@ocelot-social/ui** component library. Supports 11 languages via `@nuxtjs/i18n`.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Testing & Linting

```bash
npm test           # vitest
npm run lint       # eslint
```

## Production Build

The app is generated as a fully static site (`nuxt generate`) and served by nginx.

```bash
npm run generate   # outputs to .output/public/
npm run preview    # local preview of the static build
```

## Docker

Multi-stage Dockerfile:

| Stage         | Purpose                                            |
|---------------|----------------------------------------------------|
| `ui-library`  | Builds `@ocelot-social/ui` from `packages/ui/`    |
| `build`       | Installs deps, applies branding, runs `nuxt generate` |
| `development` | Hot-reload dev server (mount sources)              |
| `production`  | nginx alpine serving the static files              |

Build context must be the repo root so Docker can access `packages/ui/`:

```bash
docker build -f maintenance/Dockerfile --target production -t maintenance .
docker run -p 8080:8080 maintenance
```

## Branding

The Dockerfile uses `ONBUILD` instructions to overlay instance-specific branding:

- `branding/static/` — logo, favicon, and other public assets
- `branding/constants/metadata.js` — site name, description, etc.
- `branding/constants/emails.js` — contact email addresses
- `branding/locales/*.json` — translation overrides (merged via `tools/merge-locales.sh`)

## Nginx

The nginx config (`nginx/custom.conf`) returns **503** for all non-asset requests, serving `index.html` as the error page. This signals to search engines that the downtime is temporary.

## Project Structure

```text
maintenance/
├── app/              # Nuxt application source
│   ├── assets/css/   # Tailwind & branding CSS
│   ├── components/   # Vue components
│   ├── constants/    # Branding constants (metadata, emails)
│   └── plugins/      # Nuxt plugins
├── locales/          # i18n translation files (11 languages)
├── nginx/            # nginx config for production
├── public/           # Static assets (favicon, logo)
└── tools/            # Build helper scripts
```

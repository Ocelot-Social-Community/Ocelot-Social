# Branding- & Konfigurations-Architektur — Konzept

Stand: 2026-04-27
Status: Diskussionspapier / Architekturentwurf

Dieses Dokument skizziert eine zukünftige Branding- und Konfigurationsarchitektur für ocelot.social. Ziel ist es, die heutigen Schmerzpunkte (Branding-Forks, Build-Time-Konfiguration, fehlende API-Grenzen) zu beheben und gleichzeitig eine Grundlage für ein Plugin-Ökosystem und mögliche Monetarisierung zu schaffen.

---

## 1. Diagnose: Warum tut es heute weh?

Heute ist Branding **build-time-Material**: Variablen werden zur Buildzeit in die webapp eingebrannt, das Backend liest beim Start `branding/`-Dateien. Daraus folgen drei strukturelle Probleme:

- **Fork-Drift**: Jedes Netzwerk hat einen eigenen Branding-Fork — kein klarer Update-Pfad, weil "Branding" und "Code" derselbe Repo-Zustand sind.
- **Re-Deploy für Trivialitäten**: Logo tauschen = Container neu bauen.
- **Keine API-Grenze**: Branding ist überall verteilt — Templates, Middlewares, ENV, Assets — ohne klar definiertes Schema. Damit gibt es auch keine Typenhilfe.

Das eigentliche Problem ist also nicht "wir haben zu viele Knöpfe", sondern: **es gibt keine klare Schnittstelle zwischen Code und Branding**.

---

## 2. Architekturvorschlag: 3 Schichten für Branding

Branding wird strikt in drei Ebenen getrennt, die jede für sich versionierbar und austauschbar ist.

### Schicht A — Defaults (Code, Open Source)

Im Repo ein "vanilla"-Branding-Default. Damit läuft jede Instanz out of the box. Forks sind nicht mehr nötig.

### Schicht B — Branding-Paket (ZIP mit Manifest)

Ein Branding ist ein Paket mit klarer Struktur:

```
my-brand.ocelot-brand/
├── manifest.json        # typed: name, version, ocelotApiVersion, ...
├── theme/
│   ├── tokens.json      # Farben, Spacing, Radii als Design Tokens
│   └── overrides.css    # optional, freie Custom-CSS
├── assets/              # Logos, Favicon, OG-Images, Fonts
├── i18n/                # Override-Strings je Locale
├── emails/              # MJML/HBS-Templates, optional
└── plugins/             # optional: Code-Plugins (siehe §3)
```

Das Paket landet im Backend (Filesystem, S3, oder DB-Blob). Das Backend serviert daraus eine `GET /branding`-API mit JSON+Asset-URLs. Der Versionsstring im Manifest ist die Update-Lebensader: das Backend lehnt inkompatible Pakete ab oder migriert sie.

### Schicht C — Live-Overrides (DB)

Was der Admin im Web zur Laufzeit ändert (Primärfarbe, Welcome-Text, Logo), liegt als Patch in der DB **über** dem Paket. Reset = Patch löschen. Keine Datei-Schreibvorgänge im Container, keine Race-Conditions mit Deploys.

### Konsequenzen

- Das Frontend ist **konfigurations-agnostisch**: Beim Boot ein einziger Call `GET /branding` → CSS-Variablen werden ins `:root` geschrieben, Logos referenzieren `/branding/assets/...`.
- Kein Rebuild für irgendetwas, das nicht "Code" ist.
- **Wichtige Zusatzregel**: Farben werden als **CSS Custom Properties** ausgeliefert, nicht als Tailwind-Buildzeit-Theme. Tailwind referenziert nur `var(--os-color-primary)` etc. Damit ist Color-Change ein DOM-Update, kein Bundle-Update.

---

## 3. Plugin-/Modul-System

Das ist der Hebel für Monetarisierung — und er muss **scharf von Branding getrennt** sein, damit die Grenze zwischen Open Source und kommerziell sauber bleibt.

- **Plugin = signiertes ZIP** mit `plugin.json` (Name, Version, Lizenz-Slot, Permissions, Hook-Punkte) und einem JS/TS-Entrypoint.
- Backend exponiert ein **typisiertes Hook-API**: `onUserCreated`, `registerMailTemplate`, `registerGraphQLTypeExtension`, `registerMiddleware`, `registerAdminPanel`, …
- Jede Hook ist als TypeScript-Interface im Core definiert → Plugin-Autoren bekommen Typenhilfe via `@ocelot-social/plugin-sdk` (npm-Paket).
- **Sandbox-Modell**: Plugins laufen in-process (Performance), aber mit explizit deklarierten Permissions im Manifest. Spätere Eskalationsstufe: VM2/Worker-Threads, falls 3rd-Party-Plugins kommen.
- **Lizenzprüfung** als Standard-Hook: Plugin ruft beim Start `await ctx.license.verify()` mit Public-Key-Check gegen einen Lizenzschlüssel aus den Live-Overrides.

Die heutige `brandingMiddlewares.ts` ist quasi schon ein Vorbote — sie wäre der erste Konsument des Plugin-SDKs.

---

## 4. Admin-UI & Monetarisierung

Bewusste Trennung in **zwei UIs**:

- **In-Tree-Admin (OSS)** — minimal: Logo, Primär-/Sekundärfarbe, Welcome-Text, Lizenzschlüssel eintragen. Genug, damit ein Selfhoster nicht im Regen steht.
- **External-Admin (Closed Source, SaaS)** — vollwertiges Branding-Studio: Theme-Builder, A/B-Tests, mehrere Brands pro Tenant, Audit-Log, Plugin-Marketplace, Billing. Spricht **ausschließlich** mit der vorhandenen Backend-API — kein Sonderzugang.

Vorteil: Die OSS-Community verliert nichts (Selfhost geht voll), der kommerzielle Mehrwert ist klar abgrenzbar. Die SaaS-Admin ist später einfach ein weiterer Client an derselben API.

**Marketplace-Idee (mittelfristig):** Branding-Pakete und Plugins können verkauft werden → busFaktor() bekommt Provisionsanteil → wiederkehrende Einnahme jenseits von Crowdfunding.

---

## 5. Konfigurationsvariablen: Vier Buckets statt einem

Heutige ENV-Variablen wie `PUBLIC_REGISTRATION` sind kein Branding, sondern **Netzwerk-Policy**. Dass sie heute im selben Topf landen, ist symptomatisch. Trennung nach Lebenszyklus und Sichtbarkeit:

| Bucket | Beispiele | Wo? | Reload | Wer ändert? |
|---|---|---|---|---|
| **A. Infrastruktur** | `NEO4J_URI`, `JWT_SECRET`, `SMTP_HOST`, `S3_KEY` | ENV / Secrets | Restart | Ops |
| **B. Netzwerk-Policy** | `PUBLIC_REGISTRATION`, `INVITE_ONLY`, `MAX_UPLOAD_SIZE`, `DEFAULT_LANGUAGE`, `RATE_LIMITS` | DB (Live-Settings) | Hot | Admin (UI) |
| **C. Branding** | Farben, Logos, Copy, Emails | ZIP + DB-Override | Hot | Admin (UI) |
| **D. Feature-Toggles** | Chat aktiv? Karte? News? | Plugin-Manifeste | Plugin (de)aktivieren | Admin (UI) |

Bucket A bleibt ENV — alles, was Secrets enthält oder die Prozessgrenze betrifft. Bucket B ist der Hebel für Fälle wie `PUBLIC_REGISTRATION`: in dieselbe Live-Settings-Tabelle wie die Branding-Overrides, aber in einen eigenen Namespace (`policy.*`).

### Konkret für `PUBLIC_REGISTRATION`

Heute: ENV → Backend liest beim Start → Webapp bekommt's beim Build oder via separatem Endpoint.

Zukünftig:

1. **Schema im Code**: `policy.publicRegistration: boolean` mit JSON-Schema → daraus generierte TS-Typen für Backend **und** Webapp (z. B. via `json-schema-to-typescript`).
2. **Backend serviert** `GET /public-config` (eine erweiterte Form von `/branding`): liefert **Branding + öffentlich sichtbare Policy** zusammen. Login-Screen weiß sofort, ob der Registrierungs-Button auftaucht — kein Build nötig.
3. **Sichtbarkeitsfilter**: Backend filtert beim Rausgehen. Was öffentlich sein darf (`publicRegistration`) geht raus, was nicht (`rateLimits.*`) bleibt drin. Diese Sichtbarkeit ist Teil des Schemas (`"x-visibility": "public" | "admin"`).
4. **Hot-Reload**: Admin-UI ändert den Wert → Backend persistiert in DB → emittet Event auf Pub/Sub → alle Frontend-Tabs invalidieren ihren `/public-config`-Cache. Kein Restart, kein Rebuild.

### Migration ohne Big Bang

- **Boot-Time-Sync**: Beim Start prüft das Backend, ob der Wert in der DB steht. Wenn nein → ENV ist der Seed. Wenn ja → DB gewinnt.
- ENV bleibt also "initial defaults" und für CI/Testumgebungen praktisch. Sobald ein Admin den Wert per UI ändert, wird ENV irrelevant.
- Im UI als Hinweis sichtbar: *"Wert wurde zuletzt am X von Y geändert. Reset auf System-Default möglich."*

Damit gibt es **keinen Stichtag**, an dem alle Forks umstellen müssen.

### Was sollte _nicht_ in B wandern?

Faustregel: Wenn ein Wert die DB-Connection braucht, um gelesen zu werden, kann er nicht in der DB liegen. Bucket A bleibt für alles "vor der DB". Außerdem: alles, was Schema-Migrationen oder Bootstrapping beeinflusst (Locale-Liste der Migrationen, Admin-Seed-User), bleibt aus pragmatischen Gründen ebenfalls in ENV.

### Typenhilfe als Querschnitt

Das Schema ist die **eine Wahrheit** und erzeugt:

- Backend: TS-Typen + Runtime-Validation (Zod oder Ajv)
- Webapp: TS-Typen für `useConfig()`
- Admin-UI: Form-Generator (Schema → React/Vue-Form, evtl. via `@rjsf` oder eigener Renderer)
- Doku: aus dem Schema generiert (`"description"`-Felder)

Das löst zwei Probleme auf einmal: keine Drift zwischen Backend-/Webapp-Typen, und neue Settings tauchen automatisch im Admin auf, ohne dass UI-Code geschrieben werden muss.

---

## 6. Pragmatischer Migrationspfad

Keine Big-Bang-Umstellung. Reihenfolge mit jeweils sichtbarem Nutzen:

1. **`/branding`-API + CSS-Variablen** (kleinste Änderung, größter Effekt): Webapp liest Farben & Logo zur Laufzeit. Branding-Forks bleiben erstmal, aber der "Re-Deploy für Logo-Tausch" stirbt.
2. **Manifest + ZIP-Loader**: Backend kann ein `.ocelot-brand`-ZIP laden. Existierende Branding-Forks lassen sich automatisiert in dieses Format konvertieren (Migrationsskript).
3. **Live-Overrides in DB + minimaler Admin** (inkl. Policy-Settings, Bucket B): Selfhoster ist autonom.
4. **Plugin-SDK + Hook-API**: Branding-Middlewares werden zum ersten First-Class-Plugin.
5. **External-Admin / Marketplace**: erst wenn 1–4 stabil sind.

Schritte 1+2 sind Wochen, nicht Monate. Schritt 4 ist die echte Architekturarbeit.

---

## 7. Offene Fragen / Tradeoffs

- **Runtime-only vs. Build-Hybrid**: Wenn Performance/SSR ein Thema bleibt, ggf. einen leichten Build-Cache fürs Theme. Default sollte runtime sein.
- **Plugin-Sandbox-Tiefe**: Heute "trusted" (Selfhoster lädt selbst hoch), später "untrusted" für Marketplace. Das ändert den Sicherheits-Stack massiv — frühe Entscheidung sinnvoll.
- **Mehrbrand-Fähigkeit pro Instanz**: Ein Tenant = ein Brand, oder mehrere Brands über Hostnamen? Letzteres ist ein SaaS-Multiplier, aber ein Schema-Eingriff in fast allem.
- **Editorial-Inhalte (Imprint, FAQ, Datenschutz)**: gehören sie ins Branding-Paket, in eine CMS-Tabelle, oder Markdown-im-Admin? Drei verschiedene Welten, jede mit Konsequenzen für i18n.

---

## 8. Kernaussagen in einem Satz

- **Branding-Paket** = "Wie sieht's aus?"
- **Policy** = "Was darf man?"
- **Plugins** = "Was gibt's?"
- **ENV** = "Wo läuft's?"

Wenn diese vier Achsen sauber getrennt sind, lösen sich die meisten heutigen Schmerzen ohne Magie.

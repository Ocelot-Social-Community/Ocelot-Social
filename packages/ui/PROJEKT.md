# @ocelot-social/ui - Projektdokumentation

> Dieses Dokument dient als zentrale Planungs- und Statusübersicht für das UI-Library Subprojekt.
> Es ermöglicht das Pausieren und Wiederaufnehmen der Arbeit zu jedem Zeitpunkt.

---

## Inhaltsverzeichnis

### Schnellzugriff (Status)
| Abschnitt | Beschreibung |
|-----------|--------------|
| [Fortschritt](#fortschritt) | Visuelle Fortschrittsanzeige |
| [Aktueller Stand](#aktueller-stand) | Was zuletzt erledigt wurde |
| [Meilensteine](#meilensteine) | Phasen 0-5 mit Checklisten |

### Nach Thema

**[VISION](#vision)**
| # | Abschnitt |
|---|-----------|
| 1 | [Projektziel & Vision](#1-projektziel--vision) |

**[TECHNISCHE GRUNDLAGEN](#technische-grundlagen)**
| # | Abschnitt |
|---|-----------|
| 2 | [Tech-Stack](#2-tech-stack) |
| 3 | [Build & Distribution](#3-build--distribution) |
| 4 | [Icon-Architektur](#4-icon-architektur) |
| 5 | [Design-Token & Branding](#5-design-token--branding) |

**[PROZESSE & QUALITÄT](#prozesse--qualität)**
| # | Abschnitt |
|---|-----------|
| 6 | [CI/CD & Release](#6-cicd--release) |
| 7 | [Dokumentation & DX](#7-dokumentation--dx) |
| 8 | [Migrationsstrategie](#8-migrationsstrategie) |
| 9 | [Dokumentationsstrategie](#9-dokumentationsstrategie) |
| 10 | [Kompatibilitätstests](#10-kompatibilitätstests) |

**[REFERENZ & HISTORIE](#referenz--historie)**
| # | Abschnitt |
|---|-----------|
| 11 | [Entscheidungen](#11-entscheidungen) |
| 12 | [Arbeitsprotokoll](#12-arbeitsprotokoll) |
| 13 | [Komponenten-Katalog](#13-komponenten-katalog) |
| 14 | [Ressourcen & Links](#14-ressourcen--links) |
| 15 | [Dokumentationsstrategie (Details)](#15-dokumentationsstrategie-details) |

**[ABGRENZUNGEN](#abgrenzungen)**
| # | Abschnitt |
|---|-----------|
| 16 | [Library vs. Webapp](#16-library-vs-webapp) |
| 17 | [Externe Abhängigkeiten](#17-externe-abhängigkeiten) |
| 18 | [Kompatibilitätstests (Details)](#18-kompatibilitätstests-details) |
| 19 | [Komplexitätsanalyse](#19-komplexitätsanalyse) |

---

### Wie dieses Dokument verwendet wird

**Zum Fortsetzen der Arbeit:**
> "Lass uns am @ocelot-social/ui Projekt weiterarbeiten" (packages/ui)

**Nach jeder Session aktualisieren:**
- "Fortschritt" – Balkendiagramme aktualisieren
- "Aktueller Stand" – Zuletzt erledigte Aufgaben
- "Meilensteine" – Checklisten abhaken
- §12 "Arbeitsprotokoll" – Neue Einträge hinzufügen
- `KATALOG.md` – Komponenten-Status pflegen

---

## Fortschritt

### Gesamtprojekt
```
Phase 0: ██████████ 100% (6/6 Aufgaben) ✅
Phase 1: ██████████ 100% (6/6 Aufgaben) ✅
Phase 2: ██████████ 100% (26/26 Aufgaben) ✅
Phase 3: ░░░░░░░░░░   0% (0/7 Aufgaben)
Phase 4: █░░░░░░░░░   6% (1/17 Aufgaben) - OsButton ✅
Phase 5: ░░░░░░░░░░   0% (0/7 Aufgaben)
Webapp:  ░░░░░░░░░░   0% (0/1 Aufgaben)
───────────────────────────────────────
Gesamt:  █████░░░░░  56% (39/70 Aufgaben)
```

### Katalogisierung (Details in KATALOG.md)
```
Webapp:     ██████████ 100% (139 Komponenten erfasst)
Styleguide: ██████████ 100% (38 Komponenten erfasst)
Analyse:    ██████████ 100% (Button, Modal, Menu detailiert)
```

### Komponenten-Migration (Priorisiert: 15)
```
Analysiert:   3 Familien (Button, Modal, Menu)
Spezifiziert: 1 (OsButton)
Entwickelt:   1 (OsButton mit CVA)
QA bestanden: 1 (OsButton: 100% Coverage, Visual, A11y, Keyboard)
Integriert:   0
```

---

## Aktueller Stand

**Letzte Aktualisierung:** 2026-02-08

**Aktuelle Phase:** Phase 3 (Webapp-Integration) - In Arbeit

**Zuletzt abgeschlossen:**
- [x] Projektordner erstellt
- [x] Planungsdokument erstellt
- [x] Tech-Stack entschieden
- [x] Branding-Architektur definiert
- [x] Migrationsstrategie definiert
- [x] **Phase 0: Komponenten-Analyse** (177 Komponenten katalogisiert)
- [x] Button-Familie detailiert analysiert (Props, Styles, Konsolidierung)
- [x] Modal-Familie detailiert analysiert (Architektur erkannt)
- [x] Menu-Familie detailiert analysiert (3 Patterns identifiziert)
- [x] Priorisierung erstellt (15 Komponenten in 4 Tiers)
- [x] Konsolidierungsplan finalisiert
- [x] **Phase 1: Vue 2.7 Upgrade** ✅
  - Vue 2.6.14 → 2.7.16
  - vue-template-compiler entfernt
  - @vue/composition-api entfernt
  - @nuxtjs/composition-api entfernt
  - Webpack-Alias für @vue/composition-api → vue
  - Webpack-Regel für ESM .mjs Module
  - **Unit-Tests: 157 Suites, 979 passed, 87 Snapshots** ✅
  - **Integrationstests: bestanden** ✅
- [x] **Phase 2: Projekt-Setup** ✅
  - Vite + Vue 3 Projekt initialisiert
  - vue-demi für Vue 2/3 Kompatibilität
  - Vitest konfiguriert (integriert in vite.config.ts)
  - npm Package-Struktur mit korrekten exports
  - README.md Grundgerüst
  - LICENSE (Apache 2.0)
  - Plugin-Tests geschrieben
  - Tailwind CSS v4 mit @tailwindcss/vite
  - Dual-Build (style.css + tailwind.preset)
  - Dark Mode Grundstruktur (via Tailwind dark: Prefix)
  - Prop-Types definiert (Size, Rounded, Shadow, Variant)
  - Branding-Architektur (keine Defaults, validateCssVariables)
  - eslint-config-it4c eingerichtet (v0.8.0)
  - ESLint Flat Config mit Vue 3 + Vitest Modulen
  - Prettier-Integration via eslint-plugin-prettier
  - GitHub Workflows (ui-lint.yml, ui-test.yml, ui-build.yml)
  - 100% Test-Coverage Requirement
  - .tool-versions (Node 25.5.0, konsistent mit Dockerfiles)
  - Example Apps für Kompatibilitätstests (4er-Matrix)
  - GitHub Workflow ui-compatibility.yml für Vue 2/3 Tests (inkl. Lint)
  - Eigene ESLint + Prettier Configs für Example Apps
  - Type Assertions für CI-Kompatibilität (`as unknown as Plugin`)
  - Bundle Size Check (size-limit) mit ui-size.yml Workflow
  - Package-Validierung (publint, arethetypeswrong) mit CJS/ESM Types
  - Kompatibilitätstest-Workflow mit 4 Example Apps (Vue 2/3 × Tailwind/CSS)
  - release-please Manifest-Konfiguration (Monorepo-Setup)
  - npm Publish Workflow (ui-release.yml)
  - CONTRIBUTING.md (Entwickler-Leitfaden)
  - Dependabot für UI-Package und Example Apps konfiguriert
  - CSS-Build separat via Tailwind CLI (closeBundle Hook)
  - CVA (class-variance-authority) für typsichere Varianten
  - cn() Utility für Tailwind-Klassen-Merge (clsx + tailwind-merge)
  - OsButton Komponente mit CVA-Varianten implementiert
  - ESLint-Konfiguration angepasst (vue/max-attributes-per-line, import-x/no-relative-parent-imports)
  - Storybook 10 für Dokumentation eingerichtet (Greyscale-Theme)
  - OsButton.stories.ts mit allen Varianten
  - Storybook Build-Konfiguration (viteFinal entfernt Library-Plugins)
  - Docker Setup (Dockerfile, docker-compose, ui-docker.yml)
  - Visual Regression Tests (Playwright, colocated) mit integriertem A11y-Check
  - Completeness Check (verify Script prüft Story, Visual, checkA11y, Keyboard, Varianten)
  - ESLint Plugins: vuejs-accessibility, playwright, storybook, jsdoc

**Aktuell in Arbeit:**
- Phase 3, Milestone 1: Library-Einbindung in Webapp
- Einsatzstellen analysiert: 6 gefunden (2 minimal, 4 mit zusätzlichem Aufwand)

**Nächste Schritte:**
1. ~~Phase 0: Komponenten-Analyse~~ ✅
2. ~~Phase 1: Vue 2.7 Upgrade~~ ✅
3. ~~**Phase 2: Projekt-Setup**~~ ✅ ABGESCHLOSSEN
4. **Phase 3: Webapp-Integration** - In Arbeit
   - [ ] npm link in Webapp
   - [ ] CSS-Variablen definieren
   - [ ] UserTeaserPopover.vue migrieren (einfachste Stelle)

**Manuelle Setup-Aufgaben (außerhalb Code):**
- [ ] `NPM_TOKEN` als GitHub Secret einrichten (für npm publish in ui-release.yml)
  - npm Token erstellen: https://www.npmjs.com/settings/ocelot-social/tokens
  - GitHub Secret: Repository → Settings → Secrets → Actions → New secret
- [ ] Storybook auf externem Host deployen (via Webhook)
  - Server einrichten für Storybook-Hosting
  - Webhook-Endpoint erstellen (zieht + baut bei Release)
  - GitHub Webhook konfigurieren (trigger bei Release)

---

## Meilensteine

### Phase 0: Analyse & Katalogisierung ✅
- [x] Vollständige Katalogisierung Webapp-Komponenten (139 Komponenten)
- [x] Vollständige Katalogisierung Styleguide-Komponenten (38 Komponenten)
- [x] Duplikate identifizieren und dokumentieren (5 direkte + 3 Familien)
- [x] Inkonsistenzen und Probleme erfassen (Button/Modal/Menu analysiert)
- [x] Konsolidierungsplan erstellen (Token-Liste)
- [x] Priorisierung der zu migrierenden Komponenten (15 Komponenten in 4 Tiers)

### Phase 1: Vue 2.7 Upgrade ✅
- [x] Vue 2.6 → Vue 2.7 Upgrade in Webapp (2.6.14 → 2.7.16)
- [x] Abhängigkeiten aktualisieren:
  - [x] vue-template-compiler entfernt (in Vue 2.7 eingebaut)
  - [x] @vue/composition-api entfernt (in Vue 2.7 eingebaut)
  - [x] @nuxtjs/composition-api entfernt (nicht mehr nötig)
  - [x] vue-server-renderer auf 2.7.16 aktualisiert
- [x] Tests durchführen: **157 Suites, 979 passed, 87 Snapshots** ✅
- [x] Regressionstests (`yarn dev` und manuelle Prüfung) ✅

### Phase 2: Projekt-Setup ✅
- [x] Vite + Vue 3 Projekt initialisieren
- [x] vue-demi einrichten für Vue 2 Kompatibilität
- [x] Tailwind CSS einrichten (v4 mit @tailwindcss/vite)
- [x] Dual-Build konfigurieren (Tailwind Preset + vorkompilierte CSS)
- [x] CSS Custom Properties Token-System aufsetzen (requiredCssVariables + validateCssVariables)
- [x] Dark Mode Grundstruktur (via Tailwind `dark:` Prefix, dokumentiert)
- [x] Storybook für Dokumentation einrichten
- [x] Vitest konfigurieren
- [x] eslint-config-it4c einrichten (v0.8.0: TypeScript, Vue 3, Vitest, Prettier)
- [x] npm Package-Struktur (@ocelot-social/ui) mit korrekten exports
- [x] Vue 2/3 Kompatibilitätstests (via Example Apps)
- [x] GitHub Workflows einrichten (ui-lint.yml, ui-test.yml, ui-build.yml, ui-compatibility.yml)
- [x] Docker Setup (Dockerfile, docker-compose, ui-docker.yml Workflow)
- [x] Visual Regression Tests einrichten (Playwright, colocated mit Komponenten)
- [x] Accessibility Tests in Visual Tests integriert (@axe-core/playwright)
- [x] Keyboard Accessibility Tests (describe('keyboard accessibility'))
- [x] ESLint Plugins: vuejs-accessibility, playwright, storybook, jsdoc
- [x] Bundle Size Check einrichten (size-limit, ui-size.yml)
- [x] Package-Validierung einrichten (publint, arethetypeswrong)
- [x] Example Apps erstellen (vue3-tailwind, vue3-css, vue2-tailwind, vue2-css)
- [x] Kompatibilitätstest-Workflow einrichten (4er-Matrix, siehe §18)
- [x] release-please Manifest-Konfiguration
- [x] npm Publish Workflow (ui-release.yml)
- [x] Storybook Build Workflow (ui-storybook.yml)
- [x] LICENSE Datei (Apache 2.0)
- [x] README.md Grundgerüst (Installation, Quick Start, Struktur)
- [x] CONTRIBUTING.md
- [x] Completeness Check Script (Story, Visual+checkA11y, Keyboard, Varianten)

### Phase 3: Webapp-Integration (Validierung)

**Ziel:** OsButton in der Webapp einbinden, ohne visuelle oder funktionale Änderungen.

**Ansatz:** Integration First - Library einbinden, dann schrittweise OsButton ersetzen, beginnend mit einfachsten Stellen.

**Milestone 1: Library-Einbindung**
- [ ] @ocelot-social/ui in Webapp installieren (npm link)
- [ ] CSS Custom Properties in Webapp definieren (--color-primary, etc.)
- [ ] Import-Pfade testen

**Milestone 2: Erste Integration (Minimaler Aufwand)**
- [ ] OsButton in UserTeaserPopover.vue einsetzen (nur `variant="primary"`)
- [ ] Manueller visueller Vergleich
- [ ] Webapp-Tests bestehen

**Milestone 3: Schrittweise Erweiterung**
- [ ] GroupForm.vue Cancel-Button migrieren
- [ ] Bei Bedarf: icon-Prop zu OsButton hinzufügen
- [ ] GroupForm.vue Submit-Button migrieren

**Milestone 4: Vollständige BaseButton-Migration**
- [ ] Bei Bedarf: circle-Variant hinzufügen
- [ ] Bei Bedarf: loading-Prop hinzufügen
- [ ] Invitation.vue migrieren
- [ ] data-download.vue migrieren

**Milestone 5: Validierung & Dokumentation**
- [ ] Keine visuellen Änderungen bestätigt
- [ ] Keine funktionalen Änderungen bestätigt
- [ ] Webapp-Tests bestehen weiterhin
- [ ] Erkenntnisse in KATALOG.md dokumentiert

**Einsatzstellen-Analyse:** (Details in KATALOG.md)
| Stelle | Aufwand | Status |
|--------|---------|--------|
| UserTeaserPopover.vue | Minimal | ⬜ Ausstehend |
| GroupForm.vue (Cancel) | Minimal | ⬜ Ausstehend |
| GroupForm.vue (Submit) | Mittel (icon) | ⬜ Ausstehend |
| Invitation.vue | Mittel (icon, circle) | ⬜ Ausstehend |
| data-download.vue | Hoch (icon, loading) | ⬜ Ausstehend |

**Erfolgskriterien:**
| Kriterium | Prüfung |
|-----------|---------|
| Visuell identisch | Manueller Screenshot-Vergleich |
| Funktional identisch | Click, Disabled funktionieren |
| Keine Regression | Webapp Unit-Tests bestehen |

### Phase 4: Komponenten-Migration (15 Komponenten + 2 Infrastruktur)

**Tier 1: Kern-Komponenten**
- [ ] OsIcon (vereint DsIcon + BaseIcon)
- [ ] OsSpinner (vereint DsSpinner + LoadingSpinner)
- [x] OsButton (vereint DsButton + BaseButton) ✅ Entwickelt in Phase 2
- [ ] OsCard (vereint DsCard + BaseCard)

**Tier 2: Layout & Feedback**
- [ ] OsModal (Basis: DsModal)
- [ ] OsDropdown (Basis: Webapp Dropdown)
- [ ] OsAvatar (vereint DsAvatar + ProfileAvatar)
- [ ] OsInput (Basis: DsInput)

**Tier 3: Navigation & Typography**
- [ ] OsMenu (Basis: DsMenu)
- [ ] OsMenuItem (Basis: DsMenuItem)
- [ ] OsHeading (Basis: DsHeading)
- [ ] OsText (Basis: DsText)

**Tier 4: Spezial-Komponenten**
- [ ] OsSelect
- [ ] OsTable
- [ ] OsTag

**Infrastruktur**
- [ ] System-Icons einrichten
- [ ] CI docs-check Workflow (JSDoc-Coverage, README-Aktualität)

### Phase 5: Finalisierung
- [ ] Alle Komponenten migriert und getestet
- [ ] Alte Komponenten aus Vue 2 Projekt entfernt
- [ ] Build als npm Library verifiziert
- [ ] README.md finalisieren (alle Sektionen vollständig)
- [ ] ARCHITECTURE.md erstellen (aus PROJEKT.md §2, §4, §5, §11, §15, §16)
- [ ] PROJEKT.md und KATALOG.md archivieren (docs/archive/)
- [ ] Dokumentation vollständig und CI-geprüft

---

---

# VISION

## 1. Projektziel & Vision

**Kurzbeschreibung:**
Neue Vue 3 Komponentenbibliothek aufbauen, die später die Vue 2 Komponenten in der Webapp ersetzen soll.

**Hintergrund:**
- Bestehendes Projekt nutzt Vue 2.7 mit Nuxt 2 (Upgrade von 2.6 → 2.7 in Phase 1 erledigt ✅)
- Existierender `styleguide` Ordner als Git-Submodul (Vue 2, Vue CLI 3)
- Design-Token-System mit Theo vorhanden
- Branding erfolgt über SCSS-Dateien mit Variablen-Overrides
- **Problem:** Viele doppelte Komponenten, inkonsistente Styles, nicht konsequent genutztes Design-System

**Vision:**
Ein stark definiertes und flexibles Design-System, das den Branding-Anforderungen von ocelot.social gerecht wird und eine saubere, schrittweise Migration von Vue 2 nach Vue 3 ermöglicht.

**Geplanter Ansatz:**
Migration vorbereiten - schrittweise neue Komponenten in Vue 3 entwickeln, die das bestehende Design-System respektieren und flexible Branding-Optionen bieten.

---

# TECHNISCHE GRUNDLAGEN

## 2. Tech-Stack

| Komponente | Entscheidung | Notizen |
|------------|--------------|---------|
| Framework | **Vue 3 + Vite** | Schnellstes Setup, modernes Tooling |
| Build-Tool | **Vite** | Schnelles HMR, einfache Konfiguration |
| Dokumentation | **Storybook 10** | Komponenten-Dokumentation mit Vue 3 + Vite |
| Styling | **Tailwind CSS** | Mit CSS Custom Properties für Branding |
| Testing | **Vitest** | Vite-nativ, Jest-kompatible API |
| Paket-Name | **@ocelot-social/ui** | Unter ocelot-social npm Org |
| Komponenten-Prefix | **Os** | OsButton, OsCard, etc. |
| Vue 2 Kompatibilität | **vue-demi** | Library funktioniert in Vue 2 und Vue 3 |
| Varianten-System | **CVA** | class-variance-authority für typsichere Prop-Varianten |
| Klassen-Merge | **cn()** | clsx + tailwind-merge für Klassen-Kombination |
| Linting | **eslint-config-it4c** | Enthält: TypeScript, Vue, Prettier, weitere Regeln |
| Release | **release-please** | Automatische Versionen und Changelogs |
| Icons | **Hybrid-Architektur** | System-Icons in Library, Feature-Icons in App (siehe §4) |
| Browser-Support | **Modern only** | Chrome, Firefox, Safari, Edge (letzte 2 Versionen) |
| SSR | **Ja** | Nuxt-kompatibel |
| Dark Mode | **Ja, von Anfang an** | Alle Komponenten mit Light/Dark Varianten |
| Lizenz | **Apache 2.0** | Permissiv mit Patent-Schutz |
| Repository | **Monorepo** | Ocelot-Social/packages/ui/ |

### Konventionen

| Aspekt | Entscheidung | Notizen |
|--------|--------------|---------|
| Vue API | **`<script setup>`** | Composition API mit script setup (erfordert Vue 2.7+) |
| Sprache | **Englisch** | Code, Comments, Dokumentation |
| Package Manager | **npm** | Bereits im Projekt verwendet |
| Test Coverage | **100%** | Vollständige Testabdeckung |
| Dateinamen | **PascalCase** | OsButton.vue, OsCard.vue |
| i18n | **Nur Props** | Keine Default-Texte in Komponenten |
| Breakpoints | **Tailwind Standard** | sm:640, md:768, lg:1024, xl:1280, 2xl:1536 |
| Size Props | **Tailwind-Skala (vollständig)** | xs, sm, md, lg, xl, 2xl |
| Rounded Props | **Tailwind-Skala (vollständig)** | none, sm, md, lg, xl, 2xl, 3xl, full |
| Shadow Props | **Tailwind-Skala (vollständig)** | none, sm, md, lg, xl, 2xl |
| Variant Props | **Semantisch (vollständig)** | primary, secondary, danger, warning, success, info |
| Dark Mode | **Tailwind CSS-Klassen** | Via `dark:` Prefix, kein "inverse" Prop |
| Prop-Vollständigkeit | **Alle oder keine** | Wenn Komponente einen Prop unterstützt, dann die gesamte Skala |
| CSS Variables | **Keine Defaults in Library** | Webapp definiert Default-Branding, spezialisierte Brandings überschreiben |
| TypeScript | **strict: true** | Strikte Typisierung |

---

## 3. Build & Distribution

### Dual-Build Strategie

Die Library bietet zwei Nutzungsmöglichkeiten:

```
@ocelot-social/ui
├── dist/
│   ├── index.js              # Vue Komponenten
│   ├── style.css             # Vorkompilierte Styles (für Nicht-Tailwind)
│   └── tailwind.preset.js    # Tailwind Preset (für Tailwind-Nutzer)
```

### Nutzung MIT Tailwind

```js
// tailwind.config.js
import ocelotPreset from '@ocelot-social/ui/tailwind.preset'
export default { presets: [ocelotPreset] }

// main.js
import { OsButton } from '@ocelot-social/ui'
```

### Nutzung OHNE Tailwind

```js
// main.js
import { OsButton } from '@ocelot-social/ui'
import '@ocelot-social/ui/style.css'
```

### Branding (funktioniert für beide)

```css
/* branding.css */
:root {
  --color-primary: rgb(110, 139, 135);
  --button-primary-bg: var(--color-secondary);
}
```

**Beide Varianten nutzen CSS Custom Properties** - Branding ist identisch.

### Webapp-Integration (Entwicklung)

**Lokale Entwicklung mit Nuxt Alias:**
```js
// webapp/nuxt.config.js
export default {
  alias: {
    '@ocelot-social/ui': process.env.LOCAL_UI
      ? path.resolve(__dirname, '../packages/ui/src')
      : '@ocelot-social/ui'
  }
}
```

**Entwickler startet mit:**
```bash
LOCAL_UI=true yarn dev
```

**Release-Check:**
Bei Ocelot-Release wird geprüft, ob `packages/ui` unreleased Änderungen hat:
```bash
# Commits seit letztem ui-Tag?
git log --oneline $(git describe --tags --match "ui-v*" --abbrev=0)..HEAD -- packages/ui/
```
→ Wenn Output vorhanden: UI muss zuerst released werden.

### Webapp-Aufgaben (TODO für Ocelot-Webapp)

Die folgenden Aufgaben müssen in der Webapp umgesetzt werden, nicht in der UI-Library:

| Aufgabe | Beschreibung | Status |
|---------|--------------|--------|
| **Branding-Validierung** | Test/Workflow der `validateCssVariables()` aufruft und sicherstellt, dass das Default-Branding alle von der Library geforderten CSS-Variablen definiert | ⏳ Offen |

**Beispiel-Implementierung (Webapp):**
```ts
// webapp/tests/branding.spec.ts
import { validateCssVariables, requiredCssVariables } from '@ocelot-social/ui/tailwind.preset'

describe('Default Branding', () => {
  it('defines all required CSS variables', () => {
    // Load default branding CSS
    // ...

    const styles = getComputedStyle(document.documentElement)
    const missing: string[] = []

    for (const variable of requiredCssVariables) {
      const value = styles.getPropertyValue(variable).trim()
      if (!value) {
        missing.push(variable)
      }
    }

    expect(missing).toEqual([])
  })
})
```

---

## 4. Icon-Architektur

### Entscheidung: Hybrid-Ansatz

Die Library verwendet eine **Hybrid-Architektur** für Icons:

```
┌─────────────────────────────────────────────────────────────┐
│  @ocelot-social/ui (Library)                                │
├─────────────────────────────────────────────────────────────┤
│  icons/system/           # ~10 System-Icons                 │
│  ├── close.svg           # Modal, Chip, Dialoge             │
│  ├── check.svg           # Modal confirm, Checkboxen        │
│  ├── chevron-down.svg    # Select, Dropdown                 │
│  ├── chevron-up.svg      # Select, Accordion                │
│  ├── spinner.svg         # Loading-States                   │
│  ├── bars.svg            # Hamburger-Menu                   │
│  ├── copy.svg            # CopyField                        │
│  ├── eye.svg             # Password-Toggle                  │
│  ├── eye-slash.svg       # Password-Toggle, Anonym          │
│  └── search.svg          # Search-Input                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Webapp / Konsumierendes Projekt                            │
├─────────────────────────────────────────────────────────────┤
│  assets/icons/           # Feature-Icons (beliebig viele)   │
│  ├── user.svg            │
│  ├── bell.svg            │
│  ├── heart.svg           │
│  ├── settings.svg        │
│  └── ...                 │
└─────────────────────────────────────────────────────────────┘
```

### Begründung

1. **Library muss standalone funktionieren** - Ein OsModal braucht einen Close-Button ohne zusätzliche Konfiguration
2. **616 Icons sind zu viel** - Der Styleguide hat 616 Icons, die meisten werden nie gebraucht
3. **Feature-Icons gehören zur App** - Icons wie `user`, `bell`, `heart` sind Business-Logik
4. **Branding-Flexibilität** - Verschiedene Ocelot-Instanzen können unterschiedliche Icon-Sets verwenden

### System-Icons (in Library enthalten)

| Icon | Verwendung in Komponenten |
|------|---------------------------|
| `close` | OsModal, OsChip, OsDialog, OsAlert |
| `check` | OsModal (confirm), OsCheckbox |
| `chevron-down` | OsSelect, OsDropdown, OsAccordion |
| `chevron-up` | OsSelect, OsAccordion |
| `spinner` | OsButton (loading), OsSpinner |
| `bars` | OsPage (mobile menu) |
| `copy` | OsCopyField |
| `eye` | OsInput (password toggle) |
| `eye-slash` | OsInput (password toggle), OsAvatar (anonym) |
| `search` | OsInput (search variant) |

### API-Design

```typescript
// OsIcon akzeptiert verschiedene Formate:

// 1. System-Icon (String) - aus Library
<OsIcon name="close" />

// 2. Vue-Komponente - für App-Icons
<OsIcon :icon="UserIcon" />

// 3. In Komponenten mit icon-Prop
<OsButton icon="close" />           // System-Icon
<OsButton :icon="CustomIcon" />     // Komponente
```

### Webapp-Integration

```typescript
// webapp/plugins/icons.ts
import { provideIcons } from '@ocelot-social/ui'
import * as appIcons from '~/assets/icons'

export default defineNuxtPlugin((nuxtApp) => {
  // App-Icons global registrieren
  provideIcons(appIcons)
})
```

```vue
<!-- Dann in der Webapp nutzbar -->
<OsButton :icon="icons.user" />
<OsIcon :icon="icons.bell" />
```

### Aktuelle Icon-Statistik

| Quelle | Anzahl | Status |
|--------|--------|--------|
| Styleguide (_all) | 616 | Nicht übernehmen (FontAwesome 4 komplett) |
| Webapp (svgs) | 238 | Feature-Icons, bleiben in Webapp |
| **Library (system)** | **~10** | Nur essenzielle System-Icons |

---

## 5. Design-Token & Branding

### 3-Stufen Token-System

```
┌─────────────────────────────────────────────────────────┐
│  1. BASE TOKENS (Rohwerte)                              │
│     --color-green: rgb(23, 181, 63);                    │
│     --color-teal: rgb(110, 139, 135);                   │
│     --space-small: 16px;                                │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. SEMANTIC TOKENS (Bedeutung)                         │
│     --color-primary: var(--color-green);                │
│     --color-secondary: var(--color-teal);               │
│     --text-color-base: var(--color-neutral-20);         │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. COMPONENT TOKENS (Komponenten-spezifisch)           │
│     --button-primary-bg: var(--color-primary);          │
│     --button-primary-text: var(--color-primary-inverse);│
│     --card-bg: var(--background-color-base);            │
└─────────────────────────────────────────────────────────┘
```

### Branding-Flexibilität

Jedes Branding kann auf jeder Ebene eingreifen:

```css
/* Standard */
:root {
  --button-primary-bg: var(--color-primary);
}

/* Yunite-Branding: Button nutzt Secondary statt Primary */
:root {
  --button-primary-bg: var(--color-secondary);
}
```

### Kompatibilität mit bestehendem System

- Bestehende SCSS-Variablen (`$color-primary`) → CSS Custom Properties (`--color-primary`)
- Theo bleibt als Token-Quelle, generiert zusätzlich CSS Variables
- Tailwind Theme nutzt CSS Variables: `bg-primary` → `var(--color-primary)`

### CVA + Tailwind + CSS-Variablen

**Wie CVA funktioniert:**

CVA (Class Variance Authority) mappt Props typsicher auf Tailwind-Klassen:

```typescript
// button.variants.ts
export const buttonVariants = cva(
  'inline-flex items-center font-medium',  // Basis-Klassen
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]',
        danger: 'bg-[var(--color-danger)] text-[var(--color-danger-contrast)]',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

// Aufruf:
buttonVariants({ variant: 'primary', size: 'sm' })
// → 'inline-flex items-center font-medium bg-[var(--color-primary)] ... h-8 px-3 text-sm'
```

**Was ist via Branding überschreibbar?**

| Ebene | Überschreibbar | Beispiel |
|-------|----------------|----------|
| **Farben** | ✅ Ja (CSS-Variablen) | `--color-primary`, `--color-danger` |
| **Hover-Farben** | ✅ Ja (CSS-Variablen) | `--color-primary-hover` |
| **Kontrast** | ✅ Ja (CSS-Variablen) | `--color-primary-contrast` |
| **Größen** | ❌ Nein (Tailwind-Skala) | `h-10`, `px-4`, `text-base` |
| **Abstände** | ❌ Nein (Tailwind-Skala) | `rounded-md`, `gap-2` |
| **Einzelne Instanz** | ✅ Ja (class-Prop) | `<OsButton class="h-12" />` |

**Branding-Beispiel:**

```css
/* branding/default.css */
:root {
  --color-primary: rgb(23, 181, 63);
  --color-primary-contrast: rgb(255, 255, 255);
  --color-primary-hover: rgb(18, 140, 49);
}

/* branding/yunite.css (überschreibt) */
:root {
  --color-primary: rgb(110, 139, 135);
  --color-primary-contrast: rgb(255, 255, 255);
  --color-primary-hover: rgb(90, 115, 112);
}
```

**Die Rolle von cn() (clsx + tailwind-merge):**

```typescript
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Beispiel: Custom class überschreibt CVA-Werte
cn('h-10 px-4', 'h-12 px-8')  // → 'h-12 px-8' (letzte gewinnt)
```

**Architektur-Übersicht:**

```
┌─────────────────────────────────────────────────────────────┐
│  CSS-Variablen (Branding-überschreibbar)                    │
│  --color-primary, --color-danger, --color-*-hover, etc.     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CVA-Varianten (nutzen CSS-Variablen)                       │
│  bg-[var(--color-primary)], text-[var(--color-contrast)]    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Tailwind-Klassen (feste Skala, konsistent)                 │
│  h-8, h-10, h-12, px-3, px-4, rounded-md, text-sm           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  cn() + class-Prop (Escape-Hatch für Einzelfälle)           │
│  <OsButton class="h-20 rounded-full" />                     │
└─────────────────────────────────────────────────────────────┘
```

**Designentscheidung:**
- Farben sind flexibel (Branding via CSS-Variablen)
- Größen sind konsistent (Tailwind-Skala, nicht überschreibbar)
- `class`-Prop erlaubt Ausnahmen für Einzelfälle

---

# PROZESSE & QUALITÄT

## 6. CI/CD & Release

### Release-Workflow (release-please)

**Manifest-Modus für Monorepo:**
- Nur Commits in `packages/ui/` werden betrachtet
- Eigene Versionierung unabhängig vom Hauptrepo
- Automatischer Changelog nur für dieses Paket

```
┌─────────────────────────────────────────────────────────────────┐
│                    RELEASE WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Commit mit Conventional Commits Format                      │
│  2. release-please erstellt Release-PR                          │
│  3. PR merge → Version bump + Changelog                         │
│  4. Automatisch: npm publish + Storybook deploy                  │
└─────────────────────────────────────────────────────────────────┘
```

**Konfigurationsdateien:**
- `.release-please-manifest.json` - Versionen
- `release-please-config.json` - Paket-Konfiguration

### GitHub Workflows

| Workflow | Trigger | Beschreibung |
|----------|---------|--------------|
| **Lint** | Push/PR | eslint-config-it4c (TypeScript + Vue + Prettier) |
| **Test** | Push/PR | Vitest Unit-Tests |
| **Build** | Push/PR | Vite Build verifizieren |
| **Release** | Push to main | release-please PR erstellen |
| **Publish** | Release created | npm publish + Storybook deploy |

### Qualitätssicherung bei PRs

```
PR erstellt
    ↓
┌─────────────┐
│   Lint      │──→ eslint-config-it4c (TS + Vue + Prettier)
├─────────────┤
│   Tests     │──→ Vitest
├─────────────┤
│   Build     │──→ Vite
└─────────────┘
    ↓
Alle grün → Merge erlaubt
```

### Automatische Deployments

| Event | Aktion |
|-------|--------|
| Release erstellt | npm publish |
| Release erstellt | Storybook build + deploy auf Server |

**Storybook Deploy (Webhook):**
1. GitHub sendet Webhook bei Release-Event
2. Server empfängt Webhook
3. Server führt `scripts/deploy-histoire.sh` aus (Teil des Repos)
4. Script: git pull → npm ci → histoire build → copy to webroot

### GitHub Workflows (vollständige Liste)

| Workflow | Trigger | Tool | Beschreibung |
|----------|---------|------|--------------|
| **lint** | Push/PR | eslint-config-it4c | Code-Stil prüfen |
| **typecheck** | Push/PR | TypeScript | Typ-Fehler finden |
| **test** | Push/PR | Vitest | Unit-Tests |
| **test-a11y** | Push/PR | axe-core | Accessibility-Tests |
| **test-visual** | Push/PR | Playwright | Visual Regression Screenshots |
| **build** | Push/PR | Vite | Build verifizieren |
| **build-histoire** | Push/PR | Storybook | Dokumentation bauen |
| **size-check** | Push/PR | size-limit | Bundle-Größe prüfen |
| **release** | Push main | release-please | Release-PR erstellen |
| **publish** | Release | npm | Auf npm veröffentlichen |
| **deploy-docs** | Release | Webhook | Storybook auf Server deployen |
| **check-ui-release** | Ocelot Release | Git | Prüft unreleased UI-Änderungen |

### Erweiterte Qualitätssicherung

| Maßnahme | Tool | Beschreibung |
|----------|------|--------------|
| **Visual Regression** | Playwright | Screenshot-Vergleiche bei Änderungen |
| **Accessibility** | @axe-core/playwright | A11y-Prüfung integriert in Visual Tests |
| **Bundle Size** | size-limit | Warnung wenn Library-Größe Schwellwert überschreitet |

### Migrations-Absicherung

**Feature Parity Checklist** (pro Komponente):
```
┌─────────────────────────────────────────────────────────┐
│  KOMPONENTE: [Name]                                     │
├─────────────────────────────────────────────────────────┤
│  [ ] Alle Props der alten Komponente übernommen         │
│  [ ] Alle Events identisch                              │
│  [ ] Alle Slots vorhanden                               │
│  [ ] Default-Werte identisch                            │
│  [ ] Visuell identisch (Screenshot-Vergleich)           │
│  [ ] A11y mindestens gleich gut                         │
│  [ ] Dokumentation vollständig                          │
└─────────────────────────────────────────────────────────┘
```

**Deprecation Warnings:**
Nach erfolgreicher Migration einer Komponente werden in der Vue 2 Webapp Warnungen eingebaut:
```js
// In alter Komponente
if (process.env.NODE_ENV === 'development') {
  console.warn('[DEPRECATED] Button: Bitte @ocelot-social/ui verwenden')
}
```

---

## 7. Dokumentation & DX

### Storybook als Komponenten-Dokumentation

Die Komponenten werden über Storybook dokumentiert und auf einer öffentlichen Webseite für Entwickler zugänglich gemacht.

**Features für Entwickler:**
- Interaktive Playgrounds zum Ausprobieren
- Alle Varianten und Zustände auf einen Blick
- Copy-paste-fertige Code-Snippets
- Suchfunktion
- Props-Dokumentation mit Typen und Defaults

**Hosting:**
- Eigener Server (öffentlich zugänglich)
- Static Build via `histoire build`
- Deployment bei jedem Release

**Workflow:**
```
Komponente entwickeln → Storybook Story schreiben → Build → Deploy auf Server
```

---

## 8. Migrationsstrategie

### Grundprinzipien

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATIONSSTRATEGIE                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Library vollständig in Vue 3 schreiben                      │
│  2. vue-demi für Vue 2 Kompatibilität                           │
│  3. Komponente für Komponente migrieren                         │
│  4. Jede Komponente: vollständig getestet + in Storybook         │
│  5. Nach Migration: Duplikate entfernen, Varianten konsolidieren│
└─────────────────────────────────────────────────────────────────┘
```

### Ablauf pro Komponente

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   ANALYSE    │ →  │    SPEC      │ →  │   DEVELOP    │ →  │     QA       │ →  │  INTEGRATE   │
├──────────────┤    ├──────────────┤    ├──────────────┤    ├──────────────┤    ├──────────────┤
│ Bestehende   │    │ Props        │    │ Vue 3 Code   │    │ Alle Tests   │    │ In Vue 2     │
│ Varianten    │    │ Varianten    │    │ Unit Tests   │    │ grün         │    │ Projekt      │
│ identifiz.   │    │ Zustände     │    │ Storybook     │    │ Visual Regr. │    │ einbinden    │
│ Duplikate    │    │ A11y         │    │ Stories      │    │ A11y Check   │    │              │
│ finden       │    │ Tokens       │    │              │    │ Review       │    │ Alte Komp.   │
│              │    │              │    │              │    │              │    │ entfernen    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Komponenten-Protokoll

Pro Komponente wird eine Status-Datei **im Komponenten-Ordner** geführt (Colocation):

```
packages/ui/src/components/OsButton/
├── OsButton.vue
├── OsButton.spec.ts
├── button.variants.ts
├── index.ts
└── STATUS.md          ← Status-Datei hier
```

**Inhalt:**
- Übersicht (Implementierungsstatus, Tests, A11y)
- Implementierte Features (Props, Slots, Events)
- Fehlende Features (aus KATALOG.md)
- Test-Coverage
- Architektur (Datei-Struktur, CVA-Pattern)
- Nächste Schritte
- Changelog

**Begründung für Colocation:**
- Status-Datei direkt beim Code auffindbar
- Einfacher zu aktualisieren bei Änderungen
- Kein separater docs/ Ordner notwendig
- Folgt dem Prinzip "Code und Dokumentation zusammen"

### Qualitätsanforderungen pro Komponente

| Anforderung | Beschreibung |
|-------------|--------------|
| **Vollständig getestet** | Unit-Tests für alle Props, Varianten, Edge-Cases |
| **Storybook Stories** | Alle Varianten und Zustände dokumentiert |
| **Detaillierte Spec** | Props, Events, Slots, A11y vor Implementierung definiert |
| **Token-basiert** | Nutzt ausschließlich Design Tokens, keine hardcoded Werte |
| **Vue 2 kompatibel** | Funktioniert via vue-demi im bestehenden Projekt |
| **A11y geprüft** | axe-core Tests bestanden |
| **Visual Regression** | Screenshot-Baseline erstellt |
| **Feature Parity** | Checkliste abgehakt (alle Props, Events, Slots) |

### Konsolidierungsziele

Bei der Migration werden:
- **Duplikate eliminiert** - nur eine kanonische Version pro Komponente
- **Unnötige Varianten entfernt** - nur tatsächlich genutzte Varianten
- **Zusammenführbare Komponenten vereint** - z.B. verschiedene Button-Typen → ein Button mit Props
- **Inkonsistenzen bereinigt** - einheitliche API, Naming, Patterns

---

## 9. Dokumentationsstrategie

> Siehe ausführliche Version in §15 Dokumentationsstrategie (Details).
> Kurzzusammenfassung: Generierte Docs (vue-component-meta) + Manuell (Storybook).

---

## 10. Kompatibilitätstests

> Vue 2/3 × Tailwind/CSS Testmatrix. Details siehe §18.

**Kurzfassung:**
- 4 Example Apps: vue3-tailwind, vue3-css, vue2-tailwind, vue2-css
- Vitest Unit-Tests mit Vue 2.7 und Vue 3.4
- Playwright E2E für alle 4 Kombinationen
- Package-Validierung: publint, arethetypeswrong

---

# REFERENZ & HISTORIE

## 11. Entscheidungen

> 70 Entscheidungen in 9 Kategorien

### Vision & Ziele

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 1 | Hauptziel | Migration vorbereiten | Schrittweise Vue 2 → Vue 3 |

### Tech-Stack

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 2 | Framework | Vue 3 + Vite | Modern, schnell, gute DX |
| 3 | Dokumentation | Storybook 10 | Storybook 1.0-beta hängt mit Tailwind v4 + Node 25, Storybook funktioniert sofort |
| 4 | Styling | Tailwind + CSS Variables | Modern + Branding-kompatibel |
| 6 | Testing | Vitest | Vite-nativ, Jest-kompatibel |
| 9 | Vue 2 Kompatibilität | vue-demi | Library funktioniert in beiden Vue-Versionen |
| 16 | Linting | eslint-config-it4c | TypeScript + Vue + Prettier + weitere Regeln |
| 34 | Vue API | `<script setup>` | Composition API mit script setup |
| 36 | Package Manager | npm | Bereits im Projekt verwendet |
| 41 | TypeScript | strict: true | Strikte Typisierung |
| 43 | Vue 2 Minimum | Vue 2.7 | Erforderlich für `<script setup>` Support |
| 69 | Varianten-System | CVA (class-variance-authority) | Typsichere Props, Composable, DX wie shadcn/ui |
| 70 | Klassen-Utility | cn() (clsx + tailwind-merge) | Bedingte Klassen + Tailwind-Deduplizierung |
| 71 | Komponenten-Status | STATUS.md im Komponenten-Ordner | Colocated mit Code, nicht in separatem docs/ |

### Build & Distribution

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 8 | Paket-Format | npm Library | Wiederverwendbar |
| 25 | Paket-Name | @ocelot-social/ui | Unter ocelot-social npm Org |
| 31 | Build-Strategie | Dual-Build | Tailwind Preset + Vorkompilierte CSS |
| 32 | Lizenz | Apache 2.0 | Permissiv mit Patent-Schutz |
| 33 | Repository | Monorepo | Ocelot-Social/packages/ui/ |
| 42 | Ordnerstruktur | packages/ui | Monorepo-Standard, erweiterbar |
| 44 | Dev-Linking | Nuxt Alias | LOCAL_UI=true für lokale Library |

### CI/CD & Release

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 15 | Release-Tool | release-please (Manifest) | Monorepo-kompatibel, nur packages/ui Änderungen |
| 17 | CI Workflows | Lint, Test, Build | Qualitätssicherung bei jedem PR |
| 18 | npm Publish | Automatisch bei Release | Nach release-please PR merge |
| 19 | Doku-Deploy | Automatisch bei Release | storybook build + deploy |
| 45 | Release-Check | Git-basiert | Prüft unreleased UI-Änderungen vor Ocelot-Release |
| 46 | Storybook Deploy | Webhook + Script | Server zieht und baut bei Release |
| 50 | GitHub Workflows | 12 Workflows | Vollständige CI/CD Pipeline |

### Testing & Qualität

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 20 | Visual Regression | Playwright Screenshots | Visueller Vergleich bei Änderungen |
| 21 | Accessibility | @axe-core/playwright | A11y integriert in Visual Tests |
| 22 | Bundle Size | size-limit | Warnung bei Größenüberschreitung |
| 23 | Feature Parity | Checkliste pro Komponente | Sicherstellen dass alle Features migriert |
| 37 | Test Coverage | 100% | Vollständige Testabdeckung |
| 57 | Kompatibilitätstests | 4er-Matrix + CI | Vue 2/3 × Tailwind/CSS (siehe §18) |

### Design-System & Branding

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 5 | Token-System | 3-Stufen (Base/Semantic/Component) | Maximale Branding-Flexibilität |
| 29 | Dark Mode | Ja, von Anfang an | Alle Komponenten mit Light/Dark |
| 30 | Icons | Hybrid-Architektur | System-Icons in Library, Feature-Icons in App |
| 51 | Icon-Architektur | Hybrid | ~10 System-Icons in Library, Rest in App (siehe §4) |
| 59 | Size Props | Tailwind-Skala (xs, sm, md, lg, xl, 2xl) | Konsistenz mit Tailwind, intuitive Benennung |
| 60 | Rounded Props | Tailwind-Skala (none, sm, md, lg, xl, 2xl, 3xl, full) | Konsistenz mit Tailwind border-radius |
| 61 | Shadow Props | Tailwind-Skala (none, sm, md, lg, xl, 2xl) | Konsistenz mit Tailwind box-shadow |
| 62 | Variant Props | Semantisch (primary, secondary, danger, warning, success, info) | Übliche UI-Farbvarianten |
| 63 | Dark Mode Handling | CSS-Klassen (`dark:` Prefix) | Standard-Tailwind-Pattern, keine "inverse" Props |
| 64 | Prop-Vollständigkeit | Alle Werte einer Skala | Konsistente API, keine Teilmengen pro Komponente |
| 65 | CSS Variable Defaults | Keine Defaults in Library | Webapp definiert Branding, Library ist design-agnostisch |
| 66 | Branding-Hierarchie | Webapp → Spezialisiertes Branding | Default-Branding in Webapp, Overrides pro Instanz |
| 67 | Variable-Validierung | Runtime-Check in Development | `validateCssVariables()` warnt bei fehlenden Variablen |
| 68 | Branding-Test (Webapp) | CI-Test in Webapp | Webapp testet, dass Default-Branding alle Library-Variablen definiert |

### Komponenten-API & Konventionen

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 26 | Komponenten-Prefix | Os | OsButton, OsCard, etc. |
| 27 | Browser-Support | Modern only | Letzte 2 Versionen von Chrome, Firefox, Safari, Edge |
| 28 | SSR | Ja | Nuxt-kompatibel |
| 35 | Sprache | Englisch | Code, Comments, Docs |
| 38 | Dateinamen | PascalCase | OsButton.vue, OsCard.vue |
| 39 | i18n | Nur Props | Keine Default-Texte in Komponenten |
| 40 | Breakpoints | Tailwind Standard | sm, md, lg, xl, 2xl |
| 55 | Komponenten-Abgrenzung | Entscheidungsbaum | Library: präsentational, Webapp: Business-Logik (siehe §16) |

### Dokumentation

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 13 | Doku-Hosting | Eigener Server | Öffentlich zugängliche Komponenten-Doku |
| 14 | Doku-Zugang | Öffentlich | Für alle Entwickler frei zugänglich |
| 47 | Komponenten-Protokoll | STATUS.md im Komponenten-Ordner | Colocated: src/components/OsButton/STATUS.md |
| 52 | Docs-Generierung | vue-component-meta | Komponenten-Tabelle aus Code generiert |
| 53 | Docs CI-Check | GitHub Workflow | Prüft JSDoc-Coverage und README-Aktualität |
| 54 | Nach Migration | ARCHITECTURE.md | PROJEKT.md → ARCHITECTURE.md, KATALOG.md archivieren |

### Migration & Prozess

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 7 | Komponenten-Reihenfolge | Nach Bedarf | Flexibel, Token-System zuerst |
| 10 | Migrations-Ablauf | Komponente für Komponente | Kontrolliert, schrittweise |
| 11 | Vor-Analyse | Vollständige Analyse | Duplikate/Probleme vor Migration identifizieren |
| 12 | Spezifikation | Detailliert vor Implementierung | Props, Varianten, A11y vorher definieren |
| 24 | Deprecation Warnings | Console Warnings | Hinweise in alter Codebase |
| 48 | Katalogisierung | KATALOG.md | Unterbrechbar, Webapp + Styleguide |
| 49 | Fortschritt | Berechenbar | Pro Phase und Gesamt |
| 56 | Externe Abhängigkeiten | ✅ Gelöst | eslint-config-it4c v0.8.0 ist modular |
| 58 | Komplexitätsanalyse | Dokumentiert in §19 | Risikofaktoren, Parallelisierbarkeit, Aufwandstreiber |

---

## 12. Arbeitsprotokoll

| Datum | Beschreibung | Ergebnis |
|-------|--------------|----------|
| 2026-02-04 | Projektstart | Ordner und Planungsdokument erstellt |
| 2026-02-04 | Tech-Stack Entscheidungen | Alle Kernentscheidungen getroffen |
| 2026-02-04 | Migrationsstrategie | vue-demi, Komponente-für-Komponente, Analyse-First |
| 2026-02-04 | Dokumentation | Komponenten-Doku auf eigenem Server, öffentlich zugänglich |
| 2026-02-04 | CI/CD & Release | release-please, GitHub Workflows, automatisches npm publish |
| 2026-02-04 | Erweiterte QA | Visual Regression, A11y Tests, Bundle Size Check |
| 2026-02-04 | Migrations-Absicherung | Feature Parity Checklist, Deprecation Warnings |
| 2026-02-04 | Naming & Paket | @ocelot-social/ui, Os-Prefix |
| 2026-02-04 | Plattform | Modern Browsers, SSR-kompatibel, Dark Mode |
| 2026-02-04 | Build & Icons | Dual-Build (Tailwind + CSS), Hybrid-Architektur (~10 System-Icons) |
| 2026-02-04 | Organisatorisch | Apache 2.0, bleibt im Monorepo |
| 2026-02-04 | Konventionen | script setup, Englisch, npm, 100% Coverage, PascalCase |
| 2026-02-04 | Weitere | Nur Props (kein i18n), Tailwind Breakpoints, strict TS |
| 2026-02-04 | Ordnerstruktur | packages/ui statt styleguide-vue3 |
| 2026-02-04 | Konfliktanalyse | Vue 2.7 Upgrade als Voraussetzung für script setup |
| 2026-02-04 | Webapp-Integration | Nuxt Alias für lokale Entwicklung, Git-basierter Release-Check |
| 2026-02-04 | Prozesse | QA-Schritt pro Komponente, Komponenten-Protokoll, KATALOG.md |
| 2026-02-04 | Fortschritt | Berechenbar für Gesamt und Einzelschritte |
| 2026-02-04 | **Phase 1 abgeschlossen** | Vue 2.7 Upgrade erfolgreich, alle Tests bestanden |
| 2026-02-04 | **Icon-Architektur** | Hybrid-Ansatz: ~10 System-Icons in Library, Feature-Icons in App |
| 2026-02-04 | **Dokumentationsstrategie** | Hybrid: Generiert (vue-component-meta) + Manuell, CI-geprüft |
| 2026-02-04 | **Abgrenzung Library/Webapp** | Entscheidungsbaum + Checkliste für Komponenten-Zuordnung |
| 2026-02-04 | **Externe Abhängigkeit** | eslint-config-it4c blockiert Linting-Setup, Workaround dokumentiert |
| 2026-02-04 | **Kompatibilitätstests** | 4er-Matrix (Vue 2/3 × Tailwind/CSS), Example Apps, Playwright E2E |
| 2026-02-07 | **Storybook statt Histoire** | Histoire 1.0-beta hängt mit Tailwind v4 + Node 25 (kein Output, 100% CPU). Storybook 10 funktioniert sofort. |
| 2026-02-07 | **Storybook Greyscale-Theme** | Komponenten in Graustufen - verdeutlicht, dass Farben von der App kommen, nicht von der Library. |
| 2026-02-07 | **CSS Token-System** | requiredCssVariables mit 18 Farb-Variablen (6 Farben × 3 Werte) befüllt. |
| 2026-02-07 | **Storybook Workflow** | ui-storybook.yml für Build + Artifact Upload. |
| 2026-02-07 | **Docker Setup** | Dockerfile (dev + prod), ui-docker.yml Workflow, docker-compose Services. |
| 2026-02-07 | **Storybook Build Fix** | viteFinal entfernt vite-plugin-dts und build-css für Storybook-Build. Stories aus Coverage ausgeschlossen. |
| 2026-02-07 | **Docs-Check Script** | scripts/check-docs.ts prüft: Story-Existenz, JSDoc für Props, Varianten-Abdeckung. ui-docs.yml Workflow. |
| 2026-02-04 | **Phasen umbenannt** | 0.5→1, 1→2, 2→3, 3→4, 4→5 (nur ganzzahlige Phasen) |
| 2026-02-04 | **Dokument-Konsolidierung** | §13 Zahlen korrigiert, §14 Link entfernt, §16 Reihenfolge, Terminologie vereinheitlicht |
| 2026-02-04 | **Komplexitätsanalyse** | §20 hinzugefügt: Risikofaktoren, Parallelisierbarkeit, Aufwandstreiber pro Komponente |
| 2026-02-04 | **Phase 2 gestartet** | Vite + Vue 3 Projekt initialisiert, vue-demi, Vitest, Package-Struktur |
| 2026-02-04 | **Build-System** | vite.config.ts mit Library-Mode, vite-plugin-dts für Types, vite-tsconfig-paths |
| 2026-02-04 | **Testing** | Vitest in vite.config.ts integriert, Plugin-Tests geschrieben |
| 2026-02-04 | **Dokumentation** | README.md mit Installation und Usage (Tree-Shaking vs Plugin) |
| 2026-02-04 | **Tailwind-Konventionen** | Size, Rounded, Shadow, Variant - vollständige Skalen, Dark Mode via CSS |
| 2026-02-04 | **Tailwind v4 Setup** | @tailwindcss/vite Plugin, Dual-Build (style.css + tailwind.preset) |
| 2026-02-04 | **Prop-Types** | src/types.d.ts mit Size, Rounded, Shadow, Variant |
| 2026-02-04 | **Branding-Architektur** | Keine Defaults in Library, Webapp definiert Branding, validateCssVariables() |
| 2026-02-07 | **ESLint Setup** | eslint-config-it4c v0.8.0 eingerichtet (Vue 3, Vitest, Prettier) |
| 2026-02-07 | **GitHub Workflows** | ui-lint.yml, ui-test.yml (100% Coverage), ui-build.yml (Build + Verify) |
| 2026-02-07 | **.tool-versions** | Node 25.5.0 zentral definiert, Workflows nutzen node-version-file |
| 2026-02-07 | **Vue 2/3 Matrix** | vue2 + @vitejs/plugin-vue2, CI Matrix-Tests, .npmrc legacy-peer-deps |
| 2026-02-07 | **Vue 2 Test-Strategie geändert** | Inline-Matrix entfernt (Peer-Dependency-Konflikte), Vue 2 wird via Example Apps getestet |
| 2026-02-07 | **Example Apps erstellt** | vue2-app und vue3-app mit Vitest, ui-compatibility.yml Workflow |
| 2026-02-07 | **ESLint Examples** | Eigene eslint.config.ts + prettier.config.mjs pro Example App, Lint im Compatibility-Workflow |
| 2026-02-07 | **Type Assertions** | `as unknown as Plugin` für CI-Kompatibilität bei verlinkten Packages |
| 2026-02-07 | **Package-Validierung** | publint + arethetypeswrong, separate .d.cts für CJS, afterBuild Hook in vite-plugin-dts |
| 2026-02-07 | **4er Example Apps Matrix** | vue3-tailwind, vue3-css, vue2-tailwind, vue2-css; Workflow mit Matrix-Strategie |
| 2026-02-07 | **Release & Publish** | release-please Manifest-Config, ui-release.yml Workflow mit npm publish |
| 2026-02-07 | **CONTRIBUTING.md** | Entwickler-Leitfaden mit Setup, Komponenten-Erstellung, Code-Standards, Testing, Commits |
| 2026-02-07 | **Dependabot** | Konfiguration für UI-Package und alle 4 Example Apps hinzugefügt |
| 2026-02-07 | **CSS-Build** | Tailwind CLI im closeBundle Hook für style.css Generierung |
| 2026-02-07 | **CVA Setup** | class-variance-authority, clsx, tailwind-merge als Dependencies |
| 2026-02-07 | **cn() Utility** | Tailwind-Klassen-Merge Funktion (clsx + tailwind-merge) mit Tests |
| 2026-02-07 | **OsButton** | Erste Komponente mit CVA-Varianten (variant, size, fullWidth) implementiert |
| 2026-02-07 | **ESLint Fixes** | vue/max-attributes-per-line off (Prettier), import-x/no-relative-parent-imports off |
| 2026-02-07 | **STATUS.md Konvention** | Komponenten-Status als STATUS.md im Komponenten-Ordner (Colocation statt docs/) |
| 2026-02-07 | **OsButton STATUS.md** | Status-Datei erstellt mit Feature-Übersicht, fehlenden Features, Test-Coverage, Architektur |
| 2026-02-07 | **CVA-Dokumentation** | §5 erweitert: CVA + Tailwind + CSS-Variablen Architektur, Branding-Überschreibbarkeit |
| 2026-02-07 | **Accessibility Tests** | vitest-axe mit axe-core, Custom TypeScript-Declarations, OsButton a11y-Tests |
| 2026-02-07 | **Completeness Check** | check-docs.ts → check-completeness.ts, docs:check → verify, ui-docs.yml → ui-verify.yml |
| 2026-02-07 | **Visual Regression Tests** | Playwright mit colocated Tests (*.visual.spec.ts), ui-visual.yml Workflow |
| 2026-02-07 | **Colocated Screenshots** | __screenshots__/ im Komponenten-Ordner statt separatem e2e/ |
| 2026-02-07 | **Visual Test Coverage** | verify prüft ob alle Stories Visual Tests haben (--kebab-case URL) |
| 2026-02-07 | **Phase 2 abgeschlossen** | Alle 26 Aufgaben erledigt, bereit für Phase 3 |
| 2026-02-08 | **Keyboard Tests** | describe('keyboard accessibility') mit 4 Tests, verify prüft Existenz |
| 2026-02-08 | **ESLint Plugins** | eslint-plugin-storybook installiert, flat/recommended Config |
| 2026-02-08 | **A11y Konsolidierung** | vitest-axe → @axe-core/playwright, checkA11y() in Visual Tests |
| 2026-02-08 | **Greyscale Theme WCAG** | Farben für 4.5:1 Kontrast angepasst (warning, info, secondary) |
| 2026-02-08 | **Test-Vereinfachung** | *.a11y.spec.ts entfernt, A11y via checkA11y() in Visual Tests |
| 2026-02-08 | **Completeness Update** | verify prüft: Story, Visual, checkA11y(), Keyboard, Varianten |
| 2026-02-08 | **Phase 2 Konsolidierung** | Dependencies aufgeräumt (vitest-axe, axe-core entfernt) |
| 2026-02-08 | **Projekt-Optimierung** | src/test/setup.ts entfernt, @storybook/vue3 entfernt, README.md fix |
| 2026-02-08 | **Package Updates** | size-limit 12.0.0, eslint-plugin-jsdoc 62.5.4, vite-tsconfig-paths 6.1.0 |
| 2026-02-08 | **TODO: eslint-config-it4c** | Muss auf ESLint 10 aktualisiert werden (aktuell inkompatibel) |

---

## 13. Komponenten-Katalog

> **Detaillierte Katalogisierung in separater Datei: [KATALOG.md](./KATALOG.md)**

### Zusammenfassung (aus KATALOG.md)

| Quelle | Gesamt | Analysiert | Duplikate | Zu migrieren |
|--------|--------|------------|-----------|--------------|
| Webapp | 139 | ✅ | 5 | Priorisiert |
| Styleguide | 38 | ✅ | 5 | Priorisiert |
| **Gesamt** | **177** | **✅** | **5 direkte + 3 Familien** | **15 Kern-Komponenten** |

---

## 14. Ressourcen & Links

**Projekt:**
- [Ocelot-Social Repository](https://github.com/Ocelot-Social-Community/Ocelot-Social)
- [Styleguide (Live)](http://styleguide.ocelot.social/)
- Bestehender Styleguide Code: `../../styleguide/`
- Bestehende Webapp: `../../webapp/`
- Design Tokens: `../../styleguide/src/system/tokens/`

**Tracking:**
- Katalogisierung: `./KATALOG.md`
- Komponenten-Status: `./src/components/*/STATUS.md` (colocated)

**Dokumentation:**
- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Storybook](https://storybook.js.org/)
- [Vitest](https://vitest.dev/)
- [vue-demi](https://github.com/vueuse/vue-demi)

---

## 15. Dokumentationsstrategie (Details)

### Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  GENERIERT (aus Code) - Single Source of Truth              │
├─────────────────────────────────────────────────────────────┤
│  • README.md Komponenten-Tabelle                            │
│  • Props/Events/Slots Dokumentation                         │
│  • TypeScript-Typen                                         │
└─────────────────────────────────────────────────────────────┘
                            +
┌─────────────────────────────────────────────────────────────┐
│  MANUELL                                                    │
├─────────────────────────────────────────────────────────────┤
│  • README.md Installation, Quick Start, Theming             │
│  • Storybook Stories (interaktive Beispiele)                 │
│  • ARCHITECTURE.md (Entscheidungen)                         │
│  • Best Practices, Patterns                                 │
└─────────────────────────────────────────────────────────────┘
```

### README.md Struktur

```markdown
# @ocelot-social/ui

## Übersicht
- Was ist die Library?
- Link zu Storybook (Live-Dokumentation)

## Installation
- npm install
- Peer Dependencies (vue, vue-demi)

## Quick Start
- Minimal-Beispiel (Import + Nutzung)
- Mit Tailwind / Ohne Tailwind

## Theming / Branding
- CSS Custom Properties überschreiben
- Beispiel-Branding

## Icon-System
- System-Icons (enthalten)
- Eigene Icons registrieren

## Vue 2 / Vue 3
- vue-demi Erklärung
- Kompatibilitätshinweise

## Komponenten                    ← GENERIERT
- Tabelle aller Komponenten
- Link zu Storybook für Details

## Contributing
- Link zu CONTRIBUTING.md

## License
- Apache 2.0
```

### Generierung mit vue-component-meta

**Tool:** `vue-component-meta` (offizielles Vue-Tool)

```typescript
// scripts/generate-docs.ts
import { createComponentMetaChecker } from 'vue-component-meta'

// Extrahiert aus .vue Dateien:
{
  name: "OsButton",
  description: "Primary button component for user actions",
  props: [
    {
      name: "variant",
      type: "'primary' | 'secondary' | 'danger'",
      default: "'primary'",
      required: false,
      description: "Visual style variant"
    }
  ],
  events: [{ name: "click", type: "(event: MouseEvent) => void" }],
  slots: [{ name: "default", description: "Button content" }]
}
```

**Generierte Komponenten-Tabelle:**
```markdown
| Komponente | Beschreibung | Props | Events | Slots |
|------------|--------------|-------|--------|-------|
| OsButton | Primary button for actions | 8 | 1 | 2 |
| OsCard | Container with header/footer | 5 | 0 | 3 |
| ... | ... | ... | ... | ... |
```

### CI-Workflow: docs-check

```yaml
# .github/workflows/docs-check.yml
name: Documentation Check

on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate docs from components
        run: npm run docs:generate

      - name: Check for undocumented props
        run: npm run docs:check-coverage
        # Fails if props/events/slots missing JSDoc

      - name: Verify README is up-to-date
        run: npm run docs:verify
        # Compares generated table with README
        # Fails if differences found
```

**Scripts in package.json:**
```json
{
  "scripts": {
    "docs:generate": "tsx scripts/generate-docs.ts",
    "docs:check-coverage": "tsx scripts/check-doc-coverage.ts",
    "docs:verify": "tsx scripts/verify-readme.ts",
    "docs:update": "npm run docs:generate && npm run docs:inject-readme"
  }
}
```

### ESLint-Regeln für Dokumentation

```javascript
// eslint.config.js
{
  rules: {
    // Erzwingt JSDoc für exportierte Funktionen/Komponenten
    "jsdoc/require-jsdoc": ["error", {
      require: {
        FunctionDeclaration: true,
        ClassDeclaration: true
      }
    }],
    "jsdoc/require-description": "error",
    "jsdoc/require-param-description": "error"
  }
}
```

### Dokumentations-Phasen

| Phase | Dokumentation | Status |
|-------|---------------|--------|
| **Phase 2** | README.md Grundgerüst (Installation, Setup) | Manuell |
| **Phase 2** | CONTRIBUTING.md | Manuell |
| **Phase 2** | docs:generate Script einrichten | Automatisiert |
| **Phase 2** | CI docs-check Workflow | Automatisiert |
| **Phase 4** | Storybook Stories pro Komponente | Manuell |
| **Phase 4** | JSDoc in Komponenten | Im Code |
| **Phase 4** | README Komponenten-Tabelle | Generiert |
| **Phase 4** | README Finalisierung | Manuell |
| **Phase 5** | ARCHITECTURE.md (aus PROJEKT.md) | Manuell |

### Nach der Migration: Datei-Transformation

```
Während Migration:
├── PROJEKT.md          # Planungs- und Statusdokument
├── KATALOG.md          # Komponenten-Tracking

Nach Phase 5 (Migration abgeschlossen):
├── README.md           # Nutzer-Dokumentation (teilweise generiert)
├── CONTRIBUTING.md     # Beitragende
├── CHANGELOG.md        # Automatisch via release-please
├── ARCHITECTURE.md     # Entscheidungen aus PROJEKT.md §2, §4, §5, §11, §15, §16
├── src/components/*/STATUS.md  # Komponenten-Status (colocated, werden beibehalten)
└── docs/
    └── archive/        # Historische Referenz (optional)
        ├── PROJEKT.md
        └── KATALOG.md
```

**Was wird übernommen nach ARCHITECTURE.md:**
- §2 Tech-Stack (gekürzt)
- §5 Design-Token & Branding (Token-Architektur)
- §11 Entscheidungen (relevante, nicht Prozess-bezogene)
- §4 Icon-Architektur
- §9/§15 Dokumentationsstrategie (gekürzt)
- §16 Library vs. Webapp

**Was wird archiviert/gelöscht:**
- Fortschritt → erledigt
- Aktueller Stand → erledigt
- Meilensteine → erledigt
- §12 Arbeitsprotokoll → historisch interessant, archivieren
- KATALOG.md → nur für Migration relevant, archivieren

---

# ABGRENZUNGEN

## 16. Library vs. Webapp

### Grundprinzip

```
┌─────────────────────────────────────────────────────────────┐
│  @ocelot-social/ui (Library)                                │
├─────────────────────────────────────────────────────────────┤
│  • Rein präsentational                                      │
│  • Keine Business-Logik                                     │
│  • Keine API-Calls                                          │
│  • Kein App-State                                           │
│  • Wiederverwendbar in jedem Vue-Projekt                    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ nutzt
┌─────────────────────────────────────────────────────────────┐
│  Webapp (Ocelot)                                            │
├─────────────────────────────────────────────────────────────┤
│  • Business-Logik (GraphQL, Auth, etc.)                     │
│  • App-State (Vuex/Pinia)                                   │
│  • i18n Texte                                               │
│  • Routing-Logik                                            │
│  • Ocelot-spezifische Features                              │
└─────────────────────────────────────────────────────────────┘
```

### Entscheidungs-Checkliste

| Kriterium | Library ✅ | Webapp ✅ |
|-----------|-----------|----------|
| **Business-Logik** | Keine | Hat GraphQL/API-Calls |
| **App-State** | Kein Vuex/Pinia | Braucht Store |
| **i18n** | Nur via Props | Nutzt `$t()` direkt |
| **Routing** | Nur via Props (`to`) | Nutzt `$router` direkt |
| **Wiederverwendbar** | In jedem Vue-Projekt | Nur in Ocelot |
| **Abhängigkeiten** | Nur Vue + vue-demi | Ocelot-spezifisch |
| **Styling** | Design-Tokens | App-spezifische Styles |
| **Daten** | Erhält via Props | Fetcht selbst |

### Entscheidungsbaum

```
Komponente X
    │
    ▼
┌─────────────────────────────────────┐
│ Hat sie Business-Logik?             │
│ (API-Calls, Mutations, Auth-Check)  │
└─────────────────────────────────────┘
    │
    ├── JA ──► WEBAPP
    │
    ▼ NEIN
┌─────────────────────────────────────┐
│ Braucht sie App-State?              │
│ (Vuex, Pinia, globaler State)       │
└─────────────────────────────────────┘
    │
    ├── JA ──► WEBAPP
    │
    ▼ NEIN
┌─────────────────────────────────────┐
│ Nutzt sie $t() oder $router direkt? │
└─────────────────────────────────────┘
    │
    ├── JA ──► WEBAPP (oder refactoren)
    │
    ▼ NEIN
┌─────────────────────────────────────┐
│ Ist sie generisch wiederverwendbar? │
│ (Könnte in anderem Projekt helfen)  │
└─────────────────────────────────────┘
    │
    ├── NEIN ──► WEBAPP
    │
    ▼ JA

    ══► LIBRARY
```

### Quantitative Regel

> **Wenn ≥2 Kriterien auf "Webapp" zeigen → Webapp**
> **Wenn alle Kriterien auf "Library" zeigen → Library**

### Konkrete Beispiele

| Komponente | Entscheidung | Begründung |
|------------|--------------|------------|
| `OsButton` | **Library** | Rein präsentational, keine Logik |
| `OsModal` | **Library** | UI-Container, Logik via Events |
| `OsInput` | **Library** | Generisches Form-Element |
| `OsAvatar` | **Library** | Nur Bild + Fallback-Initialen |
| `OsCard` | **Library** | Layout-Container |
| `OsDropdown` | **Library** | Popover-Mechanik |
| `FollowButton` | **Webapp** | GraphQL Mutation, User-State |
| `PostTeaser` | **Webapp** | Ocelot-Datenstruktur, Links |
| `CommentForm` | **Webapp** | API-Call, Auth-Check |
| `ConfirmModal` | **Webapp** | Nutzt OsModal + Callbacks |
| `LoginForm` | **Webapp** | Auth-Logik, Routing, i18n |
| `UserAvatar` | **Webapp** | Nutzt OsAvatar + User-Daten |
| `NotificationMenu` | **Webapp** | GraphQL, Store, i18n |

### Composition Pattern für Grenzfälle

Wenn eine Komponente UI- und Business-Anteile hat: **Aufteilen**

```
┌─────────────────────────────────────────────────────────────┐
│  LIBRARY: OsModal                                           │
│  - Overlay, Animation, Backdrop                             │
│  - close/confirm Events                                     │
│  - Slots für Content                                        │
│  - Props: title, confirmLabel, cancelLabel                  │
└─────────────────────────────────────────────────────────────┘
                        ▲
                        │ nutzt
┌─────────────────────────────────────────────────────────────┐
│  WEBAPP: DeleteUserModal                                    │
│  - Wraps OsModal                                            │
│  - GraphQL Mutation                                         │
│  - i18n Texte via $t()                                      │
│  - Redirect nach Löschung                                   │
└─────────────────────────────────────────────────────────────┘
```

**Beispiel-Code:**

```vue
<!-- Webapp: DeleteUserModal.vue -->
<template>
  <OsModal
    :title="$t('user.delete.title')"
    :confirm-label="$t('common.delete')"
    confirm-variant="danger"
    @confirm="handleDelete"
    @cancel="$emit('close')"
  >
    <p>{{ $t('user.delete.warning', { name: user.name }) }}</p>
  </OsModal>
</template>

<script setup>
import { OsModal } from '@ocelot-social/ui'
import { useDeleteUserMutation } from '~/graphql/mutations'
import { useRouter } from 'vue-router'

const props = defineProps(['user'])
const emit = defineEmits(['close'])
const router = useRouter()
const { mutate: deleteUser } = useDeleteUserMutation()

const handleDelete = async () => {
  await deleteUser({ id: props.user.id })
  emit('close')
  router.push('/')
}
</script>
```

### Checkliste bei neuer Komponente

Vor dem Erstellen einer Komponente diese Fragen beantworten:

```
[ ] Wo gehört die Komponente hin? (Entscheidungsbaum durchlaufen)
[ ] Falls Library: Sind alle Texte via Props?
[ ] Falls Library: Keine direkten Store/Router Imports?
[ ] Falls Webapp: Welche Library-Komponenten werden genutzt?
[ ] Falls Grenzfall: Kann sie aufgeteilt werden?
```

---

## 17. Externe Abhängigkeiten

### Übersicht

| Abhängigkeit | Status | Beschreibung |
|--------------|--------|--------------|
| **eslint-config-it4c** | ⚠️ ESLint 10 ausstehend | v0.8.0 eingebunden, ESLint 10 inkompatibel |

### eslint-config-it4c

**Status:** Funktional, ESLint 10 Update ausstehend

**TODO:** eslint-config-it4c muss für ESLint 10 aktualisiert werden (aktuell inkompatibel wegen @typescript-eslint/utils).

**Lösung:**
Das Paket wurde in Version 0.8.0 modularisiert und unterstützt jetzt ESLint Flat Config.

**Aktuelle Nutzung in @ocelot-social/ui:**
```typescript
// eslint.config.ts
import config, { vue3, vitest } from 'eslint-config-it4c'

export default [
  ...config,    // Base + TypeScript + Prettier + weitere
  ...vue3,      // Vue 3 Regeln
  ...vitest,    // Vitest Test-Regeln
  // Projekt-spezifische Overrides...
]
```

**Projekt-spezifische Anpassungen:**
- `n/file-extension-in-import`: Ausnahmen für `.vue`, `.css`, `.scss`, `.json`
- `import-x/no-unassigned-import`: CSS-Imports erlaubt
- `vitest/consistent-test-filename`: Pattern `*.spec.ts`
- `vitest/prefer-expect-assertions`: Ausgeschaltet
- `vitest/no-hooks`: Ausgeschaltet
- Example Apps: Eigene ESLint-Configs (ignoriert in Hauptpaket, gelintet im Compatibility-Workflow)

---

## 18. Kompatibilitätstests (Details)

### Testmatrix

Die Library muss in 4 Kombinationen funktionieren:

```
                    │  Tailwind         │  CSS (vorkompiliert)
────────────────────┼───────────────────┼──────────────────────
Vue 3.4+            │  ✓ Muss testen    │  ✓ Muss testen
Vue 2.7             │  ✓ Muss testen    │  ✓ Muss testen
```

### Werkzeuge & Strategien

#### 1. vue-demi (Code-Ebene)

Abstrahiert Vue 2/3 API-Unterschiede:

```typescript
// Komponente importiert von vue-demi, nicht vue
import { ref, computed, defineComponent } from 'vue-demi'
```

#### 2. Unit Tests mit Vitest

Hauptpaket testet nur mit Vue 3 (Entwicklungsumgebung).
Vue 2 Kompatibilität wird via vue-demi gewährleistet und in Example Apps getestet.

**Begründung:** Inline Vue 2/3 Matrix verursacht Peer-Dependency-Konflikte.

#### 3. Example Apps (4 Kombinationen) - Hauptstrategie für Vue 2 Tests

```
packages/ui/
├── examples/
│   ├── vue3-tailwind/     # Vite + Vue 3 + Tailwind Preset
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js  # Nutzt @ocelot-social/ui/tailwind.preset
│   │   └── src/App.vue         # Importiert alle Komponenten
│   │
│   ├── vue3-css/          # Vite + Vue 3 + style.css
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.ts         # import '@ocelot-social/ui/style.css'
│   │       └── App.vue
│   │
│   ├── vue2-tailwind/     # Vue CLI / Nuxt 2 + Tailwind
│   │   └── ...
│   │
│   └── vue2-css/          # Vue CLI / Nuxt 2 + style.css
│       └── ...
```

**Jede Example App:**
- Importiert `@ocelot-social/ui` via Workspace-Link
- Rendert alle exportierten Komponenten
- Kann lokal gestartet werden (`npm run dev`)
- Wird in CI gebaut und getestet

#### 4. Playwright E2E Tests

```typescript
// e2e/compatibility.spec.ts
import { test, expect } from '@playwright/test'

const examples = [
  { name: 'vue3-tailwind', port: 3001 },
  { name: 'vue3-css', port: 3002 },
  { name: 'vue2-tailwind', port: 3003 },
  { name: 'vue2-css', port: 3004 },
]

for (const example of examples) {
  test.describe(example.name, () => {
    test('all components render', async ({ page }) => {
      await page.goto(`http://localhost:${example.port}`)

      // Prüfe dass alle Komponenten sichtbar sind
      await expect(page.locator('[data-testid="os-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="os-card"]')).toBeVisible()
      await expect(page.locator('[data-testid="os-modal"]')).toBeVisible()
    })

    test('styles are applied correctly', async ({ page }) => {
      await page.goto(`http://localhost:${example.port}`)
      const button = page.locator('[data-testid="os-button-primary"]')

      // Prüfe dass CSS korrekt angewendet wird
      await expect(button).toHaveCSS('background-color', /rgb/)
    })

    test('visual regression', async ({ page }) => {
      await page.goto(`http://localhost:${example.port}`)
      await expect(page).toHaveScreenshot(`${example.name}.png`)
    })
  })
}
```

#### 5. Package Validation

| Tool | Zweck |
|------|-------|
| **publint** | Prüft package.json auf Export-Fehler |
| **arethetypeswrong** | Prüft TypeScript-Typen für alle Entry Points |

```json
{
  "scripts": {
    "check:exports": "publint && attw --pack .",
    "prepublishOnly": "npm run check:exports"
  }
}
```

#### 6. package.json Exports (korrekte Struktur)

```json
{
  "name": "@ocelot-social/ui",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./style.css": "./dist/style.css",
    "./tailwind.preset": {
      "import": "./dist/tailwind.preset.mjs",
      "require": "./dist/tailwind.preset.cjs",
      "types": "./dist/tailwind.preset.d.ts"
    }
  },
  "peerDependencies": {
    "vue": "^2.7.0 || ^3.0.0"
  },
  "peerDependenciesMeta": {
    "tailwindcss": {
      "optional": true
    }
  }
}
```

### CI Workflow: Compatibility Matrix

```yaml
# .github/workflows/compatibility.yml
name: Compatibility Tests

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: packages/ui/dist

  test-unit:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        vue-version: ['2.7', '3.4']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: packages/ui/dist
      - run: npm ci
      - run: npm test
        env:
          VUE_VERSION: ${{ matrix.vue-version }}

  test-e2e:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        example: ['vue3-tailwind', 'vue3-css', 'vue2-tailwind', 'vue2-css']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: packages/ui/dist

      - name: Setup example app
        working-directory: packages/ui/examples/${{ matrix.example }}
        run: |
          npm ci
          npm run build

      - name: Start preview server
        working-directory: packages/ui/examples/${{ matrix.example }}
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:4173 --timeout 30000

      - name: Run Playwright tests
        working-directory: packages/ui
        run: npx playwright test --grep "${{ matrix.example }}"

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.example }}
          path: packages/ui/playwright-report/

  validate-package:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: packages/ui/dist
      - run: npm ci
      - name: Validate exports
        run: |
          npx publint packages/ui
          npx @arethetypeswrong/cli packages/ui
```

### Werkzeug-Übersicht

| Werkzeug | Zweck | Phase |
|----------|-------|-------|
| **vue-demi** | Vue 2/3 API-Kompatibilität im Code | Phase 2 |
| **Vitest + Matrix** | Unit Tests für Vue 2.7 und Vue 3.4 | Phase 2 |
| **Example Apps (4x)** | Echte Projekte für jede Kombination | Phase 2 |
| **Playwright** | E2E + Visual Regression für alle 4 | Phase 2 |
| **publint** | Package.json Export-Validierung | Phase 2 |
| **arethetypeswrong** | TypeScript Entry Points Check | Phase 2 |
| **pkg-pr-new** | Preview-Releases in PRs (optional) | Optional |

### Checkliste für neue Komponenten

```
[ ] Unit Tests laufen mit VUE_VERSION=2.7
[ ] Unit Tests laufen mit VUE_VERSION=3.4
[ ] Komponente in allen 4 Example Apps hinzugefügt
[ ] E2E Tests für Komponente geschrieben
[ ] Visual Regression Baseline erstellt
[ ] Keine Vue 3-only APIs verwendet (oder via vue-demi abstrahiert)
```

---

## 19. Komplexitätsanalyse

### Umfang nach Phasen

| Phase | Aufgaben | Komplexität | Abhängigkeiten |
|-------|----------|-------------|----------------|
| Phase 0: Analyse | 6 Tasks | ✅ Erledigt | - |
| Phase 1: Vue 2.7 | 6 Tasks | ✅ Erledigt | - |
| Phase 2: Setup | 26 Tasks | Mittel | ⚠️ eslint-config-it4c (extern) |
| Phase 3: Tokens | 6 Tasks | Niedrig | Keine externen |
| Phase 4: Migration | 15 Komponenten | Hoch | Pro Komponente: Spec→Dev→Test→Integrate |
| Phase 5: Finalisierung | 7 Tasks | Niedrig | Alle vorherigen Phasen |

### Bekannte Risikofaktoren

| Risiko | Beschreibung | Auswirkung | Mitigation |
|--------|--------------|------------|------------|
| **eslint-config-it4c** | Externes Projekt muss zuerst modularisiert werden | Blockiert Linting-Setup in Phase 2 | Temporäre lokale ESLint-Config als Workaround |
| **vue-demi Kompatibilität** | Unbekannte Edge-Cases bei Vue 2/3 Dual-Support | Unerwartete Bugs bei Integration | Frühzeitig in Example Apps testen |
| **Visual Regression Baselines** | Können bei Design-Änderungen viel Nacharbeit erfordern | Zusätzlicher Aufwand bei Änderungen | Baselines erst nach Design-Freeze erstellen |
| **Feature-Parity** | Alte Komponenten haben undokumentierte Verhaltensweisen | Regressions bei Migration | Gründliche Analyse vor Implementierung |
| **Tailwind + CSS Dual-Build** | Komplexe Build-Konfiguration | Build-Fehler, Inkonsistenzen | Früh beide Varianten parallel testen |

### Parallelisierbarkeit

| Phase | Parallelisierbar | Details |
|-------|------------------|---------|
| Phase 2 | Teilweise | Die meisten Tasks sind sequentiell (Setup-Reihenfolge wichtig) |
| Phase 3 | Nein | Token-Ebenen bauen aufeinander auf (Base → Semantic → Component) |
| Phase 4 | Ja (nach Tier 1) | Tier 2/3 Komponenten können parallel entwickelt werden |
| Phase 5 | Teilweise | Dokumentation kann parallel zur letzten Integration |

**Parallelisierbare Aufgaben in Phase 2:**
- 4 Example Apps (vue3-tailwind, vue3-css, vue2-tailwind, vue2-css)
- GitHub Workflows (unabhängig voneinander)
- LICENSE, README.md, CONTRIBUTING.md

**Sequentielle Abhängigkeiten in Phase 2:**
1. Vite + Vue 3 Projekt → vue-demi → Tailwind → Build-Pipeline
2. Vitest → Tests → Visual Regression
3. Package-Struktur → release-please → npm Publish Workflow

### Aufwandstreiber pro Komponente (Phase 4)

Jede Komponente durchläuft:

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  ANALYSE    │ → │    SPEC     │ → │   DEVELOP   │ → │     QA      │ → │  INTEGRATE  │
├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤
│ Bestehende  │   │ Props       │   │ Vue 3 Code  │   │ Unit Tests  │   │ In Webapp   │
│ Varianten   │   │ Events      │   │ TypeScript  │   │ Vue 2 Tests │   │ einbinden   │
│ analysieren │   │ Slots       │   │ Tailwind    │   │ A11y Tests  │   │             │
│             │   │ Tokens      │   │ Storybook    │   │ Visual Reg. │   │ Alte Komp.  │
│             │   │ A11y        │   │ Stories     │   │ 4 Examples  │   │ entfernen   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

**Aufwand variiert stark nach Komponente:**

| Komponente | Komplexität | Grund |
|------------|-------------|-------|
| OsIcon | Niedrig | Einfache Wrapper-Komponente |
| OsSpinner | Niedrig | Nur Animation + Größen |
| OsButton | Hoch | Viele Varianten, Link-Support, States |
| OsCard | Niedrig | Einfaches Layout |
| OsModal | Hoch | Teleport, Focus-Trap, Animations, A11y |
| OsDropdown | Hoch | Positioning, Click-Outside, Hover-States |
| OsInput | Mittel | Validierung, States, Icons |
| OsAvatar | Niedrig | Bild + Fallback |


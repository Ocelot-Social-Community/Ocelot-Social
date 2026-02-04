# @ocelot-social/ui - Projektdokumentation

> Dieses Dokument dient als zentrale Planungs- und Statusübersicht für das UI-Library Subprojekt.
> Es ermöglicht das Pausieren und Wiederaufnehmen der Arbeit zu jedem Zeitpunkt.

---

## 1. Projektziel & Vision

**Kurzbeschreibung:**
Neue Vue 3 Komponentenbibliothek aufbauen, die später die Vue 2 Komponenten in der Webapp ersetzen soll.

**Hintergrund:**
- Bestehendes Projekt nutzt Vue 2.6 mit Nuxt 2 (Upgrade auf Vue 2.7 erforderlich)
- Existierender `styleguide` Ordner als Git-Submodul (Vue 2, Vue CLI 3)
- Design-Token-System mit Theo vorhanden
- Branding erfolgt über SCSS-Dateien mit Variablen-Overrides
- **Problem:** Viele doppelte Komponenten, inkonsistente Styles, nicht konsequent genutztes Design-System

**Vision:**
Ein stark definiertes und flexibles Design-System, das den Branding-Anforderungen von ocelot.social gerecht wird und eine saubere, schrittweise Migration von Vue 2 nach Vue 3 ermöglicht.

**Geplanter Ansatz:**
Migration vorbereiten - schrittweise neue Komponenten in Vue 3 entwickeln, die das bestehende Design-System respektieren und flexible Branding-Optionen bieten.

---

## 2. Tech-Stack

| Komponente | Entscheidung | Notizen |
|------------|--------------|---------|
| Framework | **Vue 3 + Vite** | Schnellstes Setup, modernes Tooling |
| Build-Tool | **Vite** | Schnelles HMR, einfache Konfiguration |
| Dokumentation | **Histoire** | Vite-native Storybook-Alternative |
| Styling | **Tailwind CSS** | Mit CSS Custom Properties für Branding |
| Testing | **Vitest** | Vite-nativ, Jest-kompatible API |
| Paket-Name | **@ocelot-social/ui** | Unter ocelot-social npm Org |
| Komponenten-Prefix | **Os** | OsButton, OsCard, etc. |
| Vue 2 Kompatibilität | **vue-demi** | Library funktioniert in Vue 2 und Vue 3 |
| Linting | **eslint-config-it4c** | Enthält: TypeScript, Vue, Prettier, weitere Regeln |
| Release | **release-please** | Automatische Versionen und Changelogs |
| Icons | **unplugin-icons** | Eigene SVGs + Icon-Libraries kombinierbar |
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
| TypeScript | **strict: true** | Strikte Typisierung |

---

## 3. Build & Distribution

### Dual-Build Strategie

Die Library bietet zwei Nutzungsmöglichkeiten:

```
@ocelot-social/ui
├── dist/
│   ├── index.js              # Vue Komponenten
│   ├── styles.css            # Vorkompilierte Styles (für Nicht-Tailwind)
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
import '@ocelot-social/ui/styles.css'
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

---

## 4. CI/CD & Release-Automatisierung

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
│  4. Automatisch: npm publish + Histoire deploy                  │
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
| **Publish** | Release created | npm publish + Histoire deploy |

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
| Release erstellt | Histoire build + deploy auf Server |

**Histoire Deploy (Webhook):**
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
| **build-histoire** | Push/PR | Histoire | Dokumentation bauen |
| **size-check** | Push/PR | size-limit | Bundle-Größe prüfen |
| **release** | Push main | release-please | Release-PR erstellen |
| **publish** | Release | npm | Auf npm veröffentlichen |
| **deploy-docs** | Release | Webhook | Histoire auf Server deployen |
| **check-ui-release** | Ocelot Release | Git | Prüft unreleased UI-Änderungen |

### Erweiterte Qualitätssicherung

| Maßnahme | Tool | Beschreibung |
|----------|------|--------------|
| **Visual Regression** | Playwright | Screenshot-Vergleiche bei Änderungen |
| **Accessibility** | axe-core + vitest-axe | Automatische A11y-Prüfung aller Komponenten |
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

## 5. Dokumentation & Developer Experience

### Histoire als Komponenten-Dokumentation

Die Komponenten werden über Histoire dokumentiert und auf einer öffentlichen Webseite für Entwickler zugänglich gemacht.

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
Komponente entwickeln → Histoire Story schreiben → Build → Deploy auf Server
```

---

## 6. Design-Token & Branding-Architektur

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

---

## 7. Migrationsstrategie

### Grundprinzipien

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATIONSSTRATEGIE                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Library vollständig in Vue 3 schreiben                      │
│  2. vue-demi für Vue 2 Kompatibilität                           │
│  3. Komponente für Komponente migrieren                         │
│  4. Jede Komponente: vollständig getestet + in Histoire         │
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
│ identifiz.   │    │ Zustände     │    │ Histoire     │    │ Visual Regr. │    │ einbinden    │
│ Duplikate    │    │ A11y         │    │ Stories      │    │ A11y Check   │    │              │
│ finden       │    │ Tokens       │    │              │    │ Review       │    │ Alte Komp.   │
│              │    │              │    │              │    │              │    │ entfernen    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Komponenten-Protokoll

Pro Komponente wird eine Dokumentationsdatei geführt:

```
packages/ui/docs/components/OsButton.md
```

**Inhalt:**
- Ursprung (Webapp/Styleguide/Beide)
- Zusammengeführte Komponenten (falls vorhanden)
- Entscheidungen und Begründungen
- Abweichungen von Original
- Migration History

### Qualitätsanforderungen pro Komponente

| Anforderung | Beschreibung |
|-------------|--------------|
| **Vollständig getestet** | Unit-Tests für alle Props, Varianten, Edge-Cases |
| **Histoire Stories** | Alle Varianten und Zustände dokumentiert |
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

## 8. Meilensteine

### Phase 0: Analyse & Katalogisierung
- [ ] Vollständige Katalogisierung Webapp-Komponenten (siehe KATALOG.md)
- [ ] Vollständige Katalogisierung Styleguide-Komponenten (siehe KATALOG.md)
- [ ] Duplikate identifizieren und dokumentieren
- [ ] Inkonsistenzen und Probleme erfassen
- [ ] Konsolidierungsplan erstellen
- [ ] Priorisierung der zu migrierenden Komponenten

### Phase 0.5: Vue 2.7 Upgrade
- [ ] Vue 2.6 → Vue 2.7 Upgrade in Webapp
- [ ] Abhängigkeiten aktualisieren
- [ ] Tests durchführen
- [ ] Regressionstests

### Phase 1: Projekt-Setup
- [ ] Vite + Vue 3 Projekt initialisieren
- [ ] vue-demi einrichten für Vue 2 Kompatibilität
- [ ] Tailwind CSS einrichten
- [ ] Dual-Build konfigurieren (Tailwind Preset + vorkompilierte CSS)
- [ ] unplugin-icons einrichten
- [ ] CSS Custom Properties Token-System aufsetzen
- [ ] Dark Mode Grundstruktur
- [ ] Histoire für Dokumentation einrichten
- [ ] Vitest konfigurieren
- [ ] eslint-config-it4c einrichten (inkl. TypeScript, Vue, Prettier)
- [ ] npm Package-Struktur (@ocelot-social/ui)
- [ ] Build-Pipeline für Vue 2/3 Dual-Support
- [ ] GitHub Workflows einrichten (Lint, Test, Build)
- [ ] Visual Regression Tests einrichten (Playwright)
- [ ] Accessibility Tests einrichten (axe-core)
- [ ] Bundle Size Check einrichten (size-limit)
- [ ] release-please Manifest-Konfiguration
- [ ] npm Publish Workflow
- [ ] Histoire Deploy Workflow
- [ ] LICENSE Datei (Apache 2.0)

### Phase 2: Token-System & Basis
- [ ] Base Tokens definieren (Farben, Spacing, Typography)
- [ ] Semantic Tokens definieren
- [ ] Component Tokens definieren
- [ ] Branding-System implementieren (CSS Variables)
- [ ] Beispiel-Branding erstellen (Standard + Yunite)
- [ ] Token-Dokumentation in Histoire

### Phase 3: Komponenten-Migration
- [ ] _Komponenten werden nach Analyse-Ergebnis priorisiert_
- [ ] _Für jede Komponente: Spec → Develop → Test → Integrate_
- [ ] _Liste wird in Phase 0 erstellt_

### Phase 4: Finalisierung
- [ ] Alle Komponenten migriert und getestet
- [ ] Alte Komponenten aus Vue 2 Projekt entfernt
- [ ] Build als npm Library verifiziert
- [ ] Dokumentation vollständig

---

## 9. Fortschritt

### Gesamtprojekt
```
Phase 0:   ░░░░░░░░░░  0% (0/6 Aufgaben)
Phase 0.5: ░░░░░░░░░░  0% (0/4 Aufgaben)
Phase 1:   ░░░░░░░░░░  0% (0/19 Aufgaben)
Phase 2:   ░░░░░░░░░░  0% (0/6 Aufgaben)
Phase 3:   ░░░░░░░░░░  0% (0/? Komponenten)
Phase 4:   ░░░░░░░░░░  0% (0/4 Aufgaben)
───────────────────────────────────────
Gesamt:    ░░░░░░░░░░  0%
```

### Katalogisierung (Details in KATALOG.md)
```
Webapp:     ░░░░░░░░░░  0% (0/? Komponenten)
Styleguide: ░░░░░░░░░░  0% (0/? Komponenten)
```

### Komponenten-Migration
```
Analysiert:  0
Spezifiziert: 0
Entwickelt:   0
QA bestanden: 0
Integriert:   0
```

---

## 10. Aktueller Stand

**Letzte Aktualisierung:** 2026-02-04

**Aktuelle Phase:** Planung abgeschlossen → Phase 0 (Analyse) steht bevor

**Zuletzt abgeschlossen:**
- [x] Projektordner erstellt
- [x] Planungsdokument erstellt
- [x] Tech-Stack entschieden
- [x] Branding-Architektur definiert
- [x] Migrationsstrategie definiert

**Aktuell in Arbeit:**
- Entscheidungen finalisieren

**Nächste Schritte:**
1. Phase 0: Komponenten-Analyse starten
2. Phase 1: Projekt-Setup

---

## 11. Entscheidungen

| # | Frage | Entscheidung | Begründung |
|---|-------|--------------|------------|
| 1 | Hauptziel | Migration vorbereiten | Schrittweise Vue 2 → Vue 3 |
| 2 | Framework | Vue 3 + Vite | Modern, schnell, gute DX |
| 3 | Dokumentation | Histoire | Vite-nativ, schneller als Storybook |
| 4 | Styling | Tailwind + CSS Variables | Modern + Branding-kompatibel |
| 5 | Token-System | 3-Stufen (Base/Semantic/Component) | Maximale Branding-Flexibilität |
| 6 | Testing | Vitest | Vite-nativ, Jest-kompatibel |
| 7 | Komponenten-Reihenfolge | Nach Bedarf | Flexibel, Token-System zuerst |
| 8 | Paket-Format | npm Library | Wiederverwendbar |
| 9 | Vue 2 Kompatibilität | vue-demi | Library funktioniert in beiden Vue-Versionen |
| 10 | Migrations-Ablauf | Komponente für Komponente | Kontrolliert, schrittweise |
| 11 | Vor-Analyse | Vollständige Analyse | Duplikate/Probleme vor Migration identifizieren |
| 12 | Spezifikation | Detailliert vor Implementierung | Props, Varianten, A11y vorher definieren |
| 13 | Doku-Hosting | Eigener Server | Öffentlich zugängliche Komponenten-Doku |
| 14 | Doku-Zugang | Öffentlich | Für alle Entwickler frei zugänglich |
| 15 | Release-Tool | release-please (Manifest) | Monorepo-kompatibel, nur styleguide-vue3 Änderungen |
| 16 | Linting | eslint-config-it4c | TypeScript + Vue + Prettier + weitere Regeln |
| 17 | CI Workflows | Lint, Test, Build | Qualitätssicherung bei jedem PR |
| 18 | npm Publish | Automatisch bei Release | Nach release-please PR merge |
| 19 | Doku-Deploy | Automatisch bei Release | Histoire build + deploy |
| 20 | Visual Regression | Playwright Screenshots | Visueller Vergleich bei Änderungen |
| 21 | Accessibility | axe-core + vitest-axe | Automatische A11y-Prüfung |
| 22 | Bundle Size | size-limit | Warnung bei Größenüberschreitung |
| 23 | Feature Parity | Checkliste pro Komponente | Sicherstellen dass alle Features migriert |
| 24 | Deprecation Warnings | Console Warnings | Hinweise in alter Codebase |
| 25 | Paket-Name | @ocelot-social/ui | Unter ocelot-social npm Org |
| 26 | Komponenten-Prefix | Os | OsButton, OsCard, etc. |
| 27 | Browser-Support | Modern only | Letzte 2 Versionen von Chrome, Firefox, Safari, Edge |
| 28 | SSR | Ja | Nuxt-kompatibel |
| 29 | Dark Mode | Ja, von Anfang an | Alle Komponenten mit Light/Dark |
| 30 | Icons | unplugin-icons | Eigene SVGs + Icon-Libraries kombinierbar |
| 31 | Build-Strategie | Dual-Build | Tailwind Preset + Vorkompilierte CSS |
| 32 | Lizenz | Apache 2.0 | Permissiv mit Patent-Schutz |
| 33 | Repository | Monorepo | Ocelot-Social/packages/ui/ |
| 34 | Vue API | `<script setup>` | Composition API mit script setup |
| 35 | Sprache | Englisch | Code, Comments, Docs |
| 36 | Package Manager | npm | Bereits im Projekt verwendet |
| 37 | Test Coverage | 100% | Vollständige Testabdeckung |
| 38 | Dateinamen | PascalCase | OsButton.vue, OsCard.vue |
| 39 | i18n | Nur Props | Keine Default-Texte in Komponenten |
| 40 | Breakpoints | Tailwind Standard | sm, md, lg, xl, 2xl |
| 41 | TypeScript | strict: true | Strikte Typisierung |
| 42 | Ordnerstruktur | packages/ui | Monorepo-Standard, erweiterbar |
| 43 | Vue 2 Minimum | Vue 2.7 | Erforderlich für `<script setup>` Support |
| 44 | Dev-Linking | Nuxt Alias | LOCAL_UI=true für lokale Library |
| 45 | Release-Check | Git-basiert | Prüft unreleased UI-Änderungen vor Ocelot-Release |
| 46 | Histoire Deploy | Webhook + Script | Server zieht und baut bei Release |
| 47 | Komponenten-Protokoll | Markdown pro Komponente | docs/components/OsButton.md |
| 48 | Katalogisierung | KATALOG.md | Unterbrechbar, Webapp + Styleguide |
| 49 | Fortschritt | Berechenbar | Pro Phase und Gesamt |
| 50 | GitHub Workflows | 12 Workflows | Vollständige CI/CD Pipeline |

---

## 12. Arbeitsprotokoll

| Datum | Beschreibung | Ergebnis |
|-------|--------------|----------|
| 2026-02-04 | Projektstart | Ordner und Planungsdokument erstellt |
| 2026-02-04 | Tech-Stack Entscheidungen | Alle Kernentscheidungen getroffen |
| 2026-02-04 | Migrationsstrategie | vue-demi, Komponente-für-Komponente, Analyse-First |
| 2026-02-04 | Dokumentation | Histoire auf eigenem Server, öffentlich zugänglich |
| 2026-02-04 | CI/CD & Release | release-please, GitHub Workflows, automatisches npm publish |
| 2026-02-04 | Erweiterte QA | Visual Regression, A11y Tests, Bundle Size Check |
| 2026-02-04 | Migrations-Absicherung | Feature Parity Checklist, Deprecation Warnings |
| 2026-02-04 | Naming & Paket | @ocelot-social/ui, Os-Prefix |
| 2026-02-04 | Plattform | Modern Browsers, SSR-kompatibel, Dark Mode |
| 2026-02-04 | Build & Icons | Dual-Build (Tailwind + CSS), unplugin-icons |
| 2026-02-04 | Organisatorisch | Apache 2.0, bleibt im Monorepo |
| 2026-02-04 | Konventionen | script setup, Englisch, npm, 100% Coverage, PascalCase |
| 2026-02-04 | Weitere | Nur Props (kein i18n), Tailwind Breakpoints, strict TS |
| 2026-02-04 | Ordnerstruktur | packages/ui statt styleguide-vue3 |
| 2026-02-04 | Konfliktanalyse | Vue 2.7 Upgrade als Voraussetzung für script setup |
| 2026-02-04 | Webapp-Integration | Nuxt Alias für lokale Entwicklung, Git-basierter Release-Check |
| 2026-02-04 | Prozesse | QA-Schritt pro Komponente, Komponenten-Protokoll, KATALOG.md |
| 2026-02-04 | Fortschritt | Berechenbar für Gesamt und Einzelschritte |

---

## 13. Komponenten-Katalog

> **Detaillierte Katalogisierung in separater Datei: [KATALOG.md](./KATALOG.md)**

### Zusammenfassung (wird automatisch aus KATALOG.md übernommen)

| Quelle | Gesamt | Analysiert | Duplikate | Zu migrieren |
|--------|--------|------------|-----------|--------------|
| Webapp | ~60+ | 0 | 0 | ? |
| Styleguide | ~15 | 0 | 0 | ? |
| **Gesamt** | **~75+** | **0** | **0** | **?** |

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
- Komponenten-Docs: `./docs/components/`

**Dokumentation:**
- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Histoire](https://histoire.dev/)
- [Vitest](https://vitest.dev/)
- [vue-demi](https://github.com/vueuse/vue-demi)
- [unplugin-icons](https://github.com/unplugin/unplugin-icons)

---

## Wie dieses Dokument verwendet wird

**Zum Fortsetzen der Arbeit:**
> "Lass uns am @ocelot-social/ui Projekt weiterarbeiten" (packages/ui)

**Nach jeder Session aktualisieren:**
- Abschnitt 9: "Fortschritt"
- Abschnitt 10: "Aktueller Stand"
- Abschnitt 12: "Arbeitsprotokoll"
- KATALOG.md (ab Phase 0)
- Meilenstein-Checklisten in Abschnitt 8

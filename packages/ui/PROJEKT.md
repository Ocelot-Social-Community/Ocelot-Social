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
| 16a | [Webapp ↔ Maintenance Code-Sharing](#16a-webapp--maintenance-code-sharing) |
| 16b | [Daten-Entkopplung (ViewModel/Mapper)](#16b-daten-entkopplung-viewmodelmapper-pattern) |
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
Phase 3: ██████████ 100% (24/24 Aufgaben) ✅ - Webapp-Integration komplett
Phase 4: █░░░░░░░░░   6% (1/17 Aufgaben) - OsButton ✅
Phase 5: ░░░░░░░░░░   0% (0/7 Aufgaben)
───────────────────────────────────────
Gesamt:  ████████░░  74% (63/86 Aufgaben)
```

### Katalogisierung (Details in KATALOG.md)
```
Webapp:     ██████████ 100% (139 Komponenten erfasst)
Styleguide: ██████████ 100% (38 Komponenten erfasst)
Analyse:    ██████████ 100% (Button, Modal, Menu detailiert)
```

### OsButton Migration (Phase 3) ✅
```
Scope gesamt:     133 <os-button> Tags in 79 Webapp-Dateien
├─ Migriert:       133 Buttons (100%) ✅
├─ <base-button>:    0 verbleibend in Templates
├─ <ds-button>:      0 verbleibend in Templates
└─ Cleanup:        Snapshots/Tests müssen aktualisiert werden

OsButton Features:
├─ variant:     ✅ primary, secondary, danger, warning, success, info, default
├─ appearance:  ✅ filled, outline, ghost
├─ size:        ✅ sm, md, lg, xl
├─ disabled:    ✅ mit hover/active-Override
├─ icon:        ✅ slot-basiert (icon-system-agnostisch)
├─ circle:      ✅ rounded-full, größenabhängig (p-1.5 bis p-3)
└─ loading:     ✅ animated SVG spinner, aria-busy (Milestone 4b)
```

---

## Aktueller Stand

**Letzte Aktualisierung:** 2026-02-13 (Session 19)

**Aktuelle Phase:** Phase 3 ✅ ABGESCHLOSSEN + Code-Review-Feedback eingearbeitet

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
  - Storybook 10 für Dokumentation eingerichtet (Wasserfarben-Theme)
  - OsButton.stories.ts mit Playground + allen Varianten/Appearances/Sizes
  - Storybook Build-Konfiguration (viteFinal entfernt Library-Plugins)
  - Docker Setup (Dockerfile, docker-compose, ui-docker.yml)
  - Visual Regression Tests (Playwright, colocated) mit integriertem A11y-Check
  - Completeness Check (verify Script prüft Story, Visual, checkA11y, Keyboard, Varianten)
  - ESLint Plugins: vuejs-accessibility, playwright, storybook, jsdoc

**Zuvor abgeschlossen (Session 18 - CodeRabbit Review Feedback: data-test Selektoren, Accessibility, Bugfixes):**
- [x] Cypress-Selektoren: `.user-content-menu button` → `[data-test="content-menu-button"]` (2 Step-Definitions)
- [x] Cypress-Selektoren: `.content-menu button` → `[data-test="content-menu-button"]` (Admin.PinPost + ReportContent)
- [x] muted-users.vue: `data-test="unmute-btn"` + `aria-label` auf Unmute-Button
- [x] blocked-users.vue: `data-test="unblock-btn"` + `aria-label` auf Unblock-Button
- [x] ProfileList.vue: `data-test="load-all-connections-btn"` + FollowList.spec.js Selektoren aktualisiert
- [x] FollowButton.vue: `data-test="follow-btn"` + Spec-Selektoren aktualisiert
- [x] JoinLeaveButton.vue: `data-test="join-leave-btn"` + `.native` von `@mouseenter`/`@mouseleave` entfernt
- [x] LoginButton.vue: `data-test="login-btn"` + `aria-label="$t('login.login')"` + Spec-Selektoren aktualisiert
- [x] ReportRow.spec.js: `button[data-variant="danger"]` → `[data-test="confirm"]`
- [x] CtaJoinLeaveGroup.spec.js: Selektor auf `[data-test="join-leave-btn"]` aktualisiert
- [x] DisableModal.vue: `finally { this.loading = false }` für Loading-State-Reset
- [x] ReleaseModal.vue: `:loading="loading"` + `this.loading = true` + `finally { this.loading = false }`
- [x] ChangePassword.vue: `:disabled="errors"` → `:disabled="!!errors"` (Boolean-Cast)
- [x] Password/Change.vue: Unbenutzte `disabled: true` aus data() entfernt + 2 tote Tests entfernt
- [x] MenuBar.vue: Unbenutztes `ref="linkButton"` entfernt
- [x] GroupForm.vue: Cancel-Button `variant="default" appearance="filled"` (per User-Anweisung)
- [x] `appearance="filled"` ergänzt: donations.vue, LoginForm.vue, EnterNonce.vue
- [x] LoginForm.vue: CSS `.login-form button` → `.login-form button[type='submit']`
- [x] pages/index.vue: Redundantes `class="my-filter-button"` von `<base-icon>` entfernt
- [x] MySomethingList.vue: `:title` + `:aria-label` auf Edit/Delete-Buttons (Tooltip beibehalten)
- [x] A11y aria-label auf icon-only Buttons: admin/users (search + edit), AddChatRoomByUserSearch (close), EmbedComponent (close), groups/index (create), profile/_id/_slug (new post), groups/_id/_slug (new post), CustomButton (2x tooltip), HeaderMenu (hamburger), ImageUploader (crop-cancel), ContentMenu (menu), HeaderButton (filter-remove), InviteButton (invite)
- [x] post/_id/_slug/index.vue: Zustandsabhängiges `aria-label` (`post.sensitiveContent.show/hide`)
- [x] ComponentSlider.vue: `aria-label` mit Interpolation (`component-slider.step`)
- [x] i18n: `actions.search`, `actions.close`, `actions.menu` in allen 9 Sprachdateien
- [x] i18n: `site.navigation` in allen 9 Sprachdateien
- [x] i18n: `post.sensitiveContent.show/hide` in allen 9 Sprachdateien
- [x] i18n: `component-slider.step` in allen 9 Sprachdateien

**Zuletzt abgeschlossen (Session 19 - CodeRabbit Review Feedback: Cleanup, Accessibility, Bugfixes):**
- [x] donations.vue: Redundantes `:checked="showDonations"` entfernt (v-model setzt checked bereits)
- [x] MySomethingList.vue: Disabled-Logik vereinfacht `!(!isEditing || (isEditing && !disabled))` → `isEditing && disabled`
- [x] button.variants.ts: Hardcoded Fallback `#e5e3e8` entfernt → `var(--color-disabled)` (konsistent mit filled/index.css)
- [x] CommentCard.vue: `aria-label` auf icon-only Reply-Button
- [x] HashtagsFilter.vue: `aria-label` auf icon-only Clear-Button
- [x] ReleaseModal.vue: `$emit('close')` im catch-Block ergänzt (fehlte im Fehlerfall)
- [x] Chat.vue: `aria-label` auf Expand- und Close-Buttons
- [x] i18n: `chat.expandChat` + `chat.closeChat` in allen 9 Sprachdateien (vollständig übersetzt)
- [x] ChatNotificationMenu.vue: `aria-label` auf icon-only Chat-Button
- [x] SearchableInput.vue: `aria-label` auf icon-only Close-Button
- [x] GroupButton.vue: `aria-label` auf icon-only Groups-Button
- [x] MapButton.vue: `aria-label` auf icon-only Map-Button
- [x] EmotionButton.vue: `aria-label` auf icon-only Emoji-Button (`<label for>` wirkt nicht auf `<button>`)
- [x] ImageUploader.vue: `aria-label` auf icon-only Delete-Button
- [x] i18n: `actions.clear` disambiguiert — es: "Borrar" → "Limpiar", it: "Cancella" → "Svuota" (Verwechslung mit `actions.delete`)
- [x] OsButton.vue: `as string` Cast bei `attrClass` entfernt (cn/clsx verarbeitet Arrays/Objekte korrekt)
- [x] CommentForm.vue: `handleSubmit` auf async/await + try/catch/finally umgestellt (Loading-Bug im Fehlerfall behoben)
- [x] MenuBar.vue: `aria-label` auf alle 11 Editor-Toolbar-Buttons (nutzt bestehende `editor.legend.*` Keys)
- [x] NotificationMenu.vue: `aria-label` auf alle 3 Bell-Buttons
- [x] NotificationMenu.vue: `counter-icon` von Default-Slot in `#icon`-Slot verschoben (2 Stellen, Rendering-Bug)
- [x] ChatNotificationMenu.vue: `counter-icon` von Default-Slot in `#icon`-Slot verschoben (Rendering-Bug)
- [x] InviteButton.vue: `this.currentUser` → `this.user` (Bug: Getter hieß `user`, `currentUser` war undefined)
- [x] pages/index.vue: `beforeDestroy()` aus `methods` in Lifecycle-Hook verschoben (Memory-Leak: Event-Listener wurden nie entfernt)
- [x] Editor.vue: Fehlender `else`-Branch in `toggleLinkInput()` — `isLinkInputActive` wird jetzt auch bei no-args-Aufrufen (blur/esc) zurückgesetzt
- [x] admin/users/index.vue: Veraltete Slot-Syntax `slot="role" slot-scope="scope"` → `#role="scope"` (Vue 3)
- [x] settings/index.vue: Irreführender Komponentenname `NewsFeed` → `Settings`
- [x] FilterMenu.spec.js: Typo `dropdwon` → `dropdown` im Testnamen
- [x] ImageUploader.vue: `:title` auf Crop-Cancel-Button ergänzt (konsistent mit Delete-Button)
- [x] OsButton.spec.ts: `as const` auf `sizes`-Objekt statt Type-Cast bei jedem `mount`-Aufruf
- [x] CommentForm.vue: `disabled = false` aus `finally` in `catch` verschoben (verhindert Überschreiben nach `clear()`)
- [x] FilterMenu.vue: `aria-label` auf icon-only Filter-Button
- [x] ContextMenu.vue: `this.menu.show()` nur bei `type !== 'link'` (Link-Menüs öffneten sich sofort statt auf Klick zu warten)
- [x] ContextMenu.vue: `this.menu = null` vor `destroy()` (Race-Condition: ESC + blur feuerten doppelt → removeChild-Error)
- [x] CustomButton.vue: `variant="primary"` auf beide `os-button`-Instanzen (Konsistenz mit restlicher Codebase)
- [x] Invitation.vue: Ungenutztes Argument `inviteCode.copy` bei `copyInviteCode()` entfernt
- [x] CtaUnblockAuthor.vue: `appearance="filled"` explizit gesetzt (fehlte als einziger primärer CTA)
- [x] HeaderMenu.vue: `beforeDestroy`-Hook ergänzt — Scroll-Listener wird jetzt entfernt (Memory-Leak)
- [x] MenuLegend.vue: `variant="primary"` auf Trigger-Button (konsistent mit Toolbar-Buttons in MenuBar.vue)

**Zuvor abgeschlossen (Session 18 - Code-Review Feedback, OsButton Refactoring, Accessibility):**
- [x] OsButton.vue vereinfacht: `vueAttrs()` Helper, Einmal-Variablen durch `cn()` ersetzt, `children` Array inline (217→227 Zeilen, aber lesbarer)
- [x] OsButton: `@import "./animations.css"` vor `@source`-Direktiven verschoben (CSS-Spec-Konformität)
- [x] CustomButton.vue: `isEmpty` aus `data()` entfernt → direkter Import im Computed
- [x] notifications.spec.js: Doppelten `beforeEach` konsolidiert, `wrapper` in `describe`-Block verschoben
- [x] MenuLegend.vue: `<style scoped>` hinzugefügt (verhindert Style-Leaking generischer Klassennamen)
- [x] LocationSelect: `data-test="clear-location-button"` + spezifischerer Selektor im Spec
- [x] HashtagsFilter: `data-test="clear-search-button"` + spezifischerer Selektor im Spec
- [x] FollowButton.vue: `.native` Modifier von `@mouseenter`/`@mouseleave` entfernt (Vue 3 Kompatibilität)
- [x] MapButton.vue: Icon in `<template #icon>` verschoben + redundantes Inline-Style entfernt
- [x] MySomethingList.vue: Unbenutzte `.icon-button` CSS-Klasse entfernt
- [x] PaginationButtons.vue: Hardcoded `aria-label` → `$t('pagination.previous/next')` (i18n)
- [x] `pagination.previous/next` in allen 9 Sprachdateien angelegt
- [x] GroupContentMenu.vue: `aria-label` via `$t('group.contentMenu.menuButton')` für icon-only Button
- [x] `group.contentMenu.menuButton` in allen 9 Sprachdateien angelegt
- [x] FilterMenu.vue: Veraltete `slot="default"` + `slot-scope` → `<template #default="{ toggleMenu }">` (Vue 3)
- [x] HashtagsFilter.vue: `this.$t()` → `$t()` im Template (Vue 3 Kompatibilität)
- [x] DisableModal.vue: `appearance="filled"` + `:loading="loading"` auf Danger-Button
- [x] DeleteUserModal.vue: `appearance="filled"` + `:loading="loading"` auf Danger-Button
- [x] my-email-address/index.vue: `loadingData` State + `:loading` auf Submit-Button + `finally` Block
- [x] ReportModal.vue: `class="report-modal"` + CSS-Selektoren mit Prefix (verhindert globales Style-Leaking)
- [x] DeleteUserModal.vue: CSS-Selektoren mit `.delete-user-modal` Prefix (verhindert globales Style-Leaking)
- [x] Button-Wrapper-Analyse: GroupButton + MapButton als Kandidaten zum Inlining identifiziert (nur 1 Nutzungsort, keine Logik)

**Zuvor abgeschlossen (Session 16 - Bugfixes, Code-Review, letzte ds-button Migration):**
- [x] Password/Change.vue: `!!errors` Fix für disabled-Prop
- [x] CommentForm.vue: `type="submit"` + `!!errors` Fix
- [x] GroupForm.vue: Letzter `<ds-button>` → `<os-button>` migriert (save/update mit icon)
- [x] OsButton.spec.ts: TypeScript-Fix für size-Prop Union Type
- [x] OsButton.vue: v8 ignore Coverage-Fixes (100% Branch Coverage)
- [x] 0 `<ds-button>` und 0 `<base-button>` in Webapp-Templates verbleibend
- [x] `data-variant` Attribut auf OsButton (konsistent mit `data-appearance`, CSS-Selektor-Support)
- [x] notifications.spec.js: `wrapper.find()` → Testing Library `screen.getByText()` (war Vue Test Utils API)
- [x] FilterMenu.vue: Dynamische `:appearance="filterActive ? 'filled' : 'ghost'"` (Regressionsbug)
- [x] FilterMenu.spec.js: `data-appearance="filled"` statt CSS-Klasse `--filled`
- [x] CtaUnblockAuthor.vue: `require` → `required` Typo-Fix
- [x] LocationSelect.vue: `clearLocationName()` direkt via `this.currentValue` statt `event.target.value`
- [x] LocationSelect.vue: `@click.native` → `@click` (Vue 3 Kompatibilität)
- [x] LocationSelect.vue: `aria-label` via `$t('actions.clear')` (i18n)
- [x] `actions.clear` in allen 9 Sprachdateien angelegt (en, de, fr, es, it, nl, pl, pt, ru)
- [x] OsButton: JSDoc-Dokumentation für Slots (`@slot default`, `@slot icon`)
- [x] OsButton: `isSmall` von `['xs', 'sm']` auf `size === 'sm'` vereinfacht (xs existiert nicht)
- [x] OsButton: Strikte Typisierung `Record<Size, ...>` statt `Record<string, ...>` für Lookup-Maps
- [x] animations.css: Stylelint-konforme Formatierung (eine Deklaration pro Zeile)

**Zuvor abgeschlossen (Session 15 - Milestone 4c komplett):**
- [x] **Alle verbleibenden base-button Instanzen migriert** (132 os-button Tags, 0 base-button verbleibend)
- [x] 59 Buttons in dieser Session migriert (Chat, Filter, Modals, Forms, Pages, etc.)
- [x] `type="submit"` für alle Form-Buttons (OsButton default ist `type="button"`)
- [x] `!!errors` Boolean-Cast für disabled-Props (errors ist Objekt, nicht Boolean)
- [x] CSS-Selektoren `.base-button` → `> button` oder `button` angepasst
- [x] `!important` für CSS-Positioning (überschreibt Tailwind-Klassen)
- [x] Disabled outline border-color Fix (`var(--color-disabled-border,#e5e3e8)`)
- [x] ComponentSlider Selection-Dots: dynamic appearance + 18px custom CSS
- [x] pages/index.vue FAB: `size="xl"` + position/dimension `!important`
- [x] pages/groups FAB: `size="xl"` + box-shadow `!important`
- [x] ReportModal Breite auf 700px beibehalten
- [x] ContributionForm Submit: `type="submit"` + `!!errors` Fix
- [x] my-email-address/index.vue: `!!errors` Fix

**Zuvor abgeschlossen (Session 14 - Loading Prop, Circle Prop, Code-Optimierung):**
- [x] `loading` Prop mit animiertem SVG-Spinner implementiert
- [x] Spinner-Architektur: Beide Animationen (rotate + dash) auf `<circle>` Element (Chrome-Compositing-Bug-Workaround)
- [x] Spinner zentriert auf Icon (Icon-Buttons) oder Button-Container (Text-Only-Buttons)
- [x] Icon bleibt bei loading sichtbar, Spinner überlagert Icon-Bereich
- [x] `aria-busy="true"` für Screenreader bei loading
- [x] `circle` Prop implementiert (rounded-full, größenabhängige Breiten)
- [x] `min-width` pro Größe hinzugefügt (verhindert zu kleine leere Buttons)
- [x] Animations-Keyframes in `animations.css` ausgelagert (wiederverwendbar)
- [x] Code-Optimierung: OsButton von ~250 auf 207 Zeilen vereinfacht
  - `buttonData` Objekt für Vue 2/3 geteilt
  - `SPINNER_PX` vereinfacht (Tuple → einfache Zahlen)
  - Redundante `cn()` Wrapping entfernt
  - `getCurrentInstance()` nur bei Vue 2 aufgerufen
- [x] 76 Unit-Tests (5 neue: default type, data-appearance, min-w, icon-only loading, circle gap)
- [x] Loading-Stories in Storybook (alle Varianten × Appearances)
- [x] Visual Tests mit `animationPlayState = 'paused'` für stabile Screenshots
- [x] PaginationButtons.vue migriert (2 circle icon-only Buttons)

**Zuvor abgeschlossen (Session 13 - Icon-Slot, Storybook Playground, Webapp-Migration):**
- [x] Icon-Slot für OsButton implementiert (slot-basiert, icon-system-agnostisch)
- [x] Render-Funktion: `slots.icon?.()` → `<span class="os-button__icon">` Wrapper
- [x] Tailwind-Klassen direkt auf Icon-Wrapper (kein custom CSS in index.css nötig)
- [x] VNode-basierte Text-Erkennung: Whitespace-only = icon-only (gap/margin-Logik)
- [x] Storybook: 4 neue Stories (Icon, IconOnly, IconSizes, IconAppearances)
- [x] Playground: Reaktiver Icon-Selektor (none/check/close/plus) + Label-Text-Control
- [x] Visual Tests: 4 neue Tests mit Screenshots + a11y-Checks
- [x] Unit Tests: 8 neue Tests (icon slot, keyboard a11y mit aria-label)
- [x] Erste Webapp-Migration mit Icon: `my-email-address/index.vue` (Save-Button mit check-Icon)
- [x] Code-Optimierung: ICON_CLASS Konstante, iconMargin Variable, vereinfachte hasText-Logik
- [x] Größenabhängiger Gap: `gap-1` für xs/sm, `gap-2` für md/lg/xl
- [x] Größenabhängiger Icon-Margin: kein negativer Margin bei xs/sm (mehr Abstand zur Button-Grenze)
- [x] 6 weitere Buttons mit Icon migriert: DisableModal, DeleteUserModal, CtaUnblockAuthor, LocationSelect, CategoriesSelect, profile Chat
- [x] verify.vue hat keinen Button (Eintrag korrigiert)

**Zuvor abgeschlossen (Session 12 - CSS-Linting, CI-Optimierung, Code-Review Fixes):**
- [x] CSS-Linting: `@eslint/css` + `tailwind-csstree` für Tailwind v4 Syntax-Support
- [x] `excludeCSS()` Helper: JS-Regeln von CSS-Dateien fernhalten (language-Inkompatibilität)
- [x] CSS-Regeln: `no-empty-blocks`, `no-duplicate-imports`, `no-invalid-at-rules`
- [x] CI-Workflow-Trigger optimiert: 9 UI-Workflows von `on: push` auf Branch+Path-Filter (`master`, `packages/ui/**`)
- [x] `custom-class` → `class` Migration: 4 Stellen in 3 Webapp-Dateien (notifications, MapStylesButtons, EmbedComponent)
- [x] Vue 3 Template-Fix: `this.$t()` → `$t()` in CommentCard.vue (Zeile 5 + 58)
- [x] Pre-existing Fix: `async` Arrow-Function in OsButton.visual.spec.ts

**Zuvor abgeschlossen (Session 11 - Storybook & Code-Review Fixes):**
- [x] Wasserfarben-Farbschema für Storybook (Ultramarin, Dioxazin-Violett, Alizarin, Ocker, Viridian, Cöruleum)
- [x] Stories erweitert: Playground (interaktive Controls), alle Varianten in allen Stories
- [x] Einzelne Stories (Primary, Secondary, Danger, Default) durch AllVariants ersetzt
- [x] AllAppearances zeigt alle 7 Varianten × 3 Appearances
- [x] Einheitlicher Border (0.8px) über alle Appearances (kein Layout-Shift mehr)
- [x] WCAG 2.4.7 Fix: Default-Variante hat jetzt `focus:outline-dashed focus:outline-current`
- [x] Keyboard Accessibility Test: prüft Focus-Indikator auf allen Buttons im Browser
- [x] `data-appearance` Attribut: robuste CSS-Selektoren statt fragile escaped Tailwind-Klassen
- [x] Code-Review Feedback eingearbeitet (Unit-Tests, Testnamen, CSS-Selektoren)

**Zuvor abgeschlossen (Milestone 5 + Analyse):**
- [x] Visuelle Validierung: 16/16 Buttons validiert ✅
- [x] OsButton Features: `appearance` (outline, ghost), `xs` size, focus/active states
- [x] Disabled-Styles: CSS-Variablen, hover/active-Override, Border-Fix
- [x] Codebase-Analyse: 14 weitere migrierbare Buttons identifiziert (Scope: 16/35)

**Zuletzt erledigt (Phase 3):**
- [x] vue-demi zur Webapp hinzugefügt (Vue 2.7 Kompatibilität)
- [x] Webpack-Alias für vue-demi (nutzt Webapp's Vue 2.7 statt UI-Library's Vue 3)
- [x] Webpack-Alias für @ocelot-social/ui (dist Pfade mit $ für exakten Match)
- [x] OsButton mit isVue2 Render-Funktion (Vue 2: attrs-Objekt, Vue 3: flat props)
- [x] CSS-Reihenfolge angepasst (UI-Library nach Styleguide für korrekte Spezifität)
- [x] Manueller visueller Vergleich ✅
- [x] **Jest-Integration für vue-demi** ✅
  - Custom Mock (`test/__mocks__/@ocelot-social/ui.js`) statt direktem Import
  - Problem: Jest's moduleNameMapper greift nicht für verschachtelte requires in CJS
  - Problem: Jest lädt `vue.runtime.common.js` mit exports unter `default`
  - Lösung: Module._load Patch für vue-demi + defineComponent von Vue.default
  - Setup-File (`test/vueDemiSetup.js`) für Module._resolveFilename Patch
  - **979 Tests bestehen ✅**
- [x] Button-Variants an ds-button angepasst (font-semibold, rounded, box-shadow)
- [x] UserTeaserPopover.vue migriert (verwendet `<os-button>`)
- [x] **Docker Build für UI-Library** ✅
  - ui-library Stage in Dockerfile + Dockerfile.maintenance
  - COPY --from=ui-library ./app/ /packages/ui/
- [x] **CI-Kompatibilität** ✅
  - Relativer Pfad `file:../packages/ui` statt absolut `/packages/ui`
  - Funktioniert lokal, in CI und in Docker
- [x] **OsButton attrs/listeners Forwarding** ✅
  - getCurrentInstance() für $listeners Zugriff in Vue 2
  - inheritAttrs: false für manuelle Weiterleitung
  - Jest Mock um alle Composition API Funktionen erweitert
- [x] **16 Buttons migriert** (ohne icon/circle/loading) ✅
  - GroupForm.vue, EmbedComponent.vue, DonationInfo.vue, CommentCard.vue
  - MapStylesButtons.vue, GroupMember.vue, embeds.vue
  - notifications.vue, privacy.vue, terms-and-conditions-confirm.vue, UserTeaserPopover.vue
- [x] **Disabled-Styles korrigiert** ✅
  - CSS-Variablen `--color-disabled` und `--color-disabled-contrast` hinzugefügt
  - Filled-Buttons: Grauer Hintergrund statt opacity (wie buttonStates Mixin)
  - Outline/Ghost: Graue Border/Text
- [x] terms-and-conditions-confirm.vue: Read T&C Button → `appearance="outline" variant="primary"`
- [x] **Disabled:active/hover Spezifität** ✅
  - CSS-Regeln in index.css mit höherer Spezifität für disabled:hover und disabled:active
  - Button zeigt sofort disabled-Farben, auch wenn während :active disabled wird
- [x] notifications.vue: Check All + Uncheck All → `appearance="outline" variant="primary"`
- [x] embeds.vue: Allow All → `appearance="outline" variant="primary"`
- [x] **Disabled Border-Fix** ✅
  - CSS-Regeln in index.css: `border-style: solid` und `border-width: 0.8px` bei disabled
  - Verhindert Layout-Sprung wenn Button disabled wird

**Nächste Schritte:**
1. ~~Phase 0: Komponenten-Analyse~~ ✅
2. ~~Phase 1: Vue 2.7 Upgrade~~ ✅
3. ~~**Phase 2: Projekt-Setup**~~ ✅ ABGESCHLOSSEN
4. ~~**Phase 3: Webapp-Integration**~~ ✅ ABGESCHLOSSEN — 133 Buttons in 79 Dateien
   - [x] yarn link / Webpack-Alias in Webapp
   - [x] CSS-Variablen definieren (ocelot-ui-variables.scss)
   - [x] 16 Buttons migriert & validiert ✅
   - [x] Docker Build + CI-Kompatibilität
   - [x] **Milestone 4a:** 14 weitere Buttons (ohne neue Props) ✅
   - [x] **Milestone 4b:** icon/circle/loading Props implementieren ✅
   - [x] **Milestone 4c:** Alle verbleibenden Buttons migriert ✅
   - [x] **Code-Review Feedback:** Refactoring, A11y, Vue 3 Compat, CSS-Scoping ✅
5. **Nächstes:**
   - [ ] GroupButton + MapButton in HeaderMenu inlinen (keine eigene Komponente nötig)
   - [ ] `compat/` Verzeichnis in packages/ui anlegen (temporäre Migrations-Wrapper)
   - [ ] BaseIcon nach `compat/` verschieben (131 Nutzungen, Voraussetzung für weitere Migrationen)
   - [ ] Snapshots/Tests aktualisieren, BaseButton-Komponente ggf. entfernen

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
- [x] ESLint Plugins: vuejs-accessibility, playwright, storybook, jsdoc, @eslint/css
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

**Milestone 1: Library-Einbindung** ✅
- [x] @ocelot-social/ui in Webapp installieren (yarn link + Webpack-Alias)
- [x] vue-demi zur Webapp hinzugefügt (für Vue 2.7 Kompatibilität)
- [x] Webpack-Alias für vue-demi (nutzt Webapp's Vue 2.7)
- [x] Webpack-Alias für @ocelot-social/ui$ und style.css$
- [x] CSS Custom Properties in Webapp definieren (ocelot-ui-variables.scss)
- [x] CSS-Reihenfolge angepasst (UI-Library nach Styleguide)
- [x] Import-Pfade testen
- [x] Docker Build Stage für UI-Library (Dockerfile + Dockerfile.maintenance)
- [x] Relativer Pfad für CI-Kompatibilität (file:../packages/ui)
- [x] Jest Mock für @ocelot-social/ui (test/__mocks__/@ocelot-social/ui.js)

**Milestone 2: Erste Integration (Minimaler Aufwand)** ✅
- [x] OsButton mit isVue2 Render-Funktion (Vue 2/3 kompatibel)
- [x] Button-Variants an ds-button angepasst (font-semibold, rounded, box-shadow)
- [x] OsButton in UserTeaserPopover.vue eingesetzt (`variant="primary"`)
- [x] Manueller visueller Vergleich ✅
- [x] Webapp-Tests bestehen ✅ (979 Tests, jest moduleNameMapper für vue-demi)

**Milestone 3: Schrittweise Erweiterung** ✅
- [x] GroupForm.vue Cancel-Button migriert
- [x] OsButton attrs/listeners Forwarding (Vue 2 $listeners via getCurrentInstance)
- [x] 14 weitere Buttons migriert (alle ohne icon/circle/loading)

**Milestone 4a: Weitere Buttons migrieren (14 ohne neue Props)** ✅
- [x] Modal Cancel-Buttons (DisableModal, DeleteUserModal, ReleaseModal)
- [x] Form Cancel/Submit-Buttons (ContributionForm, EnterNonce, MySomethingList)
- [x] ImageUploader.vue (2× Crop-Buttons)
- [x] Page-Buttons (donations, badges, notifications/index, profile Unblock/Unmute)
- [x] ReportRow.vue More-Details-Button

**Milestone 4b: OsButton Props erweitern** ✅
- [x] `icon` Slot implementiert (slot-basiert, icon-system-agnostisch) ✅
- [x] `circle` Prop implementiert (rounded-full, größenabhängige Breiten) ✅
- [x] `loading` Prop mit animiertem SVG-Spinner implementiert ✅

**Milestone 4c: Buttons mit icon/circle/loading migrieren** ✅ ABGESCHLOSSEN

*Button-Komponenten (Wrapper):*
- [x] Button/JoinLeaveButton.vue (icon, loading) ✅
- [x] Button/FollowButton.vue (icon, loading) ✅
- [x] LoginButton/LoginButton.vue (icon, circle) ✅
- [x] InviteButton/InviteButton.vue (icon, circle) ✅
- [x] EmotionButton/EmotionButton.vue (circle) ✅
- [x] CustomButton/CustomButton.vue (2× circle) ✅
- [x] LabeledButton/LabeledButton.vue (icon, circle) ✅

*Navigation & Menus:*
- [x] ContentMenu/ContentMenu.vue (icon, circle) ✅
- [x] ContentMenu/GroupContentMenu.vue (icon, circle) ✅
- [x] ChatNotificationMenu.vue (circle) ✅
- [x] NotificationMenu.vue (3× icon, circle) ✅
- [x] HeaderMenu/HeaderMenu.vue (icon, circle) ✅
- [x] Map/MapButton.vue (circle) ✅

*Editor:*
- [x] Editor/MenuBar.vue (~11× icon, circle) ✅
- [x] Editor/MenuLegend.vue (2× icon) ✅

*Filter & Input:*
- [x] HashtagsFilter.vue (icon, circle) ✅
- [x] CategoriesSelect.vue (icon) ✅
- [x] SearchableInput.vue (icon, circle) ✅
- [x] Select/LocationSelect.vue (icon) ✅
- [x] PaginationButtons.vue (2× icon, circle) ✅

*Chat:*
- [x] Chat/Chat.vue (2× icon, circle) ✅
- [x] Chat/AddChatRoomByUserSearch.vue (icon, circle) ✅

*Forms & Auth:*
- [x] LoginForm/LoginForm.vue (icon, loading) ✅
- [x] PasswordReset/Request.vue (loading) ✅
- [x] PasswordReset/ChangePassword.vue (loading) ✅
- [x] Password/Change.vue (loading) ✅
- [x] ContributionForm.vue Submit (icon, loading) ✅
- [x] CommentForm/CommentForm.vue (loading) ✅

*Modals:*
- [x] Modal/ConfirmModal.vue (2× icon, loading) ✅
- [x] Modal/ReportModal.vue (2× icon, loading) ✅
- [x] Modal/DisableModal.vue Confirm (icon) ✅
- [x] Modal/DeleteUserModal.vue Confirm (icon) ✅
- [x] Modal/ReleaseModal.vue Confirm (icon) ✅

*Features:*
- [x] ComponentSlider.vue (2× icon) ✅
- [x] MySomethingList.vue (3× icon, circle) ✅
- [x] CreateInvitation.vue (icon, circle) ✅
- [x] Invitation.vue (2× icon, circle) ✅
- [x] ProfileList.vue (loading) ✅
- [x] ReportRow.vue Confirm (icon) ✅
- [x] ImageUploader.vue Delete/Cancel (2× icon, circle) ✅
- [x] CommentCard.vue Reply (icon, circle) ✅
- [x] EmbedComponent.vue Close (icon, circle) ✅
- [x] CtaUnblockAuthor.vue (icon) ✅
- [x] data-download.vue (icon, loading) ✅
- [x] ActionButton.vue (icon, circle) ✅
- [x] DeleteData.vue (icon) ✅
- [x] GroupButton.vue (icon, circle) ✅

*Filter-Menüs:*
- [x] FilterMenu/FilterMenu.vue (icon) ✅
- [x] FilterMenu/HeaderButton.vue (2× icon) ✅
- [x] FilterMenu/CategoriesFilter.vue (2× icon) ✅
- [x] FilterMenu/OrderByFilter.vue (2×) ✅
- [x] FilterMenu/EventsByFilter.vue (2×) ✅
- [x] FilterMenu/FollowingFilter.vue (3×) ✅

*Pages:*
- [x] pages/index.vue (2× icon, circle) ✅
- [x] pages/groups/index.vue (icon, circle) ✅
- [x] pages/groups/_id/_slug.vue (3× icon, circle) ✅
- [x] pages/admin/users/index.vue (2× icon, circle) ✅
- [x] pages/settings/index.vue (icon) ✅
- [x] pages/settings/blocked-users.vue (icon, circle) ✅
- [x] pages/settings/muted-users.vue (icon, circle) ✅
- [x] pages/settings/data-download.vue (icon) ✅
- [x] pages/settings/my-email-address/index.vue (icon) ✅
- [x] pages/settings/my-email-address/enter-nonce.vue (icon) ✅
- [x] pages/profile/_id/_slug.vue (icon, circle) ✅
- [x] pages/post/_id/_slug/index.vue (icon, circle) ✅

**Milestone 5: Validierung & Dokumentation** ✅
- [x] Keine visuellen Änderungen bestätigt (16/16 Buttons validiert)
- [x] Keine funktionalen Änderungen bestätigt
- [x] Disabled-Styles korrigiert (hover/active-Override, Border-Fix)
- [ ] Webapp-Tests bestehen weiterhin (TODO: Snapshots aktualisieren)
- [ ] Erkenntnisse in KATALOG.md dokumentiert

**Einsatzstellen-Übersicht:**

| Kategorie | Buttons | Status |
|-----------|---------|--------|
| ✅ Migriert (gesamt) | 133 | 79 Dateien |
| ⬜ `<base-button>` verbleibend | 0 | Nur BaseButton.vue Definition + Test-Dateien |
| ⬜ `<ds-button>` verbleibend | 0 | Alle ersetzt |
| **Gesamt** | **133** | **100% erledigt** ✅ |

**Details siehe KATALOG.md** (vollständige Tracking-Tabellen)

**Erfolgskriterien:**
| Kriterium | Prüfung |
|-----------|---------|
| Visuell identisch | Manueller Screenshot-Vergleich |
| Funktional identisch | Click, Disabled funktionieren |
| Keine Regression | Webapp Unit-Tests bestehen |

**Visuelle Validierung (OsButton vs Original):**

Jeder migrierte Button muss manuell geprüft werden: Normal, Hover, Focus, Active, Disabled.

| Datei | Button | Props | Validiert |
|-------|--------|-------|-----------|
| `components/Group/GroupForm.vue` | Cancel | `default` | ✅ |
| `components/Group/GroupMember.vue` | Remove Member | `appearance="outline" variant="primary" size="sm"` | ✅ |
| `components/CommentCard/CommentCard.vue` | Show more/less | `appearance="ghost" variant="primary" size="sm"` | ✅ |
| `components/UserTeaser/UserTeaserPopover.vue` | Open Profile | `variant="primary"` | ✅ |
| `components/DonationInfo/DonationInfo.vue` | Donate Now | `size="sm" variant="primary"` | ✅ |
| `components/Map/MapStylesButtons.vue` | Map Styles | `:appearance` dynamisch + custom CSS | ✅ |
| `components/Embed/EmbedComponent.vue` | Cancel | `appearance="outline" variant="danger"` + custom CSS | ✅ |
| `components/Embed/EmbedComponent.vue` | Play Now | `variant="primary"` + custom CSS | ✅ |
| `pages/terms-and-conditions-confirm.vue` | Read T&C | `appearance="outline" variant="primary"` | ✅ |
| `pages/terms-and-conditions-confirm.vue` | Save | `variant="primary"` + disabled | ✅ |
| `pages/settings/privacy.vue` | Save | `variant="primary"` + disabled | ✅ |
| `pages/settings/notifications.vue` | Check All | `appearance="outline" variant="primary"` + disabled | ✅ |
| `pages/settings/notifications.vue` | Uncheck All | `appearance="outline" variant="primary"` + disabled | ✅ |
| `pages/settings/notifications.vue` | Save | `variant="primary"` + disabled | ✅ |
| `pages/settings/embeds.vue` | Allow All | `appearance="outline" variant="primary"` + disabled | ✅ |
| `pages/settings/embeds.vue` | Deny All | `variant="primary"` + disabled | ✅ |

**Validierung abgeschlossen:** 16/16 (100%) ✅

**Nach Abschluss aller Validierungen:**
- [ ] Gesamt-Regressionstest durchführen
- [ ] Alle Unit-Tests bestehen
- [ ] Dokumentation aktualisieren

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
| 69 | Webapp ↔ Maintenance Sharing | Webapp als Source of Truth | Kein separates "shared" Package, maintenance importiert aus webapp/ (siehe §16a) |
| 70 | Daten-Entkopplung | ViewModel/Mapper Pattern | Komponenten kennen nur ViewModels, Mapper transformieren API-Daten (siehe §16b) |

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
| 2026-02-08 | **Phase 3: vue-demi Integration** | vue-demi zur Webapp hinzugefügt, Webpack-Alias für Vue 2.7 Kompatibilität |
| 2026-02-08 | **Phase 3: Webpack-Alias** | @ocelot-social/ui$ und style.css$ Aliase für yarn-linked Package |
| 2026-02-08 | **Phase 3: isVue2 Render** | OsButton mit isVue2 Check: Vue 2 attrs-Objekt, Vue 3 flat props |
| 2026-02-08 | **Phase 3: CSS-Spezifität** | UI-Library CSS nach Styleguide laden (styleguide.js Plugin) |
| 2026-02-08 | **Phase 3: Jest vue-demi** | Custom Mock (`__mocks__/@ocelot-social/ui.js`) mit Module._load Patch, defineComponent von Vue.default, vueDemiSetup.js, 979 Tests ✅ |
| 2026-02-08 | **Phase 3: Button-Styles** | Variants angepasst: font-semibold, rounded, box-shadow, h-[37.5px] |
| 2026-02-08 | **Phase 3: Erste Integration** | UserTeaserPopover.vue verwendet `<os-button>` |
| 2026-02-08 | **Phase 3: Visueller Test** | Manueller Vergleich OsButton vs ds-button erfolgreich ✅ |
| 2026-02-08 | **Phase 3: v8 ignore** | Vue 2 Branch in OsButton mit `/* v8 ignore */` für 100% Coverage in Vitest |
| 2026-02-08 | **Phase 3: Docker Build** | ui-library Stage in Dockerfile + Dockerfile.maintenance, COPY --from=ui-library |
| 2026-02-08 | **Phase 3: CI-Fix** | Relativer Pfad `file:../packages/ui` statt absolut für yarn install außerhalb Docker |
| 2026-02-08 | **Phase 3: Storybook Fix** | TypeScript-Fehler in Stories behoben (`default` aus args entfernt) |
| 2026-02-08 | **Phase 3: attrs/listeners** | OsButton forwarded jetzt attrs + $listeners für Vue 2 (getCurrentInstance) |
| 2026-02-08 | **Phase 3: Jest Mock erweitert** | Alle Composition API Funktionen (computed, ref, watch, etc.) im Mock |
| 2026-02-08 | **Phase 3: 15 Buttons migriert** | GroupForm, EmbedComponent, DonationInfo, CommentCard, MapStylesButtons, GroupMember, embeds, notifications, privacy, terms-and-conditions-confirm |
| 2026-02-08 | **Phase 3: Test-Updates** | privacy.spec.js Selektoren, notifications Snapshot, DonationInfo.spec.js |
| 2026-02-08 | **OsButton: appearance Prop** | Neue `appearance` Prop: `filled` (default), `outline`, `ghost` - ermöglicht base-button Stile |
| 2026-02-08 | **OsButton: xs Size** | Exakte Pixel-Werte für base-button --small: h-26px, px-8px, text-12px, rounded-5px |
| 2026-02-08 | **OsButton: outline primary** | Grüner Rahmen + grüner Text + hellgrüner Hintergrund-Tint (rgba(25,122,49,0.18)) |
| 2026-02-08 | **OsButton: ghost primary** | Transparenter Hintergrund, grüner Text, Hover füllt grün, Active dunkler |
| 2026-02-08 | **OsButton: Focus Style** | `focus:outline-dashed focus:outline-1` statt ring (wie base-button) |
| 2026-02-08 | **OsButton: Active State** | `active:bg-[var(--color-*-hover)]` für dunkleren Hintergrund beim Drücken |
| 2026-02-08 | **Visuelle Validierung** | Tracking-Tabelle in PROJEKT.md für manuelle Button-Vergleiche (4/16 validiert) |
| 2026-02-08 | **Storybook Grayscale Theme** | Vollständige CSS-Variablen: default, active-states, contrast-inverse |
| 2026-02-08 | **Tailwind Source Filter** | `@import "tailwindcss" source(none)` - verhindert Markdown-Scanning |
| 2026-02-08 | **Button Variants Konsistenz** | Alle 21 compound variants mit korrekten active-states (`--color-*-active`) |
| 2026-02-08 | **CSS-Variablen erweitert** | `--color-secondary/warning/success/info-active` in ocelot-ui-variables.scss |
| 2026-02-08 | **Story Dokumentation** | "Medium (37.5px)" → "Medium (36px)" korrigiert |
| 2026-02-08 | **Playwright Toleranz** | `maxDiffPixelRatio: 0.03` für Cross-Platform Font-Rendering |
| 2026-02-09 | **Disabled-Styles korrigiert** | CSS-Variablen `--color-disabled`, filled: grauer Hintergrund statt opacity |
| 2026-02-09 | **terms-and-conditions-confirm** | Read T&C Button → `appearance="outline" variant="primary"` |
| 2026-02-09 | **Visuelle Validierung** | 10/16 Buttons validiert (terms-and-conditions-confirm.vue abgeschlossen) |
| 2026-02-09 | **Disabled:active/hover Fix** | CSS-Regeln in index.css mit höherer Spezifität für sofortige disabled-Darstellung |
| 2026-02-09 | **notifications.vue** | Check All + Uncheck All → `appearance="outline" variant="primary"` |
| 2026-02-09 | **Visuelle Validierung** | 14/16 Buttons validiert (notifications.vue abgeschlossen) |
| 2026-02-09 | **embeds.vue** | Allow All → `appearance="outline" variant="primary"` |
| 2026-02-09 | **Disabled Border-Fix** | CSS-Regeln in index.css: `border-style: solid` + `border-width: 0.8px` bei :disabled |
| 2026-02-09 | **Visuelle Validierung abgeschlossen** | 16/16 Buttons validiert (100%) ✅ Milestone 5 erfolgreich |
| 2026-02-09 | **Button-Analyse erweitert** | 14 weitere Buttons identifiziert (ohne icon/circle/loading) → Scope: 16/35 |
| 2026-02-09 | **Scope auf ~90 erweitert** | ~60 weitere Buttons mit icon/circle/loading identifiziert |
| 2026-02-09 | **Milestone 4a: 8 Buttons** | DisableModal, DeleteUserModal, ReleaseModal, ContributionForm, EnterNonce, MySomethingList, ImageUploader (2x) |
| 2026-02-09 | **ImageUploader CSS-Fix** | `position: absolute !important` für crop-confirm (überschreibt OsButton `relative`) |
| 2026-02-09 | **§16a hinzugefügt** | Webapp ↔ Maintenance Code-Sharing: Webapp als Source of Truth (Entscheidung #69) |
| 2026-02-09 | **§16b hinzugefügt** | Daten-Entkopplung: ViewModel/Mapper Pattern für API-agnostische Komponenten (Entscheidung #70) |
| 2026-02-09 | **NotificationMenu.vue** | 2 Buttons migriert (ghost primary), padding-top Fix für vertical-align Unterschied |
| 2026-02-09 | **Milestone 4a abgeschlossen** | 6 weitere Buttons migriert: donations.vue (Save), profile/_id/_slug.vue (Unblock, Unmute), badges.vue (Remove), notifications/index.vue (Mark All Read), ReportRow.vue (More Details) |
| 2026-02-10 | **Wasserfarben-Farbschema** | Greyscale-Theme → Aquarell-Farben (Ultramarin, Dioxazin-Violett, Alizarin, Ocker, Viridian, Cöruleum), WCAG AA konform |
| 2026-02-10 | **Stories konsolidiert** | Primary/Secondary/Danger/Default entfernt → AllVariants; AllSizes/AllAppearances/Disabled/FullWidth zeigen alle 7 Varianten |
| 2026-02-10 | **Appearance: Filled/Outline/Ghost** | Einzelne Stories umbenannt und mit allen 7 Varianten erweitert |
| 2026-02-10 | **Playground-Story** | Interaktive Controls (argTypes nur in Playground, nicht global) |
| 2026-02-10 | **Einheitlicher Border** | `border-[0.8px] border-solid border-transparent` als Base-Klasse für alle Appearances |
| 2026-02-10 | **WCAG 2.4.7 Fix** | Default-Variante: `focus:outline-none` → `focus:outline-dashed focus:outline-current` |
| 2026-02-10 | **Keyboard A11y Test** | Playwright-Test fokussiert alle Buttons und prüft `outlineStyle !== 'none'` |
| 2026-02-10 | **data-appearance Attribut** | OsButton rendert `data-appearance` auf `<button>`; CSS-Selektoren nutzen `[data-appearance="filled"]` statt escaped Tailwind-Klassen |
| 2026-02-10 | **Code-Review Fixes** | Unit-Tests: spezifischere Assertions (Compound-Variant-Logik), Trailing Spaces in Testnamen, ESLint restrict-template-expressions Fix |
| 2026-02-10 | **CSS-Linting** | `@eslint/css` + `tailwind-csstree` für Tailwind v4 Custom Syntax; `excludeCSS()` Helper verhindert JS-Regel-Konflikte; Regeln: no-empty-blocks, no-duplicate-imports, no-invalid-at-rules |
| 2026-02-10 | **CI-Workflow-Trigger** | 9 UI-Workflows von `on: push` auf `push`+`pull_request` mit Branch-Filter (`master`) und Path-Filter (`packages/ui/**` + Workflow-Datei) umgestellt |
| 2026-02-10 | **custom-class entfernt** | `custom-class` Prop (entfernt aus OsButton) → `class` Attribut in notifications.vue, MapStylesButtons.vue, EmbedComponent.vue (4 Stellen); Snapshot aktualisiert |
| 2026-02-10 | **Vue 3 Template-Fix** | `this.$t()` → `$t()` in CommentCard.vue (this im Template in Vue 3 nicht verfügbar) |
| 2026-02-11 | **Icon-Slot implementiert** | Benannter `#icon` Slot für OsButton, slot-basiert statt Icon-Prop (icon-system-agnostisch) |
| 2026-02-11 | **Icon-Wrapper Klassen** | Tailwind-Utility-Klassen direkt auf `<span>`: `inline-flex items-center shrink-0 h-[1.2em] [&>svg]:h-full [&>svg]:w-auto [&>svg]:fill-current` |
| 2026-02-11 | **VNode Text-Erkennung** | `hasText` prüft VNode-Children auf sichtbaren Inhalt; whitespace-only → icon-only Verhalten |
| 2026-02-11 | **Gap & Margin Logik** | `gap-2` bei Icon+Text, `-ml-1` bei Icon, `-ml-1 -mr-1` bei Icon-Only (optischer Ausgleich) |
| 2026-02-11 | **4 neue Stories** | Icon, IconOnly, IconSizes, IconAppearances mit Inline-SVG Komponenten (CheckIcon, CloseIcon, PlusIcon) |
| 2026-02-11 | **Playground erweitert** | Reaktiver Icon-Selektor (none/check/close/plus) + Label-Text-Control via `computed()` |
| 2026-02-11 | **Storybook: components Option** | Funktionale Komponenten müssen in `components` registriert werden, nicht in `setup()` return |
| 2026-02-11 | **Storybook: CSS nicht in index.css** | Storybook lädt eigene `storybook.css`, nicht `src/styles/index.css` → Utility-Klassen direkt verwenden |
| 2026-02-11 | **SVG-Targeting** | `[&>svg]` statt `[&>*]` für Icon-Sizing (BaseIcon rendert `<span><svg>`, Wrapper-Span darf nicht beeinflusst werden) |
| 2026-02-11 | **my-email-address migriert** | Save-Button: `<os-button variant="primary">` mit `<template #icon><base-icon name="check" /></template>` |
| 2026-02-11 | **Code-Optimierung** | `ICON_CLASS` Konstante extrahiert, `iconMargin` Variable, vereinfachte `hasText`-Logik (kein Symbol.for) |
| 2026-02-11 | **Größenabhängiger Gap** | `gap-1` (4px) für xs/sm, `gap-2` (8px) für md/lg/xl bei Icon+Text |
| 2026-02-11 | **Größenabhängiger Margin** | Kein negativer Icon-Margin bei xs/sm (voller Padding-Abstand zur Button-Grenze) |
| 2026-02-11 | **DisableModal.vue** | Confirm-Button migriert: `danger filled icon="exclamation-circle"` → `variant="danger"` + `#icon` Slot |
| 2026-02-11 | **DeleteUserModal.vue** | Confirm-Button migriert: identisches Pattern wie DisableModal |
| 2026-02-11 | **CtaUnblockAuthor.vue** | Button migriert: `filled icon="arrow-right"` → `variant="primary"` + `#icon` Slot, OsButton importiert |
| 2026-02-11 | **LocationSelect.vue** | Icon-only Close-Button migriert: `ghost size="small" icon="close"` → `variant="primary" appearance="ghost" size="sm"` + aria-label |
| 2026-02-11 | **CategoriesSelect.vue** | v-for Buttons migriert: dynamisches `:icon` → `#icon` Slot, `:filled` → `:appearance`, CSS `.base-button` → `button` |
| 2026-02-11 | **profile/_id/_slug.vue** | Chat-Button migriert: `icon="chat-bubble"` → `variant="primary" appearance="outline" full-width` + `#icon` Slot |
| 2026-02-11 | **verify.vue korrigiert** | Kein Button vorhanden (Eintrag aus Milestone-Liste entfernt) |
| 2026-02-11 | **PaginationButtons.vue** | 2 circle icon-only Buttons migriert: `outline primary circle` + `#icon` Slot + aria-label |
| 2026-02-11 | **OsButton: circle Prop** | `circle` Prop: `rounded-full p-0` + größenabhängige Breiten (CIRCLE_WIDTHS Map) |
| 2026-02-11 | **OsButton: loading Prop** | Animierter SVG-Spinner mit `aria-busy="true"`, Button auto-disabled bei loading |
| 2026-02-11 | **Spinner-Architektur** | Beide Animationen (rotate + dash) auf `<circle>` Element; SVG ist statischer Container; Chrome-Compositing-Bug-Workaround |
| 2026-02-11 | **Spinner-Zentrierung** | Icon-Buttons: Spinner über Icon (translate-basiert, overflow:visible); Text-Buttons: Spinner im Button-Container (inset-0 m-auto) |
| 2026-02-11 | **animations.css** | Keyframes `os-spinner-dash` + `os-spinner-rotate` in separate CSS-Datei ausgelagert |
| 2026-02-11 | **min-width pro Größe** | `min-w-[26px]`/`min-w-[36px]`/`min-w-12`/`min-w-14` in button.variants.ts (verhindert zu kleine leere Buttons) |
| 2026-02-11 | **Code-Optimierung** | OsButton ~250→207 Zeilen: buttonData geteilt, SPINNER_PX vereinfacht, redundante cn() entfernt, getCurrentInstance nur Vue 2 |
| 2026-02-11 | **5 neue Unit-Tests** | default type, data-appearance, min-w, icon-only loading, circle gap-1; gesamt: 76 Tests |
| 2026-02-11 | **Milestone 4b abgeschlossen** | icon ✅, circle ✅, loading ✅ — alle OsButton-Props implementiert |
| 2026-02-11 | **Milestone 4c: 59 Buttons** | Chat (2), AddChatRoomByUserSearch (1), CommentCard (1), CommentForm (2), ComponentSlider (2), ContributionForm (1), DeleteData (1), EmbedComponent (1), FilterMenu (1), HeaderButton (2), CategoriesFilter (2), OrderByFilter (2), EventsByFilter (2), FollowingFilter (3), GroupButton (1), ConfirmModal (2), ReportModal (2), Password/Change (1), PasswordReset/Request (1), PasswordReset/ChangePassword (1), Registration/Signup (1), ReleaseModal (1), ImageUploader (2), CreateInvitation (1), Invitation (2), ProfileList (1), ReportRow (1), MySomethingList (3), ActionButton (1), pages/index (2), profile/add-post (1), post/blur-toggle (1), groups/slug (3), settings/index (1), admin/users (2), blocked-users (1), data-download (1), muted-users (1), groups/index (1), enter-nonce (1) |
| 2026-02-11 | **type="submit" Pattern** | OsButton hat `type="button"` als Default; alle Form-Submit-Buttons brauchen explizit `type="submit"` |
| 2026-02-11 | **!!errors Pattern** | DsForm `errors` ist ein Objekt, nicht Boolean; OsButton `disabled` Prop erwartet Boolean → `!!errors` nötig |
| 2026-02-11 | **CSS-Selector Pattern** | `.base-button` → `> button` oder `button`; Position/Dimensions brauchen `!important` für Tailwind-Override |
| 2026-02-11 | **Disabled border-color** | Outline disabled border von `var(--color-disabled)` auf `var(--color-disabled-border,#e5e3e8)` mit Fallback |
| 2026-02-11 | **Phase 3 abgeschlossen** | 132 `<os-button>` Tags in 78 Dateien, 0 `<base-button>` in Templates verbleibend |
| 2026-02-11 | **Password/Change.vue Fix** | `!!errors` für disabled-Prop (DsForm errors ist Objekt) |
| 2026-02-11 | **CommentForm.vue Fix** | `type="submit"` fehlte + `!!errors` für disabled-Prop |
| 2026-02-11 | **GroupForm.vue ds-button** | Letzter `<ds-button>` in Webapp → `<os-button>` mit `#icon` Slot migriert |
| 2026-02-11 | **OsButton.spec.ts TS-Fix** | `size` aus `Object.entries` als Union Type gecastet (`as 'sm' | 'md' | 'lg' | 'xl'`) |
| 2026-02-11 | **Coverage 100%** | `v8 ignore start/stop` für Vue 2 Branch, `v8 ignore next` für defensive `||` Fallback |
| 2026-02-11 | **Scope: 133 Buttons** | 133 `<os-button>` Tags in 79 Dateien, 0 `<base-button>` + 0 `<ds-button>` verbleibend |
| 2026-02-12 | **data-variant Attribut** | OsButton rendert `data-variant` auf `<button>` (konsistent mit `data-appearance`), ermöglicht CSS-Selektoren wie `button[data-variant="danger"]` |
| 2026-02-12 | **notifications.spec.js** | Test-API korrigiert: `wrapper.find()` (Vue Test Utils) → `screen.getByText()` (Testing Library), `button.disabled` statt `button.attributes('disabled')` |
| 2026-02-12 | **FilterMenu Regressionsbug** | `appearance="ghost"` war hardcoded statt dynamisch; `filterActive` Computed Property existierte aber war nicht genutzt → `:appearance="filterActive ? 'filled' : 'ghost'"` |
| 2026-02-12 | **FilterMenu.spec.js** | Test von CSS-Klasse `--filled` auf `data-appearance="filled"` Attribut-Selektor umgestellt |
| 2026-02-12 | **CtaUnblockAuthor.vue** | Typo `require: true` → `required: true` (Vue ignorierte die Prop-Validierung) |
| 2026-02-12 | **LocationSelect.vue Fixes** | `event.target.value` → `this.currentValue` (Button hat kein value), `@click.native` → `@click` (Vue 3), `aria-label` via i18n |
| 2026-02-12 | **i18n: actions.clear** | Neuer Key in allen 9 Sprachdateien: en=Clear, de=Zurücksetzen, fr=Effacer, es=Borrar, it=Cancella, nl=Wissen, pl=Wyczyść, pt=Limpar, ru=Очистить |
| 2026-02-12 | **OsButton JSDoc** | Slot-Dokumentation (`@slot default`, `@slot icon`) für vue-component-meta/Storybook autodocs |
| 2026-02-12 | **OsButton xs entfernt** | `isSmall` von `['xs', 'sm'].includes(size)` auf `size === 'sm'` vereinfacht (xs ist kein gültiger Size-Wert) |
| 2026-02-12 | **Strikte Typisierung** | `type Size = NonNullable<ButtonVariants['size']>`, `Record<Size, ...>` für CIRCLE_WIDTHS + SPINNER_PX; `props.size!` → `(props.size ?? 'md') as Size` |
| 2026-02-12 | **animations.css** | Stylelint-konforme Formatierung: eine Deklaration pro Zeile, Leerzeilen zwischen Keyframe-Stufen |
| 2026-02-12 | **OsButton Refactoring** | `vueAttrs()` Helper für Vue 2/3 Attribut-Handling, Einmal-Variablen durch `cn()` ersetzt, `children` inline; 77 Tests, 100% Coverage |
| 2026-02-12 | **CSS @import Reihenfolge** | `@import "./animations.css"` vor `@source`-Direktiven verschoben (CSS-Spec: @import vor anderen At-Rules) |
| 2026-02-12 | **CustomButton Cleanup** | `isEmpty` aus `data()` entfernt — reine Utility-Funktion braucht keine Vue-Reaktivität |
| 2026-02-12 | **notifications.spec.js** | Doppelten `beforeEach` konsolidiert; `wrapper` von Modulebene in `describe`-Block verschoben |
| 2026-02-12 | **Style-Scoping** | MenuLegend.vue: `<style scoped>` hinzugefügt; ReportModal + DeleteUserModal: CSS-Selektoren mit Komponenten-Prefix |
| 2026-02-12 | **data-test Selektoren** | LocationSelect (`clear-location-button`) + HashtagsFilter (`clear-search-button`): spezifischere Test-Selektoren |
| 2026-02-12 | **Vue 3 Compat Fixes** | FollowButton: `.native` entfernt; FilterMenu: `slot`/`slot-scope` → `<template #default>`; HashtagsFilter: `this.$t()` → `$t()` |
| 2026-02-12 | **A11y: aria-label** | GroupContentMenu icon-only Button: `$t('group.contentMenu.menuButton')`; PaginationButtons: `$t('pagination.previous/next')` |
| 2026-02-12 | **i18n Keys** | `pagination.previous/next` + `group.contentMenu.menuButton` in allen 9 Sprachdateien angelegt |
| 2026-02-12 | **Modal Konsistenz** | DisableModal + DeleteUserModal: `appearance="filled"` + `:loading="loading"` auf Danger-Buttons |
| 2026-02-12 | **Loading State** | my-email-address/index.vue: `loadingData` hinzugefügt + `finally` Block für Reset |
| 2026-02-12 | **MapButton #icon Slot** | Icon von Default-Slot in `<template #icon>` verschoben (konsistent mit allen anderen Buttons) |
| 2026-02-12 | **Dead Code entfernt** | MySomethingList.vue: `.icon-button` CSS-Klasse (nach Migration nicht mehr verwendet) |
| 2026-02-12 | **Button-Wrapper-Analyse** | 15 OsButton-Wrapper klassifiziert: 4 Smart (Apollo/Vuex), 4 Presentational, 7 Borderline; GroupButton + MapButton als Inline-Kandidaten identifiziert |
| 2026-02-12 | **compat/ Konzept** | Separates Verzeichnis für temporäre Migrations-Wrapper (nicht von check-completeness.ts erfasst); BaseIcon als erster Kandidat (131 Nutzungen) |
| 2026-02-13 | **data-test Selektoren** | ~10 Komponenten: `data-test` Attribute für robuste Test-Selektoren (unmute-btn, unblock-btn, follow-btn, join-leave-btn, login-btn, load-all-connections-btn, content-menu-button) |
| 2026-02-13 | **Cypress Selektoren** | 4 Step-Definitions: `.user-content-menu button` / `.content-menu button` → `[data-test="content-menu-button"]` |
| 2026-02-13 | **Spec-Selektoren** | FollowList, FollowButton, LoginButton, CtaJoinLeaveGroup, ReportRow, muted-users, blocked-users: generische `button` → `[data-test="..."]` |
| 2026-02-13 | **A11y: aria-label** | ~15 icon-only Buttons: aria-label hinzugefügt (admin/users, AddChatRoom, EmbedComponent, groups, profile, CustomButton, HeaderMenu, ImageUploader, ContentMenu, HeaderButton, InviteButton, LoginButton, blocked/muted-users) |
| 2026-02-13 | **Zustandsabhängiges aria-label** | post/_id/_slug: `$t(blurred ? 'post.sensitiveContent.show' : 'post.sensitiveContent.hide')` |
| 2026-02-13 | **ComponentSlider aria-label** | Interpoliertes Label: `$t('component-slider.step', { current: index + 1, total: ... })` |
| 2026-02-13 | **i18n Keys (6 neue)** | `actions.search`, `actions.close`, `actions.menu`, `site.navigation`, `post.sensitiveContent.show/hide`, `component-slider.step` in allen 9 Sprachdateien |
| 2026-02-13 | **Loading-State Fixes** | DisableModal + ReleaseModal: `finally { this.loading = false }` für Reset |
| 2026-02-13 | **Bugfixes** | ChangePassword: `!!errors`; Password/Change: `disabled` aus data() entfernt + 2 tote Tests; MenuBar: unbenutztes `ref` entfernt |
| 2026-02-13 | **Button-Props** | GroupForm cancel: `variant="default" appearance="filled"`; donations/LoginForm/EnterNonce: `appearance="filled"` ergänzt |
| 2026-02-13 | **CSS-Selektoren** | LoginForm: `.login-form button` → `.login-form button[type='submit']`; pages/index: redundante Klasse auf BaseIcon entfernt |
| 2026-02-13 | **JoinLeaveButton** | `.native` von `@mouseenter`/`@mouseleave` entfernt (Vue 3 Kompatibilität) |
| 2026-02-13 | **MySomethingList** | `:title` + `:aria-label` auf Edit/Delete-Buttons (Tooltip beibehalten neben Accessibility) |

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

## 16a. Webapp ↔ Maintenance Code-Sharing

### Problemstellung

Die Webapp und Maintenance-App sind aktuell verschachtelt und sollen getrennt werden.
Einige Business-Komponenten werden in beiden Apps benötigt, gehören aber nicht in die UI-Library.

**Das DX-Problem:** "shared" hat kein logisches Kriterium außer "wird in beiden gebraucht".

### Analysierte Optionen

| Option | Beschreibung | Bewertung |
|--------|--------------|-----------|
| **A: Domain Packages** | `@ocelot-social/auth`, `@ocelot-social/posts`, etc. | Gut bei vielen Komponenten, aber Overhead |
| **B: Core + Duplikation** | Composables teilen, Komponenten duplizieren | Gut wenn UI unterschiedlich |
| **C: Webapp als Source** | Maintenance importiert aus Webapp | Einfachste Lösung |

### Empfehlung: Option C (Webapp als Source of Truth)

```
┌─────────────────────────────────────────────────────────────┐
│  @ocelot-social/ui                                          │
│  ─────────────────                                          │
│  • OsButton, OsModal, OsCard, OsInput                       │
│  • Rein präsentational, keine Abhängigkeiten                │
├─────────────────────────────────────────────────────────────┤
│  webapp/                                                    │
│  ───────                                                    │
│  • Alle Business-Komponenten (Source of Truth)              │
│  • Composables in webapp/lib/composables/                   │
│  • GraphQL in webapp/graphql/                               │
│  • Ist die "Haupt-App"                                      │
├─────────────────────────────────────────────────────────────┤
│  maintenance/                                               │
│  ────────────                                               │
│  • Importiert aus @ocelot-social/ui                         │
│  • Importiert aus webapp/ via Alias                         │
│  • Nur maintenance-spezifische Komponenten lokal            │
└─────────────────────────────────────────────────────────────┘
```

### Umsetzung

**maintenance/nuxt.config.js:**
```javascript
export default {
  alias: {
    '@webapp': '../webapp',
    '@ocelot-social/ui': '../packages/ui/dist'
  }
}
```

**Import in Maintenance:**
```typescript
// UI-Komponenten aus Library
import { OsButton, OsModal } from '@ocelot-social/ui'

// Business-Komponenten aus Webapp
import FollowButton from '@webapp/components/FollowButton.vue'
import PostTeaser from '@webapp/components/PostTeaser.vue'

// Composables aus Webapp
import { useAuth } from '@webapp/lib/composables/useAuth'
import { useFollow } from '@webapp/lib/composables/useFollow'
```

### Kriterien für Entwickler

| Frage | Antwort |
|-------|---------|
| Wo suche ich eine UI-Komponente? | `@ocelot-social/ui` |
| Wo suche ich eine Business-Komponente? | `webapp/components/` |
| Wo erstelle ich eine neue geteilte Komponente? | `webapp/components/` |
| Wo erstelle ich maintenance-spezifische Komponenten? | `maintenance/components/` |

### Vorteile

1. **Klare Regel:** Alles Business-bezogene ist in Webapp
2. **Kein neues Package:** Weniger Overhead
3. **Eine Source of Truth:** Keine Sync-Probleme
4. **Einfache Migration:** Später ggf. Domain-Packages extrahieren

### Spätere Evolution (optional)

Wenn klare Patterns entstehen, können Domain-Packages extrahiert werden:

```
Phase 1 (jetzt):  Webapp ist Source of Truth
Phase 2 (später): Patterns identifizieren
Phase 3 (später): @ocelot-social/auth, @ocelot-social/posts, etc.
```

### Entscheidung

| # | Datum | Entscheidung |
|---|-------|--------------|
| 68 | 2026-02-09 | Webapp als Source of Truth für geteilte Business-Komponenten |

---

## 16b. Daten-Entkopplung (ViewModel/Mapper Pattern)

### Problemstellung

Komponenten sind oft direkt an API/GraphQL-Strukturen gekoppelt:

```vue
<!-- ❌ Tight Coupling -->
<UserCard :user="graphqlResponse.User" />

// Komponente kennt GraphQL-Struktur
props.user.avatar.url
props.user._followedByCurrentUserCount  // Underscore?!
props.user.__typename                   // Leaked!
```

**Probleme:**
- Schema-Änderung = alle Komponenten anpassen
- `__typename`, `_count` etc. leaken in die UI
- Schwer testbar (braucht echte GraphQL-Struktur)
- Komponenten nicht wiederverwendbar

### Lösung: ViewModel + Mapper Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  GraphQL / API Layer                                        │
│  • Queries & Mutations                                      │
│  • Generated Types (graphql-codegen)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Mappers (einziger Ort der API-Struktur kennt)              │
│  • toUserCardViewModel(graphqlUser) → UserCardViewModel     │
│  • toPostTeaserViewModel(graphqlPost) → PostTeaserViewModel │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ViewModels (was die UI braucht)                            │
│  • UserCardViewModel { displayName, avatarUrl, ... }        │
│  • PostTeaserViewModel { title, excerpt, ... }              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Presentational Components (kennen nur ViewModels)          │
│  • <UserCard :user="UserCardViewModel" />                   │
│  • <PostTeaser :post="PostTeaserViewModel" />               │
└─────────────────────────────────────────────────────────────┘
```

### Implementierung

**1. ViewModels definieren:**
```typescript
// types/viewModels.ts
export interface UserCardViewModel {
  id: string
  displayName: string
  avatarUrl: string | null
  followerCount: number
  isFollowedByMe: boolean
}

export interface PostTeaserViewModel {
  id: string
  title: string
  excerpt: string
  authorName: string
  authorAvatarUrl: string | null
  createdAt: Date
  commentCount: number
  canEdit: boolean
}
```

**2. Mapper-Funktionen:**
```typescript
// mappers/userMapper.ts
import type { UserCardViewModel } from '~/types/viewModels'
import type { UserGraphQL } from '~/graphql/types'

export function toUserCardViewModel(
  user: UserGraphQL,
  currentUserId?: string
): UserCardViewModel {
  return {
    id: user.id,
    displayName: user.name || user.slug || 'Anonymous',
    avatarUrl: user.avatar?.url ?? null,
    followerCount: user._followedByCurrentUserCount ?? 0,
    isFollowedByMe: user.followedByCurrentUser ?? false,
  }
}
```

**3. Komponenten nutzen nur ViewModels:**
```vue
<!-- components/UserCard.vue -->
<script setup lang="ts">
import type { UserCardViewModel } from '~/types/viewModels'

// Komponente kennt NUR das ViewModel, nicht GraphQL
defineProps<{
  user: UserCardViewModel
}>()
</script>
```

**4. Composables kapseln Mapping:**
```typescript
// composables/useUser.ts
import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { GET_USER } from '~/graphql/queries'
import { toUserCardViewModel } from '~/mappers/userMapper'
import type { UserCardViewModel } from '~/types/viewModels'

export function useUser(userId: string) {
  const { result, loading, error } = useQuery(GET_USER, { id: userId })

  const user = computed<UserCardViewModel | null>(() => {
    if (!result.value?.User) return null
    return toUserCardViewModel(result.value.User)
  })

  return { user, loading, error }
}
```

### Ordnerstruktur

```
webapp/
├── graphql/
│   ├── queries/
│   ├── mutations/
│   └── types/              # Generated by graphql-codegen
├── types/
│   └── viewModels.ts       # UI-spezifische Interfaces
├── mappers/
│   ├── userMapper.ts
│   ├── postMapper.ts
│   └── index.ts
├── lib/
│   └── composables/
│       ├── useAuth.ts
│       ├── useUser.ts      # Gibt ViewModel zurück
│       └── usePost.ts
├── components/             # Presentational (nur ViewModels)
│   ├── UserCard.vue
│   └── PostTeaser.vue
└── pages/                  # Nutzen Composables
    └── users/[id].vue
```

### Vorteile

| Aspekt | Ohne Mapper | Mit Mapper |
|--------|-------------|------------|
| **API-Änderung** | Alle Komponenten anpassen | Nur Mapper anpassen |
| **Testing** | Mock GraphQL Response | Einfaches ViewModel-Objekt |
| **Wiederverwendung** | Komponente an API gebunden | Komponente API-agnostisch |
| **TypeScript** | Komplexe/generierte Types | Klare, einfache Interfaces |
| **webapp ↔ maintenance** | Verschiedene Strukturen | Gleiche ViewModels |

### Regeln

```
┌─────────────────────────────────────────────────────────────┐
│  Regel 1: Komponenten definieren was sie BRAUCHEN           │
│           (ViewModel), nicht was die API LIEFERT            │
├─────────────────────────────────────────────────────────────┤
│  Regel 2: Mapper sind der EINZIGE Ort der API kennt         │
│           API-Änderung = nur Mapper ändern                  │
├─────────────────────────────────────────────────────────────┤
│  Regel 3: Composables kapseln Fetching + Mapping            │
│           useUser() gibt UserCardViewModel zurück           │
├─────────────────────────────────────────────────────────────┤
│  Regel 4: Presentational Components sind API-agnostisch     │
│           Einfach testbar, wiederverwendbar                 │
└─────────────────────────────────────────────────────────────┘
```

### Entscheidung

| # | Datum | Entscheidung |
|---|-------|--------------|
| 70 | 2026-02-09 | ViewModel/Mapper Pattern für Daten-Entkopplung |

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


# OsButton Status

> Status-Tracking der OsButton-Komponente

---

## Übersicht

| Aspekt | Status |
|--------|--------|
| **Implementierung** | Basis implementiert |
| **CVA-Integration** | Vollständig |
| **Tests** | 9 Tests vorhanden |
| **Storybook** | Ausstehend |
| **A11y** | Teilweise |

---

## Implementierte Features

### Props

| Prop | Typ | Default | Status | Notizen |
|------|-----|---------|--------|---------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'warning' \| 'success' \| 'info' \| 'ghost' \| 'outline'` | `'primary'` | Implementiert | 8 Varianten via CVA |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Implementiert | 5 Größen via CVA |
| `fullWidth` | `boolean` | `false` | Implementiert | |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Implementiert | |
| `disabled` | `boolean` | `false` | Implementiert | |
| `class` | `string` | `''` | Implementiert | Via cn() gemerged |

### Slots

| Slot | Status | Notizen |
|------|--------|---------|
| `default` | Implementiert | Button-Content |

### Events

| Event | Status | Notizen |
|-------|--------|---------|
| Native Events | Implementiert | click, focus, etc. werden durchgereicht |

---

## Fehlende Features (aus KATALOG.md)

### Hohe Priorität

| Feature | Beschreibung | Aufwand |
|---------|--------------|---------|
| `icon` | Icon-Name/Komponente einbinden | Mittel - erfordert OsIcon |
| `iconPosition` | `'left' \| 'right'` | Klein - nach Icon-Support |
| `loading` | Ladezustand mit Spinner | Mittel - erfordert OsSpinner |

### Mittlere Priorität

| Feature | Beschreibung | Aufwand |
|---------|--------------|---------|
| `to` | Vue Router Link-Support | Mittel - erfordert router-link/NuxtLink |
| `href` | Externer Link-Support | Klein - `<a>` statt `<button>` |
| `circle` | Runder Button | Klein - CVA-Variant hinzufügen |

### Niedrige Priorität

| Feature | Beschreibung | Aufwand |
|---------|--------------|---------|
| `filled` vs `ghost` | Explizite Unterscheidung | Diskussion nötig - aktuell via `variant` |

### Nicht geplant

| Feature | Begründung |
|---------|------------|
| `bullet` | Zu spezifisch, kann mit `circle` + custom size erreicht werden |
| `hover` prop | CSS :hover reicht |
| `padding` prop | Sollte über size geregelt werden |

---

## Vergleich: Aktuell vs. Zielzustand

### KATALOG.md Vorschlag (OsButtonProps)

```typescript
interface OsButtonProps {
  // Variante
  variant?: 'default' | 'primary' | 'secondary' | 'danger'
  filled?: boolean
  ghost?: boolean

  // Größe & Form
  size?: 'tiny' | 'small' | 'base' | 'large'
  circle?: boolean
  fullWidth?: boolean

  // Icon
  icon?: string
  iconPosition?: 'left' | 'right'

  // Zustände
  loading?: boolean
  disabled?: boolean

  // Link-Support
  to?: string | RouteLocationRaw
  href?: string

  // Button-Typ
  type?: 'button' | 'submit'
}
```

### Aktuelle Implementierung

```typescript
interface OsButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  type?: 'button' \| 'submit' \| 'reset'
  disabled?: boolean
  class?: string
}
```

### Unterschiede

| Aspekt | KATALOG.md | Implementiert | Kommentar |
|--------|------------|---------------|-----------|
| **Varianten** | 4 + filled/ghost Modifikatoren | 8 eigenständige | Besser: Mehr Varianten ohne Modifikatoren |
| **Sizes** | tiny, small, base, large | xs, sm, md, lg, xl | Besser: 5 statt 4, Standard-Naming |
| **Icon-Support** | icon, iconPosition | - | Fehlt: erfordert OsIcon |
| **Loading** | loading | - | Fehlt: erfordert OsSpinner |
| **Link-Support** | to, href | - | Fehlt: Router-Integration |
| **Circle** | circle | - | Fehlt: einfach hinzuzufügen |

---

## Test-Coverage

**Datei:** `OsButton.spec.ts`

| Test | Beschreibung |
|------|--------------|
| renders slot content | Slot-Inhalt wird gerendert |
| applies default variant classes | Primary-Variante als Default |
| applies size variant classes | Size-Classes korrekt |
| applies variant classes | Varianten-Classes korrekt |
| applies fullWidth class | w-full wird gesetzt |
| merges custom classes | Custom Classes werden via cn() gemerged |
| sets disabled attribute | disabled-Attribut wird gesetzt |
| sets button type | type-Attribut wird gesetzt |
| emits click event | Click-Event wird emittiert |

### Fehlende Tests

- [ ] Alle 8 Varianten testen
- [ ] Alle 5 Sizes testen
- [ ] Keyboard-Navigation (Enter, Space)
- [ ] Focus-States
- [ ] Disabled-State verhindert Click

---

## Architektur

### Datei-Struktur

```
src/components/OsButton/
├── OsButton.vue          # Hauptkomponente
├── OsButton.spec.ts      # Tests
├── button.variants.ts    # CVA-Varianten-Definition
├── index.ts              # Exports
└── STATUS.md             # Diese Datei
```

### CVA-Pattern

Die Komponente nutzt das CVA-Pattern (Class Variance Authority):

1. **button.variants.ts** - Definiert alle Varianten als Type-Safe Funktion
2. **OsButton.vue** - Nutzt `buttonVariants()` + `cn()` für finale Klassen
3. **Export** - Varianten-Funktion + Typen werden exportiert für Composability

### CSS-Variablen

Die Komponente nutzt CSS Custom Properties für Theming:

```css
--color-primary
--color-primary-contrast
--color-primary-hover
--color-secondary (etc.)
--color-danger (etc.)
--color-warning (etc.)
--color-success (etc.)
--color-info (etc.)
```

---

## Nächste Schritte

### Phase 1: Icon-Support (erfordert OsIcon)

1. OsIcon-Komponente erstellen
2. `icon` Prop hinzufügen (string für Icon-Name oder Komponente)
3. `iconPosition` Prop hinzufügen ('left' | 'right')
4. Layout für Icon + Text anpassen

### Phase 2: Loading-State (erfordert OsSpinner)

1. OsSpinner-Komponente erstellen
2. `loading` Prop hinzufügen
3. Bei loading: Spinner anzeigen, Button disabled

### Phase 3: Link-Support

1. `to` Prop für Vue Router Links
2. `href` Prop für externe Links
3. Dynamisches Element: `<button>` | `<router-link>` | `<a>`

### Phase 4: Circle-Variant

1. `circle` Prop hinzufügen
2. CVA-Variant für runden Button

---

## Abhängigkeiten

```
OsButton
├── Benötigt: cn() utility  Vorhanden
├── Benötigt: CVA           Vorhanden
├── Für Icon: OsIcon        Ausstehend (Tier 1)
├── Für Loading: OsSpinner  Ausstehend (Tier 1)
└── Für Link: Vue Router    Optional (nur für SPA-Links)
```

---

## Changelog

| Datum | Änderung |
|-------|----------|
| 2026-02-07 | Status-Datei erstellt |
| 2026-02-07 | CVA-Integration abgeschlossen |
| 2026-02-07 | 8 Varianten, 5 Sizes implementiert |
| 2026-02-07 | 9 Tests vorhanden |

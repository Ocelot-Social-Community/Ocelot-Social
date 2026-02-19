# Komponenten-Katalog

> Tracking der Katalogisierung aller bestehenden Komponenten.
> Diese Datei ermöglicht das Unterbrechen und Fortsetzen der Analyse.

---

## Fortschritt

### Übersicht
```
Phase 0: Analyse       ██████████ 100% (8/8 Schritte) ✅
Phase 3: OsButton      ██████████ 100% (133/133 Buttons) ✅
Phase 4: Tier 1        ██████████ 100% (OsButton, OsIcon, OsSpinner, OsCard) ✅
Phase 4: Tier A → HTML ██████████ 100% (10 ds-* Wrapper → Plain HTML) ✅
Phase 4: Tier B → HTML ░░░░░░░░░░   0% (ds-chip, ds-number, ds-grid, ds-radio)
Phase 4: Tier 2-4      ░░░░░░░░░░   0% (OsModal, OsInput, OsMenu, OsSelect, OsTable)
```

### Statistiken
| Metrik | Wert |
|--------|------|
| Webapp Komponenten | 139 |
| Styleguide Komponenten | 38 (23 in Webapp genutzt) |
| **Gesamt** | **177** |
| ✅ UI-Library | OsButton, OsIcon, OsSpinner, OsCard (4) |
| ✅ → Plain HTML | Section, Placeholder, Tag, List, ListItem, Container, Heading, Text, Space, Flex, FlexItem (11) |
| ⬜ → Plain HTML | Chip, Number, Grid, GridItem, Radio (5) — Tier B |
| ⬜ → UI-Library | Modal, Input, Menu, MenuItem, Select, Table (6) — Tier 2-4 |
| ⬜ Offen | Form (18 Dateien — HTML oder OsForm?) |
| ⬜ Nicht in Webapp | Code, CopyField, FormItem, InputError, InputLabel, Page, PageTitle, Logo, Avatar, TableCol, TableHeadCol (11) |

### OsButton Migration (Phase 3) ✅

**133 Buttons migriert in 79 Dateien ✅** — BaseButton.vue gelöscht, base-components.js Plugin entfernt.

**Erkenntnisse aus der Migration:**
- `type="submit"` muss explizit gesetzt werden (OsButton Default: `type="button"`)
- DsForm `errors` ist ein Objekt → `!!errors` für Boolean-Cast bei `:disabled`
- CSS `.base-button` Selektoren → `> button` oder `button`
- Filter-Buttons nutzen `:appearance="condition ? 'filled' : 'outline'"` Pattern
- Circle-Buttons mit Icon: `<template #icon><os-icon :icon="..." /></template>`

---

## Styleguide Komponenten (38)

> Quelle: `../../styleguide/src/system/components/`
> Live: http://styleguide.ocelot.social/

### Data Display
| # | Komponente | Status | Notizen |
|---|------------|--------|---------|
| 1 | Avatar | ⬜ Nicht genutzt | Webapp nutzt eigenes ProfileAvatar |
| 2 | Card | ✅ UI-Library | → OsCard (BaseCard gelöscht) |
| 3 | Chip | ⬜ Tier B | 5 Dateien → Plain HTML `<span class="ds-chip">` |
| 4 | Code | ⬜ Nicht genutzt | Nicht in Webapp verwendet |
| 5 | Icon | ✅ UI-Library | → OsIcon (BaseIcon gelöscht, 82 Ocelot-Icons) |
| 6 | Number | ⬜ Tier B | 5 Dateien → Plain HTML `<div class="ds-number">` |
| 7 | Placeholder | ✅ → HTML | Tier A: `<div class="ds-placeholder">` |
| 8 | Spinner | ✅ UI-Library | → OsSpinner (LoadingSpinner gelöscht) |
| 9 | Table | ⬜ Tier 4 | 7 Dateien → OsTable |
| 10 | TableCol | ⬜ Tier 4 | Intern von Table genutzt |
| 11 | TableHeadCol | ⬜ Tier 4 | Intern von Table genutzt |
| 12 | Tag | ✅ → HTML | Tier A: `<span class="ds-tag">` |

### Data Input
| # | Komponente | Status | Notizen |
|---|------------|--------|---------|
| 13 | Button | ✅ UI-Library | → OsButton (133 Buttons in 79 Dateien, BaseButton gelöscht) |
| 14 | CopyField | ⬜ Nicht genutzt | Nicht in Webapp verwendet |
| 15 | Form | ⬜ Offen | 18 Dateien — HTML `<form>` oder OsForm? |
| 16 | FormItem | ⬜ Nicht genutzt | Nicht in Webapp verwendet |
| 17 | Input | ⬜ Tier 2 | 23 Dateien → OsInput (gekoppelt mit Form) |
| 18 | InputError | ⬜ Nicht genutzt | Intern von Input genutzt |
| 19 | InputLabel | ⬜ Nicht genutzt | Intern von Input genutzt |
| 20 | Radio | ⬜ Tier B | 1 Datei → native `<input type="radio">` |
| 21 | Select | ⬜ Tier 4 | 3 Dateien → OsSelect |

### Layout
| # | Komponente | Status | Notizen |
|---|------------|--------|---------|
| 22 | Container | ✅ → HTML | Tier A: `<div class="ds-container ds-container-{width}">` |
| 23 | Flex | ✅ → HTML | Tier A: Plain HTML + CSS @media Queries |
| 24 | FlexItem | ✅ → HTML | Tier A: Plain HTML + CSS @media Queries |
| 25 | Grid | ⬜ Tier B | 2 Dateien → CSS Grid |
| 26 | GridItem | ⬜ Tier B | 8 Dateien → CSS Grid |
| 27 | Modal | ⬜ Tier 2 | 7 Dateien → OsModal |
| 28 | Page | ⬜ Nicht genutzt | Nicht direkt in Webapp verwendet |
| 29 | PageTitle | ⬜ Nicht genutzt | Nicht direkt in Webapp verwendet |
| 30 | Section | ✅ → HTML | Tier A: `<section class="ds-section">` |
| 31 | Space | ✅ → HTML | Tier A: `<div class="ds-mb-{size}">` / `<div class="ds-my-{size}">` |

### Navigation
| # | Komponente | Status | Notizen |
|---|------------|--------|---------|
| 32 | List | ✅ → HTML | Tier A: `<ul class="ds-list">` |
| 33 | ListItem | ✅ → HTML | Tier A: `<li class="ds-list-item">` |
| 34 | Logo | ⬜ Nicht genutzt | Webapp nutzt eigenes Logo |
| 35 | Menu | ⬜ Tier 3 | 11 Dateien → OsMenu |
| 36 | MenuItem | ⬜ Tier 3 | 6 Dateien → OsMenuItem |

### Typography
| # | Komponente | Status | Notizen |
|---|------------|--------|---------|
| 37 | Heading | ✅ → HTML | Tier A: `<h1-h4 class="ds-heading ds-heading-h{n}">` |
| 38 | Text | ✅ → HTML | Tier A: `<p class="ds-text ds-text-{color}">` |

---

## Webapp Komponenten (139)

> Quelle: `../../webapp/components/`

### Status-Legende
- ⬜ Ausstehend
- ⏳ In Arbeit
- ✅ Analysiert
- 🔗 Duplikat (siehe Notizen)
- ⛔ Nicht migrieren (veraltet/ungenutzt)
- 🔄 Konsolidieren (mit anderen zusammenführen)

### A-B
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 1 | ActionButton | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |
| 2 | ActionRadiusSelect | ⬜ Ausstehend | Input | | |
| 3 | AddChatRoomByUserSearch | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 4 | AddGroupMember | ⬜ Ausstehend | Feature | | Group-spezifisch |
| 5 | AvatarMenu | ⬜ Ausstehend | Navigation | Avatar + Menu | |
| 6 | AvatarUploader | ⬜ Ausstehend | Input | | |
| 7 | BadgeSelection | ⬜ Ausstehend | Input | | |
| 8 | Badges | ⬜ Ausstehend | Display | | |
| 9 | BadgesSection | ⬜ Ausstehend | Display | | |
| 10 | ~~BaseButton~~ | ✅ Gelöscht | Button | Button | → OsButton (133 Buttons, Komponente gelöscht) |
| 11 | ~~BaseCard~~ | ✅ Gelöscht | Layout | Card | → OsCard (~30 Dateien, Komponente gelöscht) |
| 12 | ~~BaseIcon~~ | ✅ Gelöscht | Display | Icon | → OsIcon (131 Nutzungen, Komponente gelöscht) |

### C
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 13 | CategoriesFilter | ⬜ Ausstehend | Filter | | |
| 14 | CategoriesMenu | ⬜ Ausstehend | Navigation | Menu | |
| 15 | CategoriesSelect | ✅ Migriert | Input | Select | Buttons → OsButton (icon) |
| 16 | ChangePassword | ⬜ Ausstehend | Feature | | Auth-spezifisch |
| 17 | Change | ⬜ Ausstehend | Feature | | |
| 18 | Chat | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 19 | ChatNotificationMenu | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 20 | CommentCard | ✅ Migriert | Display | Card | Buttons → OsButton, BaseCard → OsCard |
| 21 | CommentForm | ⬜ Ausstehend | Input | Form | |
| 22 | CommentList | ⬜ Ausstehend | Display | List | |
| 23 | ComponentSlider | ⬜ Ausstehend | Layout | | |
| 24 | ConfirmModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 25 | ContentMenu | ⬜ Ausstehend | Navigation | Menu | |
| 26 | ContentViewer | ⬜ Ausstehend | Display | | |
| 27 | ContextMenu | ⬜ Ausstehend | Navigation | Menu | |
| 28 | ContributionForm | ✅ Migriert | Feature | Form | Buttons → OsButton, ds-* → HTML |
| 29 | CounterIcon | ⬜ Ausstehend | Display | Icon | |
| 30 | CountTo | ⬜ Ausstehend | Display | Number | Animation |
| 31 | CreateInvitation | ⬜ Ausstehend | Feature | | |
| 32 | CtaJoinLeaveGroup | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |
| 33 | CtaUnblockAuthor | ✅ Migriert | Button | Button | Nutzt OsButton (icon, as="nuxt-link") |
| 34 | CustomButton | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |

### D-E
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 35 | DateTimeRange | ⬜ Ausstehend | Input | | |
| 36 | DeleteData | ⬜ Ausstehend | Feature | | |
| 37 | DeleteUserModal | ✅ Migriert | Feedback | Modal | 🔄 Modal-Familie, Buttons → OsButton |
| 38 | DisableModal | ✅ Migriert | Feedback | Modal | 🔄 Modal-Familie, Buttons → OsButton |
| 39 | DonationInfo | ✅ Migriert | Display | | Button → OsButton |
| 40 | Dropdown | ⬜ Ausstehend | Input | Select | |
| 41 | DropdownFilter | ⬜ Ausstehend | Filter | Select | |
| 42 | Editor | ⬜ Ausstehend | Input | | Rich-Text |
| 43 | EmailDisplayAndVerify | ⬜ Ausstehend | Feature | | |
| 44 | EmbedComponent | ✅ Migriert | Display | | Buttons → OsButton |
| 45 | EmotionButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 46 | Emotions | ⬜ Ausstehend | Feature | | |
| 47 | Empty | ⬜ Ausstehend | Feedback | Placeholder | |
| 48 | EnterNonce | ✅ Migriert | Feature | | Auth, Submit → OsButton |

### F-G
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 49 | EventsByFilter | ⬜ Ausstehend | Filter | | |
| 50 | FiledReportsTable | ⬜ Ausstehend | Display | Table | |
| 51 | FilterMenu | ⬜ Ausstehend | Navigation | Menu | |
| 52 | FilterMenuComponent | ⬜ Ausstehend | Navigation | Menu | |
| 53 | FilterMenuSection | ⬜ Ausstehend | Navigation | Menu | |
| 54 | FollowButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 55 | FollowingFilter | ⬜ Ausstehend | Filter | | |
| 56 | FollowList | ⬜ Ausstehend | Display | List | |
| 57 | GroupButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 58 | GroupContentMenu | ⬜ Ausstehend | Navigation | Menu | |
| 59 | GroupForm | ✅ Migriert | Input | Form | Buttons → OsButton |
| 60 | GroupLink | ⬜ Ausstehend | Navigation | | |
| 61 | GroupList | ⬜ Ausstehend | Display | List | |
| 62 | GroupMember | ✅ Migriert | Display | | Button → OsButton |
| 63 | GroupTeaser | ⬜ Ausstehend | Display | Card | |

### H-L
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 64 | Hashtag | ⬜ Ausstehend | Display | Tag/Chip | |
| 65 | HashtagsFilter | ⬜ Ausstehend | Filter | | |
| 66 | HeaderButton | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |
| 67 | HeaderMenu | ⬜ Ausstehend | Navigation | Menu | |
| 68 | ImageUploader | ✅ Migriert | Input | | Crop-Buttons → OsButton, Spinner → OsSpinner |
| 69 | index | ⬜ Ausstehend | ? | | Prüfen |
| 70 | InternalPage | ⬜ Ausstehend | Layout | Page | |
| 71 | Invitation | ⬜ Ausstehend | Feature | | |
| 72 | InvitationList | ⬜ Ausstehend | Display | List | |
| 73 | InviteButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 74 | JoinLeaveButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 75 | LabeledButton | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |
| 76 | LinkInput | ⬜ Ausstehend | Input | Input | |
| 77 | ~~LoadingSpinner~~ | ✅ Gelöscht | Feedback | Spinner | → OsSpinner (Komponente gelöscht) |
| 78 | LocaleSwitch | ⬜ Ausstehend | Navigation | | |
| 79 | LocationInfo | ⬜ Ausstehend | Display | | |
| 80 | LocationSelect | ✅ Migriert | Input | Select | Close-Button → OsButton (icon) |
| 81 | LocationTeaser | ⬜ Ausstehend | Display | Card | |
| 82 | LoginButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 83 | LoginForm | ⬜ Ausstehend | Feature | Form | Auth |
| 84 | Logo | ⬜ Ausstehend | Display | Logo | 🔗 DUPLIKAT (noch ungelöst) |

### M-O
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 85 | MapButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 86 | MapStylesButtons | ✅ Migriert | Button | Button | Button → OsButton |
| 87 | MasonryGrid | ⬜ Ausstehend | Layout | Grid | |
| 88 | MasonryGridItem | ⬜ Ausstehend | Layout | GridItem | |
| 89 | MenuBar | ⬜ Ausstehend | Navigation | Menu | |
| 90 | MenuBarButton | ✅ Migriert | Button | Button | 🔄 Button-Familie, nutzt OsButton |
| 91 | MenuLegend | ⬜ Ausstehend | Navigation | | |
| 92 | Modal | ⬜ Ausstehend | Feedback | Modal | 🔗 DUPLIKAT |
| 93 | MySomethingList | ✅ Migriert | Display | List | Buttons → OsButton |
| 94 | NotificationMenu | ✅ Migriert | Navigation | Menu | Buttons → OsButton |
| 95 | NotificationsTable | ⬜ Ausstehend | Display | Table | |
| 96 | ObserveButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 97 | OrderByFilter | ⬜ Ausstehend | Filter | | |

### P-R
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 98 | PageFooter | ⬜ Ausstehend | Layout | | |
| 99 | PageParamsLink | ⬜ Ausstehend | Navigation | | |
| 100 | PaginationButtons | ✅ Migriert | Navigation | | 2 Buttons → OsButton (icon, circle) |
| 101 | PostTeaser | ⬜ Ausstehend | Display | Card | |
| 102 | PostTypeFilter | ⬜ Ausstehend | Filter | | |
| 103 | ProfileAvatar | ⬜ Ausstehend | Display | Avatar | |
| 104 | ProfileList | ⬜ Ausstehend | Display | List | |
| 105 | ProgressBar | ⬜ Ausstehend | Feedback | | |
| 106 | RegistrationSlideCreate | ⬜ Ausstehend | Feature | | Auth |
| 107 | RegistrationSlideEmail | ⬜ Ausstehend | Feature | | Auth |
| 108 | RegistrationSlideInvite | ⬜ Ausstehend | Feature | | Auth |
| 109 | RegistrationSlideNonce | ⬜ Ausstehend | Feature | | Auth |
| 110 | RegistrationSlideNoPublic | ⬜ Ausstehend | Feature | | Auth |
| 111 | RegistrationSlider | ⬜ Ausstehend | Feature | | Auth |
| 112 | ReleaseModal | ✅ Migriert | Feedback | Modal | 🔄 Modal-Familie, Buttons → OsButton |
| 113 | ReportList | ⬜ Ausstehend | Display | List | |
| 114 | ReportModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 115 | ReportRow | ✅ Migriert | Display | | More Details → OsButton |
| 116 | ReportsTable | ⬜ Ausstehend | Display | Table | |
| 117 | Request | ⬜ Ausstehend | Feature | | |
| 118 | ResponsiveImage | ⬜ Ausstehend | Display | | |

### S
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 119 | SearchableInput | ⬜ Ausstehend | Input | Input | |
| 120 | SearchField | ⬜ Ausstehend | Input | Input | |
| 121 | SearchGroup | ⬜ Ausstehend | Feature | | Search |
| 122 | SearchHeading | ⬜ Ausstehend | Display | Heading | |
| 123 | SearchPost | ⬜ Ausstehend | Feature | | Search |
| 124 | SearchResults | ⬜ Ausstehend | Feature | | Search |
| 125 | SelectUserSearch | ⬜ Ausstehend | Input | Select | |
| 126 | ShoutButton | ✅ Migriert | Button | Button | Nutzt OsButton intern |
| 127 | ShowPassword | ⬜ Ausstehend | Input | | |
| 128 | Signup | ⬜ Ausstehend | Feature | | Auth |
| 129 | SocialMedia | ⬜ Ausstehend | Display | | |
| 130 | SocialMediaListItem | ⬜ Ausstehend | Display | ListItem | |
| 131 | Strength | ⬜ Ausstehend | Feedback | | Password |
| 132 | SuggestionList | ⬜ Ausstehend | Display | List | |

### T-Z
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 133 | TabNavigation | ⬜ Ausstehend | Navigation | | |
| 134 | UserTeaser | ⬜ Ausstehend | Display | Card | |
| 135 | UserTeaserHelper | ⬜ Ausstehend | Display | | |
| 136 | UserTeaserNonAnonymous | ⬜ Ausstehend | Display | | |
| 137 | UserTeaserPopover | ✅ Migriert | Display | | Button → OsButton |

---

## Identifizierte Duplikate & Konsolidierung

### Direkte Duplikate (Webapp ↔ Styleguide)
| Webapp | Styleguide | Aktion | Status |
|--------|------------|--------|--------|
| Logo | Logo | Konsolidieren zu OsLogo | ⬜ Ausstehend |
| Modal | Modal | Konsolidieren zu OsModal | ⬜ Ausstehend |
| ~~BaseCard~~ | Card | → OsCard | ✅ Erledigt (BaseCard gelöscht) |
| ~~BaseIcon~~ | Icon | → OsIcon | ✅ Erledigt (BaseIcon gelöscht) |
| ~~LoadingSpinner~~ | Spinner | → OsSpinner | ✅ Erledigt (LoadingSpinner gelöscht) |

### Button-Familie ✅ (alle nutzen OsButton)
| Komponente | Status | Notizen |
|------------|--------|---------|
| ~~Button (Styleguide)~~ | ✅ Ersetzt | → OsButton |
| ~~BaseButton~~ | ✅ Gelöscht | → OsButton (133 Buttons) |
| CustomButton | ✅ Nutzt OsButton | Feature-Wrapper |
| ActionButton | ✅ Nutzt OsButton | Feature-Wrapper |
| HeaderButton | ✅ Nutzt OsButton | Feature-Wrapper |
| LabeledButton | ✅ Nutzt OsButton | Feature-Wrapper |
| MenuBarButton | ✅ Nutzt OsButton | Feature-Wrapper |
| FollowButton | ✅ Nutzt OsButton | Feature-spezifisch |
| GroupButton | ✅ Nutzt OsButton | Feature-spezifisch |
| InviteButton | ✅ Nutzt OsButton | Feature-spezifisch |
| LoginButton | ✅ Nutzt OsButton | Feature-spezifisch |
| EmotionButton | ✅ Nutzt OsButton | Feature-spezifisch |
| JoinLeaveButton | ✅ Nutzt OsButton | Feature-spezifisch |
| MapButton | ✅ Nutzt OsButton | Feature-spezifisch |
| MapStylesButtons | ✅ Nutzt OsButton | Feature-spezifisch |
| PaginationButtons | ✅ Nutzt OsButton | Feature-spezifisch |
| CtaJoinLeaveGroup | ✅ Nutzt OsButton | Feature-spezifisch |
| CtaUnblockAuthor | ✅ Nutzt OsButton | Feature-spezifisch |

### Modal-Familie (zur Konsolidierung)
| Komponente | Beschreibung | Ziel |
|------------|--------------|------|
| Modal (Styleguide) | Basis-Modal | OsModal |
| Modal (Webapp) | Basis-Modal | → OsModal |
| ConfirmModal | Bestätigungs-Dialog | → OsModal type="confirm" |
| DeleteUserModal | Löschen-Dialog | → OsModal type="confirm" |
| DisableModal | Deaktivieren-Dialog | → OsModal type="confirm" |
| ReleaseModal | Release-Dialog | Feature-spezifisch |
| ReportModal | Report-Dialog | Feature-spezifisch |

### Menu-Familie (zur Konsolidierung)
| Komponente | Beschreibung | Ziel |
|------------|--------------|------|
| Menu (Styleguide) | Basis-Menu | OsMenu |
| MenuItem (Styleguide) | Menu-Item | OsMenuItem |
| HeaderMenu | Header-Navigation | → OsMenu |
| ContentMenu | Kontext-Menu | → OsMenu variant |
| ContextMenu | Kontext-Menu | → OsMenu variant |
| FilterMenu | Filter-Menu | → OsMenu variant |
| NotificationMenu | Benachrichtigungen | Feature-spezifisch |
| CategoriesMenu | Kategorien | Feature-spezifisch |
| AvatarMenu | User-Menu | Feature-spezifisch |

---

## Kategorisierung

### Basis-Komponenten — UI-Library ✅
- ~~Button → OsButton~~ ✅
- ~~Card → OsCard~~ ✅
- ~~Icon → OsIcon~~ ✅
- ~~Spinner → OsSpinner~~ ✅

### Basis-Komponenten — UI-Library (ausstehend)
- Modal → OsModal
- Input → OsInput
- Select → OsSelect
- Avatar → OsAvatar (falls benötigt)

### Layout & Typography — → Plain HTML ✅ (Tier A)
- ~~Container, Flex, FlexItem, Section, Space~~ ✅ → HTML + CSS
- ~~Heading, Text, List, ListItem, Tag, Placeholder~~ ✅ → HTML + CSS

### Noch zu migrieren (Tier B → Plain HTML)
- Chip, Number, Grid, GridItem, Radio

### Feature-Komponenten (bleiben in Webapp)
- Chat, Group, Registration, Search, etc.

---

## Analyse-Protokoll

| Datum | Bearbeiter | Aktion | Details |
|-------|------------|--------|---------|
| 2026-02-04 | Claude | Katalog erstellt | 177 Komponenten erfasst |
| 2026-02-04 | Claude | Duplikate identifiziert | Button, Modal, Menu Familien |
| 2026-02-04 | Claude | Button-Analyse | Props-Vergleich, Konsolidierungsvorschlag, Token-Extraktion |
| 2026-02-04 | Claude | Modal-Analyse | Architektur erkannt: DsModal = Basis, Feature-Modals nutzen DsModal |
| 2026-02-04 | Claude | Menu-Analyse | DsMenu, Dropdown, Feature-Menus - 3 separate Patterns identifiziert |
| 2026-02-04 | Claude | Priorisierung | 15 Komponenten in 4 Tiers priorisiert |
| 2026-02-04 | Claude | Konsolidierungsplan | 3 Phasen definiert, Token-Liste erstellt |
| 2026-02-04 | Claude | **Phase 0 abgeschlossen** | Bereit für Phase 2 (Projekt-Setup) |
| 2026-02-08 | Claude | OsButton entwickelt | CVA-Varianten, Vue 2/3 kompatibel via vue-demi |
| 2026-02-08 | Claude | Webapp-Integration | Jest Mock, Docker Build, CI-Kompatibilität |
| 2026-02-08 | Claude | **16 Buttons migriert** | Alle ohne icon/circle/loading Props, validiert |
| 2026-02-08 | Claude | OsButton erweitert | attrs/listeners Forwarding für Vue 2 ($listeners) |
| 2026-02-09 | Claude | Scope erweitert | ~90 Buttons identifiziert (16 migriert, 14 ohne Props, ~60 mit Props) |
| 2026-02-09 | Claude | **Milestone 4a: 8 Buttons** | DisableModal, DeleteUserModal, ReleaseModal, ContributionForm, EnterNonce, MySomethingList, ImageUploader (2x) |
| 2026-02-09 | Claude | **Milestone 4a abgeschlossen** | 6 weitere: donations, profile (2x), badges, notifications/index, ReportRow |
| 2026-02-11 | Claude | **M4b: icon + circle** | icon-Slot implementiert, circle-Prop mit CVA |
| 2026-02-11 | Claude | **9 icon-Buttons migriert (M4c)** | DisableModal, DeleteUserModal, CtaUnblockAuthor, LocationSelect, CategoriesSelect, my-email-address, profile Chat, PaginationButtons (2x circle) |
| 2026-02-11→18 | Claude | **Sessions 12-26** | OsButton M4c abgeschlossen, OsIcon, OsSpinner, OsCard implementiert + Webapp-Migration, BaseButton/BaseCard/BaseIcon/LoadingSpinner gelöscht |
| 2026-02-19 | Claude | **Tier A Migration** | 10 ds-* Vue-Wrapper → Plain HTML + CSS, _ds-compat.scss, ~450 Nutzungen in ~90 Dateien |
| 2026-02-19 | Claude | **Katalog konsolidiert** | Styleguide- und Webapp-Tabellen aktualisiert, veraltete Status korrigiert |

---

## Nächste Schritte

### Phase 0: Analyse ✅
1. [x] Webapp-Komponenten auflisten
2. [x] Styleguide-Komponenten auflisten
3. [x] Duplikate und Familien identifizieren
4. [x] Button/Modal/Menu im Detail analysieren
5. [x] Priorisierung und Konsolidierungsplan

### Phase 3: OsButton Migration ✅
6. [x] OsButton entwickeln (CVA, vue-demi)
7. [x] 133 Buttons in 79 Dateien migriert
8. [x] BaseButton.vue gelöscht, base-components.js Plugin entfernt

### Phase 4: Tier 1 — UI-Library Kern ✅
9. [x] OsIcon + 82 Ocelot-Icons, BaseIcon gelöscht
10. [x] OsSpinner + Webapp-Migration, LoadingSpinner gelöscht
11. [x] OsCard + Webapp-Migration, BaseCard gelöscht

### Phase 4: Tier A — ds-* → Plain HTML ✅
12. [x] _ds-compat.scss Utility-Klassen
13. [x] 10 ds-* Wrapper → HTML + CSS (~450 Nutzungen, ~90 Dateien)

### Phase 4: Tier B — ds-* → Plain HTML (ausstehend)
14. [ ] ds-chip (5 Dateien) → `<span class="ds-chip">`
15. [ ] ds-number (5 Dateien) → `<div class="ds-number">`
16. [ ] ds-grid / ds-grid-item (10 Dateien) → CSS Grid
17. [ ] ds-radio (1 Datei) → native `<input type="radio">`

### Phase 4: Tier 2-4 — UI-Library (ausstehend)
18. [ ] OsModal (7 Dateien)
19. [ ] OsInput (23 Dateien, gekoppelt mit ds-form)
20. [ ] OsMenu / OsMenuItem (17 Dateien)
21. [ ] OsSelect (3 Dateien), OsTable (7 Dateien)
22. [ ] ds-form → HTML `<form>` oder OsForm (18 Dateien)

---

**✅ Phase 0-3 abgeschlossen. Phase 4: Tier 1 + Tier A ✅, Tier B + Tier 2-4 ausstehend.**

---

## Detailanalyse: Button-Familie

### Styleguide Button (DsButton)

**Pfad:** `styleguide/src/system/components/navigation/Button/Button.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| path | String\|Object | null | URL oder Vue Router Pfad |
| size | String | null | `small` \| `base` \| `large` |
| linkTag | String | auto | `router-link` \| `a` \| `button` |
| name | String | null | Accessibility name |
| primary | Boolean | false | Primärer Stil (grün) |
| secondary | Boolean | false | Sekundärer Stil (blau) |
| danger | Boolean | false | Danger Stil (rot) |
| hover | Boolean | false | Hover-State erzwingen |
| ghost | Boolean | false | Transparenter Hintergrund |
| icon | String | null | Icon-Name |
| right | Boolean | false | Icon rechts positionieren |
| fullwidth | Boolean | false | Volle Breite |
| loading | Boolean | false | Ladezustand |

**Besonderheiten:**
- Automatische Link-Erkennung (router-link/a/button)
- Icon-Only Modus wenn kein Slot-Content
- Spinner bei loading
- CSS-Klassen: `ds-button`, `ds-button-primary`, etc.

---

### Webapp BaseButton

**Pfad:** `webapp/components/_new/generic/BaseButton/BaseButton.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| bullet | Boolean | false | Kleiner runder Punkt (18px) |
| circle | Boolean | false | Runder Button |
| danger | Boolean | false | Danger-Farbschema |
| filled | Boolean | false | Gefüllter Hintergrund |
| ghost | Boolean | false | Ohne Border |
| icon | String | - | Icon-Name |
| loading | Boolean | false | Ladezustand |
| size | String | 'regular' | `tiny` \| `small` \| `regular` \| `large` |
| padding | Boolean | false | Extra Padding |
| type | String | 'button' | `button` \| `submit` |
| disabled | Boolean | false | Deaktiviert |

**Besonderheiten:**
- Kein automatischer Link-Support (nur `<button>`)
- Nutzt `buttonStates` Mixin für Farben
- CSS-Klassen: `base-button`, `--filled`, `--ghost`, etc.
- Zusätzliche Größe: `tiny`
- Zusätzliche Form: `bullet`

---

### Vergleich: Styleguide vs Webapp

| Feature | Styleguide (DsButton) | Webapp (BaseButton) |
|---------|----------------------|---------------------|
| **Sizes** | small, base, large | tiny, small, regular, large |
| **Varianten** | primary, secondary, danger | danger (+ filled) |
| **Formen** | icon-only (auto) | circle, bullet, icon-only (auto) |
| **Ghost** | ✅ | ✅ |
| **Loading** | ✅ Spinner | ✅ LoadingSpinner |
| **Link-Support** | ✅ path prop | ❌ |
| **Fullwidth** | ✅ | ❌ |
| **Icon-Position** | ✅ left/right | ❌ nur links |
| **Submit-Type** | ❌ | ✅ |
| **CSS-Prefix** | ds-button | base-button |

---

### Wrapper-Komponenten (nutzen BaseButton)

| Komponente | Zweck | Eigene Props | Migration |
|------------|-------|--------------|-----------|
| **ActionButton** | Button + Counter Badge | count, text, icon, filled | Eigene Komponente behalten |
| **LabeledButton** | Button + Label darunter | icon, label, filled | Eigene Komponente behalten |
| **HeaderButton** | Filter-Button + Remove | title, clickButton, titleRemove, clickRemove | Feature-spezifisch |
| **MenuBarButton** | Editor-Toolbar | isActive, icon, label, onClick | Feature-spezifisch |
| **CustomButton** | Button mit externem Icon | settings (Object) | Feature-spezifisch |

**Erkenntnis:** Diese Wrapper fügen Layout/Logik hinzu, nicht Button-Varianten.

---

### Feature-Buttons (Business-Logik) ✅

Feature-Buttons behalten Business-Logik, nutzen aber intern alle OsButton:

| Komponente | Status |
|------------|--------|
| FollowButton | ✅ Nutzt OsButton |
| GroupButton | ✅ Nutzt OsButton |
| InviteButton | ✅ Nutzt OsButton |
| LoginButton | ✅ Nutzt OsButton |
| ShoutButton | ✅ Nutzt OsButton |
| ObserveButton | ✅ Nutzt OsButton |
| EmotionButton | ✅ Nutzt OsButton |
| JoinLeaveButton | ✅ Nutzt OsButton |
| MapButton | ✅ Nutzt OsButton |
| MapStylesButtons | ✅ Nutzt OsButton |
| PaginationButtons | ✅ Nutzt OsButton |

---

### Konsolidierungsvorschlag: OsButton ✅ IMPLEMENTIERT

> **Hinweis:** Die tatsächliche API weicht vom ursprünglichen Vorschlag ab.
> Siehe `packages/ui/src/components/OsButton/OsButton.vue` für die aktuelle Implementierung.

**Implementierte API (CVA-basiert):**
```typescript
interface OsButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info'
  appearance?: 'filled' | 'outline' | 'ghost'  // statt separate booleans
  size?: 'sm' | 'md' | 'lg' | 'xl'             // vereinfachte Größen
  circle?: boolean
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  as?: 'button' | 'a' | 'nuxt-link' | 'router-link' | Component  // polymorphes Rendering
  type?: 'button' | 'submit' | 'reset'
  // Icon: slot-basiert (<template #icon>), nicht prop-basiert
}
```

---

### Verwendete Design-Tokens (tatsächlich genutzt)

**Farben:**
- `$color-primary`, `$color-primary-dark`, `$color-primary-light`
- `$color-danger`, `$color-danger-dark`, `$color-danger-light`
- `$color-neutral-60`, `$color-neutral-80`, `$color-neutral-100`
- `$text-color-base`, `$text-color-primary-inverse`, etc.
- `$background-color-*`

**Größen:**
- `$size-button-tiny`, `$size-button-small`, `$size-button-base`, `$size-button-large`
- `$input-height`, `$input-height-small`, `$input-height-large`, `$input-height-x-large`

**Spacing:**
- `$space-x-small`, `$space-xx-small`, `$space-small`, `$space-base`

**Typography:**
- `$font-size-small`, `$font-size-base`, `$font-size-large`
- `$font-weight-bold`
- `$letter-spacing-large`

**Border:**
- `$border-size-base`
- `$border-radius-x-large`, `$border-radius-base`, `$border-radius-rounded`

**Animation:**
- `$duration-short`

---

### Offene Fragen ✅ (alle gelöst)

1. ~~secondary Variante~~ → ✅ Ja, implementiert als `variant="secondary"`
2. ~~x-large Size~~ → ✅ Implementiert als `size="xl"`
3. ~~bullet Form~~ → ✅ Nicht übernommen, `circle` + custom CSS reicht

---

## Detailanalyse: Modal-Familie

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  DsModal (Styleguide)                                       │
│  = Basis-Modal-Komponente                                   │
├─────────────────────────────────────────────────────────────┤
│       ↓ wird genutzt von                                    │
├─────────────────────────────────────────────────────────────┤
│  ConfirmModal, DisableModal, ReportModal, etc.              │
│  = Feature-Modals mit Business-Logik                        │
├─────────────────────────────────────────────────────────────┤
│       ↓ werden gerendert von                                │
├─────────────────────────────────────────────────────────────┤
│  Modal.vue (Webapp)                                         │
│  = Modal-Manager (Router via Vuex-State)                    │
└─────────────────────────────────────────────────────────────┘
```

**Erkenntnis:** Die Webapp `Modal.vue` ist **KEIN Duplikat** von DsModal, sondern ein State-basierter Modal-Router.

---

### Styleguide DsModal

**Pfad:** `styleguide/src/system/components/layout/Modal/Modal.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| title | String | null | Modal-Titel |
| isOpen | Boolean | false | Geöffnet-Status (v-model) |
| force | Boolean | false | Schließen verhindern (kein ESC, kein Backdrop-Click) |
| extended | Boolean | false | Breiterer Modal (600px statt 400px) |
| cancelLabel | String | 'Cancel' | Text für Abbrechen-Button |
| confirmLabel | String | 'Confirm' | Text für Bestätigen-Button |

**Events:**
- `@opened` - Modal wurde geöffnet
- `@cancel` - Abbrechen geklickt
- `@confirm` - Bestätigen geklickt
- `@close` - Modal geschlossen (mit type: 'close', 'cancel', 'confirm', 'backdrop')
- `@update:isOpen` - v-model Support

**Slots:**
- `default` - Modal-Inhalt
- `footer` - Footer mit Buttons (erhält confirm/cancel Funktionen als Slot-Props)

**Features:**
- ESC-Taste zum Schließen
- Backdrop-Click zum Schließen
- Scroll-Lock auf Body
- Animations (fade + scale)
- Nutzt DsCard für Layout

---

### Feature-Modals (nutzen DsModal)

| Modal | Business-Logik | Migration |
|-------|----------------|-----------|
| **ConfirmModal** | Generischer Confirm-Dialog mit Callbacks | Bleibt, nutzt OsModal |
| **DisableModal** | GraphQL Mutation für Disable | Bleibt, nutzt OsModal |
| **ReportModal** | Report-Logik | Bleibt, nutzt OsModal |
| **DeleteUserModal** | User-Lösch-Logik | Bleibt, nutzt OsModal |
| **ReleaseModal** | Release-Logik | Bleibt, nutzt OsModal |

**Erkenntnis:** Alle Feature-Modals nutzen bereits DsModal als Basis und fügen nur spezifische Business-Logik hinzu. Dies ist das gewünschte Pattern!

---

### Webapp Modal.vue (Modal-Manager)

**Pfad:** `webapp/components/Modal.vue`

**Funktion:** Kein UI-Modal, sondern ein **State-basierter Modal-Router**:
- Liest `modal/open` und `modal/data` aus Vuex
- Rendert das passende Feature-Modal basierend auf State
- Leitet Props an Feature-Modals weiter

**Mögliche Migration:**
- Als `OsModalManager` beibehalten oder
- Durch Vue 3 `<Teleport>` + Composable ersetzen

---

### Konsolidierungsvorschlag: OsModal

```typescript
interface OsModalProps {
  // Basis
  title?: string
  isOpen: boolean           // v-model:open

  // Verhalten
  persistent?: boolean      // = force (Schließen verhindern)
  closeOnBackdrop?: boolean // Default: true
  closeOnEsc?: boolean      // Default: true

  // Größe
  size?: 'default' | 'large' | 'fullscreen'

  // Footer
  showFooter?: boolean
  cancelLabel?: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
}
```

**Slots:**
- `default` - Inhalt
- `header` - Custom Header (ersetzt title)
- `footer` - Custom Footer

**Nicht übernommen:**
- `extended` prop → wird zu `size="large"`

---

### Verwendete Design-Tokens (tatsächlich genutzt)

**Layout:**
- `$z-index-modal` (9999)
- `$space-base`, `$space-small`, `$space-x-small`, `$space-large`
- `$border-radius-x-large`

**Farben:**
- `$background-color-softer` (Footer)

**Shadows:**
- `$box-shadow-x-large`

**Animation:**
- `$ease-out-bounce`

---

## Detailanalyse: Menu-Familie

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  DsMenu / DsMenuItem (Styleguide)                           │
│  = Routen-basierte Navigationskomponenten                   │
├─────────────────────────────────────────────────────────────┤
│       ↓ wird genutzt von                                    │
├─────────────────────────────────────────────────────────────┤
│  ContentMenu, GroupContentMenu                              │
│  = Dropdown + DsMenu für Kontext-Menüs                      │
├─────────────────────────────────────────────────────────────┤
│  Dropdown (Webapp)                                          │
│  = Eigenständiger Popover-Wrapper (v-popover)               │
├─────────────────────────────────────────────────────────────┤
│  HeaderMenu                                                 │
│  = Komplexes Layout (DsFlex-basiert), KEIN DsMenu           │
├─────────────────────────────────────────────────────────────┤
│  AvatarMenu, NotificationMenu, FilterMenu, etc.             │
│  = Feature-spezifische Menüs mit eigener Logik              │
└─────────────────────────────────────────────────────────────┘
```

**Erkenntnis:** DsMenu wird nur für strukturierte Routen-Navigation verwendet. Die meisten Webapp-Menüs sind Feature-spezifisch und bauen eigene Strukturen.

---

### Styleguide DsMenu

**Pfad:** `styleguide/src/system/components/navigation/Menu/Menu.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| routes | Array | null | Array von Route-Objekten |
| inverse | Boolean | false | Dunkler Hintergrund |
| navbar | Boolean | false | Horizontale Navbar-Darstellung |
| linkTag | String | 'router-link' | Link-Komponente |
| urlParser | Function | default | URL-Parser für Routes |
| nameParser | Function | default | Name-Parser für Routes |
| matcher | Function | default | Active-State Matcher |
| isExact | Function | default | Exact-Match Checker |

**Slots:**
- `default` - Custom Menu-Items
- `menuitem` (scoped) - Custom MenuItem Template

**Features:**
- Automatische URL-Generierung aus Route-Namen
- Submenu-Support via `route.children`
- Active-State Tracking

---

### Styleguide DsMenuItem

**Pfad:** `styleguide/src/system/components/navigation/Menu/MenuItem.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| route | Object | null | Route-Objekt |
| parents | Array | [] | Parent-Routes (für Submenu) |
| linkTag | String | from parent | Link-Komponente |

**Features:**
- Automatische Submenu-Erkennung via `route.children`
- Hover/Click Submenu Toggle (bei navbar)
- Click-Outside zum Schließen
- Level-basierte CSS-Klassen

---

### Webapp Dropdown

**Pfad:** `webapp/components/Dropdown.vue`

**Props:**
| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| placement | String | 'bottom-end' | Popover-Position |
| disabled | Boolean | false | Deaktiviert |
| offset | String\|Number | '16' | Abstand vom Trigger |
| noMouseLeaveClosing | Boolean | false | Verhindert Schließen bei Mouse-Leave |

**Slot-Props:**
- `toggleMenu()` - Toggle Funktion
- `openMenu()` - Öffnen Funktion
- `closeMenu()` - Schließen Funktion
- `isOpen` - Geöffnet-State

**Features:**
- Nutzt v-popover
- Hover-Verzögerung (500ms open, 300ms close)
- Body-Class bei Open

**Erkenntnis:** Dies ist das **primäre Dropdown-Pattern** in der Webapp - nicht DsMenu!

---

### Kategorisierung der Menu-Komponenten

| Komponente | Typ | Nutzt DsMenu | Migration |
|------------|-----|--------------|-----------|
| **ContentMenu** | Kontext-Menü | ✅ | OsDropdown + OsMenu |
| **GroupContentMenu** | Kontext-Menü | ✅ | OsDropdown + OsMenu |
| **HeaderMenu** | Layout | ❌ | Bleibt Feature-spezifisch |
| **AvatarMenu** | Feature | ❌ | Bleibt Feature-spezifisch |
| **NotificationMenu** | Feature | ❌ | Bleibt Feature-spezifisch |
| **FilterMenu** | Feature | ❌ | Bleibt Feature-spezifisch |
| **CategoriesMenu** | Feature | ❌ | Bleibt Feature-spezifisch |
| **ChatNotificationMenu** | Feature | ❌ | Bleibt Feature-spezifisch |
| **MenuBar** | Editor | ❌ | Bleibt Feature-spezifisch |
| **ContextMenu** (Editor) | Editor | ❌ | Bleibt Feature-spezifisch |

---

### Konsolidierungsvorschlag

**Drei separate Komponenten:**

1. **OsMenu** (für Navigation)
```typescript
interface OsMenuProps {
  routes?: RouteItem[]
  orientation?: 'vertical' | 'horizontal'
  inverse?: boolean
}
```

2. **OsMenuItem** (für Menu-Items)
```typescript
interface OsMenuItemProps {
  to?: string | RouteLocationRaw
  href?: string
  icon?: string
  active?: boolean
}
```

3. **OsDropdown** (für Popover-Menüs) - **NEU**
```typescript
interface OsDropdownProps {
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | ...
  offset?: number
  disabled?: boolean
  closeOnClick?: boolean
  closeOnOutsideClick?: boolean
}
```

**Erkenntnis:** OsDropdown ist wichtiger als OsMenu, da es häufiger verwendet wird!

---

### Verwendete Design-Tokens (tatsächlich genutzt)

**Spacing:**
- `$space-x-small`, `$space-xx-small`

**Typography:**
- Font-Size via DsText

**Farben:**
- Inverse-Modus Farben

---

## Priorisierung der Komponenten

### Tier 1: Kern-Komponenten ✅

| # | Komponente | Status |
|---|------------|--------|
| 1 | **OsButton** | ✅ 133 Buttons in 79 Dateien, BaseButton gelöscht |
| 2 | **OsIcon** | ✅ 131 Nutzungen, 82 Ocelot-Icons, BaseIcon gelöscht |
| 3 | **OsSpinner** | ✅ 4 Spinner migriert, LoadingSpinner gelöscht |
| 4 | **OsCard** | ✅ ~30 Dateien, BaseCard gelöscht |

### Tier A: Triviale ds-* → Plain HTML ✅

| # | Komponente | Status |
|---|------------|--------|
| — | ds-section, ds-placeholder, ds-tag, ds-list, ds-list-item | ✅ → HTML-Elemente + CSS-Klassen |
| — | ds-container, ds-heading, ds-text | ✅ → HTML-Elemente + CSS-Klassen |
| — | ds-space | ✅ → div + Margin-Utility-Klassen |
| — | ds-flex, ds-flex-item | ✅ → HTML + CSS @media Queries |

### Tier B: Einfache ds-* → Plain HTML (ausstehend)

| # | Komponente | Dateien | Ziel |
|---|------------|---------|------|
| — | ds-chip | 5 | `<span class="ds-chip">` |
| — | ds-number | 5 | `<div class="ds-number">` |
| — | ds-grid / ds-grid-item | 10 | CSS Grid |
| — | ds-radio | 1 | native `<input type="radio">` |

### Tier 2: Layout & Feedback (ausstehend)

| # | Komponente | Dateien | Abhängigkeiten |
|---|------------|---------|----------------|
| 5 | **OsModal** | 7 | OsButton, OsCard |
| 6 | **OsDropdown** | — | OsButton |
| 7 | **OsAvatar** | — | - |
| 8 | **OsInput** | 23 | gekoppelt mit ds-form (18 Dateien) |

### Tier 3: Navigation (ausstehend)

| # | Komponente | Dateien | Abhängigkeiten |
|---|------------|---------|----------------|
| 9 | **OsMenu** | 11 | OsMenuItem |
| 10 | **OsMenuItem** | 6 | - |

### Tier 4: Spezial-Komponenten (ausstehend)

| # | Komponente | Dateien |
|---|------------|---------|
| 11 | OsSelect | 3 |
| 12 | OsTable | 7 |
| 13 | ds-form → HTML `<form>` oder OsForm | 18 |

> **Hinweis:** OsHeading, OsText, OsTag sind nicht mehr geplant — wurden zu Plain HTML migriert (Tier A).

---

## Finaler Konsolidierungsplan

> **Hinweis:** "Tier 1/A/B/2/3/4" bezeichnet die Migrations-Reihenfolge innerhalb von Phase 4.

### Tier 1: Kern-Komponenten ✅

```
1. OsIcon    ✅ Vereint: DsIcon + BaseIcon → 82 Ocelot-Icons
2. OsSpinner ✅ Vereint: DsSpinner + LoadingSpinner
3. OsButton  ✅ Vereint: DsButton + BaseButton → 133 Buttons in 79 Dateien
4. OsCard    ✅ Vereint: DsCard + BaseCard → ~30 Dateien
```

### Tier A: Triviale ds-* Wrapper → Plain HTML ✅

```
ds-section, ds-placeholder, ds-tag, ds-list, ds-list-item  ✅ → HTML + CSS-Klassen
ds-container, ds-heading, ds-text                           ✅ → HTML + CSS-Klassen
ds-space                                                     ✅ → div + Margin-Utilities
ds-flex, ds-flex-item                                        ✅ → HTML + CSS @media Queries
```

### Tier B: Einfache ds-* → Plain HTML (ausstehend)

```
ds-chip, ds-number, ds-grid/ds-grid-item, ds-radio → Plain HTML + CSS
```

### Tier 2-4: UI-Library (ausstehend)

```
5. OsModal    → Basis: DsModal, Feature-Modals bleiben in Webapp
6. OsDropdown → Basis: Dropdown (Webapp) — wichtiger als gedacht!
7. OsAvatar   → Vereint: DsAvatar + ProfileAvatar
8. OsInput    → Basis: DsInput, gekoppelt mit ds-form
9. OsMenu     → Basis: DsMenu/DsMenuItem
10. OsSelect  → Basis: DsSelect
11. OsTable   → Basis: DsTable
```

---

## Erkenntnisse aus der Analyse

### Was funktioniert gut:
1. **DsModal als Basis** - Feature-Modals nutzen bereits DsModal → OsModal wird gleich funktionieren
2. **Dropdown-Pattern** - Funktioniert gut mit v-popover
3. **Tier A Migration** - 10 ds-* Wrapper durch HTML + CSS ersetzt, kein Funktionsverlust

### Was gelöst wurde: ✅
1. ~~Button-Varianten~~ → OsButton mit CVA-Varianten vereinheitlicht
2. ~~Inkonsistente Naming~~ → os-* Prefix für Library, ds-* CSS-Klassen temporär beibehalten
3. ~~Doppelte Komponenten~~ → BaseCard, BaseIcon, LoadingSpinner gelöscht (3/5 Duplikate aufgelöst)
4. ~~Layout-Shift bei ds-flex~~ → CSS @media Queries statt JavaScript window.innerWidth

### Noch offen:
1. **Logo** - Existiert doppelt (Webapp + Styleguide)
2. **Modal** - Existiert doppelt (Webapp Modal.vue ist Modal-Router, DsModal ist UI)
3. **ds-form Kopplung** - ds-input und ds-form sind stark gekoppelt (Schema-Validation)

---

## Token-Extraktion (aus Analyse)

### Benötigte Design-Tokens für Phase 1

**Farben:**
```scss
// Primär/Sekundär/Danger
$color-primary, $color-primary-dark, $color-primary-light
$color-secondary, $color-secondary-dark, $color-secondary-light
$color-danger, $color-danger-dark, $color-danger-light

// Neutral
$color-neutral-60, $color-neutral-80, $color-neutral-100

// Semantisch
$text-color-base, $text-color-inverse
$background-color-softer, $background-color-soft
$border-color-base
```

**Größen:**
```scss
$size-button-tiny: 24px
$size-button-small: 32px
$size-button-base: 40px
$size-button-large: 48px
```

**Spacing:**
```scss
$space-xx-small: 4px
$space-x-small: 8px
$space-small: 16px
$space-base: 24px
```

**Border:**
```scss
$border-size-base: 1px
$border-radius-base: 4px
$border-radius-x-large: 5px
$border-radius-rounded: 2em
```

**Animation:**
```scss
$duration-short: 0.08s
```

**Z-Index:**
```scss
$z-index-modal: 9999
$z-index-dropdown: 8888
```

**Shadows:**
```scss
$box-shadow-x-large: 0 15px 30px 0 rgba(0,0,0,.11), ...
$box-shadow-small-inset: inset 0 0 0 1px rgba(0,0,0,.05)
```

---

## Phase 3: Webapp-Integration (Tracking)

### OsButton Migration - Abgeschlossen (133/133) ✅

| # | Datei | Button | Status |
|---|-------|--------|--------|
| 1 | UserTeaserPopover.vue | Open Profile | ✅ Migriert |
| 2 | GroupForm.vue | Cancel | ✅ Migriert |
| 3 | EmbedComponent.vue | Cancel | ✅ Migriert |
| 4 | EmbedComponent.vue | Play Now | ✅ Migriert |
| 5 | DonationInfo.vue | Donate | ✅ Migriert |
| 6 | CommentCard.vue | Show More | ✅ Migriert |
| 7 | MapStylesButtons.vue | Style Toggle | ✅ Migriert |
| 8 | GroupMember.vue | Remove | ✅ Migriert |
| 9 | embeds.vue | Allow All | ✅ Migriert |
| 10 | embeds.vue | Deny All | ✅ Migriert |
| 11 | notifications.vue | Check All | ✅ Migriert |
| 12 | notifications.vue | Uncheck All | ✅ Migriert |
| 13 | notifications.vue | Save | ✅ Migriert |
| 14 | privacy.vue | Save | ✅ Migriert |
| 15 | terms-and-conditions-confirm.vue | Read T&C | ✅ Migriert |
| 16 | terms-and-conditions-confirm.vue | Save | ✅ Migriert |

### OsButton Migration - Alle Milestones abgeschlossen ✅

| Milestone | Status | Details |
|-----------|--------|---------|
| M4a: Buttons ohne neue Props | ✅ | 14 Buttons (Modals, Forms, Pages) |
| M4b: Props implementieren | ✅ | icon (Slot), circle, loading |
| M4c: Buttons mit icon/circle/loading | ✅ | Alle verbleibenden Buttons migriert |

### OsButton Features - Alle implementiert ✅

| Feature | Status |
|---------|--------|
| `variant` (7 Varianten) | ✅ |
| `appearance` (filled/outline/ghost) | ✅ |
| `size` (xs/sm/md/lg/xl) | ✅ |
| `icon` Slot | ✅ |
| `circle` Prop | ✅ |
| `loading` Prop | ✅ |
| `disabled` mit hover/active-Override | ✅ |
| `fullWidth` Prop | ✅ |
| `type` Prop (button/submit/reset) | ✅ |

### Status

**OsButton Migration: ✅ Vollständig abgeschlossen.**
- BaseButton.vue gelöscht, base-components.js Plugin entfernt
- Alle Tests, Snapshots, Cypress E2E-Selektoren aktualisiert
- Nächster Schritt: Tier B (ds-chip, ds-number, ds-grid, ds-radio) oder Tier 2 (OsModal)

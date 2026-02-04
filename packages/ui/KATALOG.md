# Komponenten-Katalog

> Tracking der Katalogisierung aller bestehenden Komponenten.
> Diese Datei ermöglicht das Unterbrechen und Fortsetzen der Analyse.

---

## Fortschritt

### Übersicht
```
Phase 0: Analyse    ██████████ 100% (8/8 Schritte)
───────────────────────────────────────────
Nächste Phase: Phase 2 (Projekt-Setup)
```

### Statistiken
| Metrik | Wert |
|--------|------|
| Webapp Komponenten | 139 |
| Styleguide Komponenten | 38 |
| **Gesamt** | **177** |
| Detailiert analysiert | 3 Familien (Button, Modal, Menu) |
| Duplikate gefunden | 5 direkte + 3 Familien |
| Zur Migration priorisiert | 15 Kern-Komponenten |

---

## Styleguide Komponenten (38)

> Quelle: `../../styleguide/src/system/components/`
> Live: http://styleguide.ocelot.social/

### Data Display
| # | Komponente | Status | Webapp-Duplikat | Varianten | Priorität | Notizen |
|---|------------|--------|-----------------|-----------|-----------|---------|
| 1 | Avatar | ⬜ Ausstehend | | | | |
| 2 | Card | ⬜ Ausstehend | BaseCard? | | | |
| 3 | Chip | ⬜ Ausstehend | | | | |
| 4 | Code | ⬜ Ausstehend | | | | |
| 5 | Icon | ⬜ Ausstehend | BaseIcon? | | | |
| 6 | Number | ⬜ Ausstehend | | | | |
| 7 | Placeholder | ⬜ Ausstehend | | | | |
| 8 | Spinner | ⬜ Ausstehend | LoadingSpinner? | | | |
| 9 | Table | ⬜ Ausstehend | | | | |
| 10 | TableCol | ⬜ Ausstehend | | | | |
| 11 | TableHeadCol | ⬜ Ausstehend | | | | |
| 12 | Tag | ⬜ Ausstehend | | | | |

### Data Input
| # | Komponente | Status | Webapp-Duplikat | Varianten | Priorität | Notizen |
|---|------------|--------|-----------------|-----------|-----------|---------|
| 13 | Button | ⬜ Ausstehend | BaseButton, CustomButton, ActionButton, ... | | | VIELE Varianten! |
| 14 | CopyField | ⬜ Ausstehend | | | | |
| 15 | Form | ⬜ Ausstehend | | | | |
| 16 | FormItem | ⬜ Ausstehend | | | | |
| 17 | Input | ⬜ Ausstehend | SearchableInput, LinkInput | | | |
| 18 | InputError | ⬜ Ausstehend | | | | |
| 19 | InputLabel | ⬜ Ausstehend | | | | |
| 20 | Radio | ⬜ Ausstehend | | | | |
| 21 | Select | ⬜ Ausstehend | Dropdown, LocationSelect | | | |

### Layout
| # | Komponente | Status | Webapp-Duplikat | Varianten | Priorität | Notizen |
|---|------------|--------|-----------------|-----------|-----------|---------|
| 22 | Container | ⬜ Ausstehend | | | | |
| 23 | Flex | ⬜ Ausstehend | | | | |
| 24 | FlexItem | ⬜ Ausstehend | | | | |
| 25 | Grid | ⬜ Ausstehend | MasonryGrid? | | | |
| 26 | GridItem | ⬜ Ausstehend | MasonryGridItem? | | | |
| 27 | Modal | ⬜ Ausstehend | Modal, ConfirmModal, ... | | | |
| 28 | Page | ⬜ Ausstehend | InternalPage? | | | |
| 29 | PageTitle | ⬜ Ausstehend | | | | |
| 30 | Section | ⬜ Ausstehend | | | | |
| 31 | Space | ⬜ Ausstehend | | | | |

### Navigation
| # | Komponente | Status | Webapp-Duplikat | Varianten | Priorität | Notizen |
|---|------------|--------|-----------------|-----------|-----------|---------|
| 32 | List | ⬜ Ausstehend | | | | |
| 33 | ListItem | ⬜ Ausstehend | | | | |
| 34 | Logo | ⬜ Ausstehend | Logo | | | DUPLIKAT |
| 35 | Menu | ⬜ Ausstehend | HeaderMenu, ContentMenu, ... | | | |
| 36 | MenuItem | ⬜ Ausstehend | | | | |

### Typography
| # | Komponente | Status | Webapp-Duplikat | Varianten | Priorität | Notizen |
|---|------------|--------|-----------------|-----------|-----------|---------|
| 37 | Heading | ⬜ Ausstehend | SearchHeading? | | | |
| 38 | Text | ⬜ Ausstehend | | | | |

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
| 1 | ActionButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 2 | ActionRadiusSelect | ⬜ Ausstehend | Input | | |
| 3 | AddChatRoomByUserSearch | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 4 | AddGroupMember | ⬜ Ausstehend | Feature | | Group-spezifisch |
| 5 | AvatarMenu | ⬜ Ausstehend | Navigation | Avatar + Menu | |
| 6 | AvatarUploader | ⬜ Ausstehend | Input | | |
| 7 | BadgeSelection | ⬜ Ausstehend | Input | | |
| 8 | Badges | ⬜ Ausstehend | Display | | |
| 9 | BadgesSection | ⬜ Ausstehend | Display | | |
| 10 | BaseButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 11 | BaseCard | ⬜ Ausstehend | Layout | Card | 🔗 DUPLIKAT |
| 12 | BaseIcon | ⬜ Ausstehend | Display | Icon | 🔗 DUPLIKAT |

### C
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 13 | CategoriesFilter | ⬜ Ausstehend | Filter | | |
| 14 | CategoriesMenu | ⬜ Ausstehend | Navigation | Menu | |
| 15 | CategoriesSelect | ⬜ Ausstehend | Input | Select | |
| 16 | ChangePassword | ⬜ Ausstehend | Feature | | Auth-spezifisch |
| 17 | Change | ⬜ Ausstehend | Feature | | |
| 18 | Chat | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 19 | ChatNotificationMenu | ⬜ Ausstehend | Feature | | Chat-spezifisch |
| 20 | CommentCard | ⬜ Ausstehend | Display | Card | |
| 21 | CommentForm | ⬜ Ausstehend | Input | Form | |
| 22 | CommentList | ⬜ Ausstehend | Display | List | |
| 23 | ComponentSlider | ⬜ Ausstehend | Layout | | |
| 24 | ConfirmModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 25 | ContentMenu | ⬜ Ausstehend | Navigation | Menu | |
| 26 | ContentViewer | ⬜ Ausstehend | Display | | |
| 27 | ContextMenu | ⬜ Ausstehend | Navigation | Menu | |
| 28 | ContributionForm | ⬜ Ausstehend | Feature | Form | Post-spezifisch |
| 29 | CounterIcon | ⬜ Ausstehend | Display | Icon | |
| 30 | CountTo | ⬜ Ausstehend | Display | Number | Animation |
| 31 | CreateInvitation | ⬜ Ausstehend | Feature | | |
| 32 | CtaJoinLeaveGroup | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 33 | CtaUnblockAuthor | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 34 | CustomButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |

### D-E
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 35 | DateTimeRange | ⬜ Ausstehend | Input | | |
| 36 | DeleteData | ⬜ Ausstehend | Feature | | |
| 37 | DeleteUserModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 38 | DisableModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 39 | DonationInfo | ⬜ Ausstehend | Display | | |
| 40 | Dropdown | ⬜ Ausstehend | Input | Select | |
| 41 | DropdownFilter | ⬜ Ausstehend | Filter | Select | |
| 42 | Editor | ⬜ Ausstehend | Input | | Rich-Text |
| 43 | EmailDisplayAndVerify | ⬜ Ausstehend | Feature | | |
| 44 | EmbedComponent | ⬜ Ausstehend | Display | | |
| 45 | EmotionButton | ⬜ Ausstehend | Button | Button | |
| 46 | Emotions | ⬜ Ausstehend | Feature | | |
| 47 | Empty | ⬜ Ausstehend | Feedback | Placeholder | |
| 48 | EnterNonce | ⬜ Ausstehend | Feature | | Auth |

### F-G
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 49 | EventsByFilter | ⬜ Ausstehend | Filter | | |
| 50 | FiledReportsTable | ⬜ Ausstehend | Display | Table | |
| 51 | FilterMenu | ⬜ Ausstehend | Navigation | Menu | |
| 52 | FilterMenuComponent | ⬜ Ausstehend | Navigation | Menu | |
| 53 | FilterMenuSection | ⬜ Ausstehend | Navigation | Menu | |
| 54 | FollowButton | ⬜ Ausstehend | Button | Button | |
| 55 | FollowingFilter | ⬜ Ausstehend | Filter | | |
| 56 | FollowList | ⬜ Ausstehend | Display | List | |
| 57 | GroupButton | ⬜ Ausstehend | Button | Button | |
| 58 | GroupContentMenu | ⬜ Ausstehend | Navigation | Menu | |
| 59 | GroupForm | ⬜ Ausstehend | Input | Form | |
| 60 | GroupLink | ⬜ Ausstehend | Navigation | | |
| 61 | GroupList | ⬜ Ausstehend | Display | List | |
| 62 | GroupMember | ⬜ Ausstehend | Display | | |
| 63 | GroupTeaser | ⬜ Ausstehend | Display | Card | |

### H-L
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 64 | Hashtag | ⬜ Ausstehend | Display | Tag/Chip | |
| 65 | HashtagsFilter | ⬜ Ausstehend | Filter | | |
| 66 | HeaderButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 67 | HeaderMenu | ⬜ Ausstehend | Navigation | Menu | |
| 68 | ImageUploader | ⬜ Ausstehend | Input | | |
| 69 | index | ⬜ Ausstehend | ? | | Prüfen |
| 70 | InternalPage | ⬜ Ausstehend | Layout | Page | |
| 71 | Invitation | ⬜ Ausstehend | Feature | | |
| 72 | InvitationList | ⬜ Ausstehend | Display | List | |
| 73 | InviteButton | ⬜ Ausstehend | Button | Button | |
| 74 | JoinLeaveButton | ⬜ Ausstehend | Button | Button | |
| 75 | LabeledButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 76 | LinkInput | ⬜ Ausstehend | Input | Input | |
| 77 | LoadingSpinner | ⬜ Ausstehend | Feedback | Spinner | 🔗 DUPLIKAT |
| 78 | LocaleSwitch | ⬜ Ausstehend | Navigation | | |
| 79 | LocationInfo | ⬜ Ausstehend | Display | | |
| 80 | LocationSelect | ⬜ Ausstehend | Input | Select | |
| 81 | LocationTeaser | ⬜ Ausstehend | Display | Card | |
| 82 | LoginButton | ⬜ Ausstehend | Button | Button | |
| 83 | LoginForm | ⬜ Ausstehend | Feature | Form | Auth |
| 84 | Logo | ⬜ Ausstehend | Display | Logo | 🔗 DUPLIKAT |

### M-O
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 85 | MapButton | ⬜ Ausstehend | Button | Button | |
| 86 | MapStylesButtons | ⬜ Ausstehend | Button | Button | |
| 87 | MasonryGrid | ⬜ Ausstehend | Layout | Grid | |
| 88 | MasonryGridItem | ⬜ Ausstehend | Layout | GridItem | |
| 89 | MenuBar | ⬜ Ausstehend | Navigation | Menu | |
| 90 | MenuBarButton | ⬜ Ausstehend | Button | Button | 🔄 Button-Familie |
| 91 | MenuLegend | ⬜ Ausstehend | Navigation | | |
| 92 | Modal | ⬜ Ausstehend | Feedback | Modal | 🔗 DUPLIKAT |
| 93 | MySomethingList | ⬜ Ausstehend | Display | List | |
| 94 | NotificationMenu | ⬜ Ausstehend | Navigation | Menu | |
| 95 | NotificationsTable | ⬜ Ausstehend | Display | Table | |
| 96 | ObserveButton | ⬜ Ausstehend | Button | Button | |
| 97 | OrderByFilter | ⬜ Ausstehend | Filter | | |

### P-R
| # | Komponente | Status | Kategorie | Styleguide-Pendant | Notizen |
|---|------------|--------|-----------|-------------------|---------|
| 98 | PageFooter | ⬜ Ausstehend | Layout | | |
| 99 | PageParamsLink | ⬜ Ausstehend | Navigation | | |
| 100 | PaginationButtons | ⬜ Ausstehend | Navigation | | |
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
| 112 | ReleaseModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 113 | ReportList | ⬜ Ausstehend | Display | List | |
| 114 | ReportModal | ⬜ Ausstehend | Feedback | Modal | 🔄 Modal-Familie |
| 115 | ReportRow | ⬜ Ausstehend | Display | | |
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
| 126 | ShoutButton | ⬜ Ausstehend | Button | Button | |
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
| 137 | UserTeaserPopover | ⬜ Ausstehend | Display | | |

---

## Identifizierte Duplikate & Konsolidierung

### Direkte Duplikate (Webapp ↔ Styleguide)
| Webapp | Styleguide | Aktion |
|--------|------------|--------|
| Logo | Logo | Konsolidieren zu OsLogo |
| Modal | Modal | Konsolidieren zu OsModal |
| BaseCard | Card | Konsolidieren zu OsCard |
| BaseIcon | Icon | Konsolidieren zu OsIcon |
| LoadingSpinner | Spinner | Konsolidieren zu OsSpinner |

### Button-Familie (zur Konsolidierung)
| Komponente | Beschreibung | Ziel |
|------------|--------------|------|
| Button (Styleguide) | Basis-Button | OsButton |
| BaseButton | Basis-Button | → OsButton |
| CustomButton | Angepasster Button | → OsButton variant |
| ActionButton | Aktions-Button | → OsButton variant |
| HeaderButton | Header-Button | → OsButton variant |
| LabeledButton | Button mit Label | → OsButton + Label |
| MenuBarButton | Menü-Button | → OsButton variant |
| FollowButton | Follow-Aktion | Feature-spezifisch |
| GroupButton | Gruppen-Aktion | Feature-spezifisch |
| InviteButton | Einladen | Feature-spezifisch |
| LoginButton | Login | Feature-spezifisch |
| ShoutButton | Shout-Aktion | Feature-spezifisch |
| ObserveButton | Beobachten | Feature-spezifisch |
| EmotionButton | Emotion | Feature-spezifisch |
| JoinLeaveButton | Beitreten/Verlassen | Feature-spezifisch |
| MapButton | Karten-Button | Feature-spezifisch |
| MapStylesButtons | Kartenstile | Feature-spezifisch |
| CtaJoinLeaveGroup | CTA | Feature-spezifisch |
| CtaUnblockAuthor | CTA | Feature-spezifisch |

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

### Basis-Komponenten (hohe Priorität)
Diese sollten zuerst migriert werden:
- Button → OsButton
- Card → OsCard
- Icon → OsIcon
- Modal → OsModal
- Input → OsInput
- Select → OsSelect
- Avatar → OsAvatar
- Spinner → OsSpinner

### Layout-Komponenten
- Container, Flex, Grid, Page, Section, Space

### Typography
- Heading, Text

### Feature-Komponenten (niedrigere Priorität)
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

---

## Nächste Schritte

1. [x] Webapp-Komponenten auflisten
2. [x] Styleguide-Komponenten auflisten
3. [x] Offensichtliche Duplikate identifizieren
4. [x] Button-Familie im Detail analysieren
5. [x] Modal-Familie im Detail analysieren
6. [x] Menu-Familie im Detail analysieren
7. [x] Priorisierung festlegen
8. [x] Konsolidierungsplan finalisieren

---

**✅ Phase 0 abgeschlossen!** Weiter mit Phase 2 (Projekt-Setup).

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

### Feature-Buttons (Business-Logik)

Diese Buttons enthalten Business-Logik und sollten **nicht** in OsButton konsolidiert werden:

| Komponente | Beschreibung | Migration |
|------------|--------------|-----------|
| FollowButton | Folgen/Entfolgen Logik | Bleibt Feature-Komponente |
| GroupButton | Gruppen-Aktionen | Bleibt Feature-Komponente |
| InviteButton | Einladungs-Logik | Bleibt Feature-Komponente |
| LoginButton | Auth-Logik | Bleibt Feature-Komponente |
| ShoutButton | Shout-Logik | Bleibt Feature-Komponente |
| ObserveButton | Beobachten-Logik | Bleibt Feature-Komponente |
| EmotionButton | Reaktions-Logik | Bleibt Feature-Komponente |
| JoinLeaveButton | Gruppen Beitreten/Verlassen | Bleibt Feature-Komponente |
| MapButton | Karten-Toggle | Bleibt Feature-Komponente |
| MapStylesButtons | Kartenstil-Auswahl | Bleibt Feature-Komponente |
| PaginationButtons | Seitennavigation | Bleibt Feature-Komponente |

---

### Konsolidierungsvorschlag: OsButton

```typescript
interface OsButtonProps {
  // Variante
  variant?: 'default' | 'primary' | 'secondary' | 'danger'

  // Stil
  filled?: boolean      // Gefüllter Hintergrund (default: false = outline)
  ghost?: boolean       // Komplett transparent

  // Größe
  size?: 'tiny' | 'small' | 'base' | 'large'

  // Form
  circle?: boolean      // Runder Button
  fullWidth?: boolean   // Volle Breite

  // Icon
  icon?: string
  iconPosition?: 'left' | 'right'

  // Zustände
  loading?: boolean
  disabled?: boolean

  // Link-Support
  to?: string | RouteLocationRaw  // Router-Link
  href?: string                    // Externer Link

  // Button-Typ
  type?: 'button' | 'submit'
}
```

**Nicht übernommen:**
- `bullet` → zu spezifisch, kann mit `circle` + custom size erreicht werden
- `hover` prop → unnötig, CSS :hover reicht
- `padding` prop → sollte über size geregelt werden

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

### Offene Fragen

1. **secondary Variante:** Styleguide hat `secondary` (blau), Webapp nicht. Wird es gebraucht?
2. **x-large Size:** Styleguide hat `x-large` in CSS, aber nicht als Prop. Übernehmen?
3. **bullet Form:** Webapp-spezifisch. Brauchen wir das in OsButton?

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

### Tier 1: Kern-Komponenten (höchste Priorität)

Diese Komponenten sind die Basis für alle anderen und sollten zuerst migriert werden:

| # | Komponente | Begründung | Abhängigkeiten |
|---|------------|------------|----------------|
| 1 | **OsButton** | Meistgenutzte Komponente, Basis für viele Features | OsIcon |
| 2 | **OsIcon** | Wird von Button, Menu, etc. benötigt | - |
| 3 | **OsSpinner** | Loading-States für Button, Modal, etc. | - |
| 4 | **OsCard** | Layout-Basis für viele Komponenten | - |

### Tier 2: Layout & Feedback (mittlere Priorität)

| # | Komponente | Begründung | Abhängigkeiten |
|---|------------|------------|----------------|
| 5 | **OsModal** | Dialoge, Bestätigungen, Formulare | OsButton, OsCard |
| 6 | **OsDropdown** | Dropdown-Menüs, Selects | OsButton |
| 7 | **OsAvatar** | Benutzerprofile, Kommentare | - |
| 8 | **OsInput** | Formulare | - |

### Tier 3: Navigation & Typography (niedrigere Priorität)

| # | Komponente | Begründung | Abhängigkeiten |
|---|------------|------------|----------------|
| 9 | **OsMenu** | Navigation (weniger kritisch) | OsMenuItem |
| 10 | **OsMenuItem** | Menu-Items | - |
| 11 | **OsHeading** | Überschriften | - |
| 12 | **OsText** | Text-Formatierung | - |

### Tier 4: Spezial-Komponenten (später)

| # | Komponente | Begründung |
|---|------------|------------|
| 13 | OsSelect | Komplexere Formular-Komponente |
| 14 | OsTable | Datentabellen |
| 15 | OsTag/OsChip | Tags und Badges |

---

## Finaler Konsolidierungsplan

### Phase 1: Kern-Komponenten

```
1. OsIcon
   └── Vereint: DsIcon (Styleguide), BaseIcon (Webapp)
   └── Token: Keine eigenen (nur Größen via Props)

2. OsSpinner
   └── Vereint: DsSpinner (Styleguide), LoadingSpinner (Webapp)
   └── Token: Farben, Größen

3. OsButton
   └── Vereint: DsButton (Styleguide), BaseButton (Webapp)
   └── NICHT übernommen: Feature-Buttons (FollowButton, etc.)
   └── Token: Farben, Größen, Border-Radius, Spacing

4. OsCard
   └── Vereint: DsCard (Styleguide), BaseCard (Webapp)
   └── Token: Shadows, Border-Radius, Spacing
```

### Phase 2: Layout & Feedback

```
5. OsModal
   └── Basis: DsModal (Styleguide) - bereits gut!
   └── Feature-Modals bleiben in Webapp, nutzen OsModal
   └── Token: Z-Index, Shadows, Spacing

6. OsDropdown (NEU!)
   └── Basis: Dropdown (Webapp)
   └── Erkenntnis: Wichtiger als gedacht!
   └── Token: Spacing, Shadows

7. OsAvatar
   └── Vereint: DsAvatar (Styleguide), ProfileAvatar (Webapp)
   └── Token: Größen, Border-Radius

8. OsInput
   └── Basis: DsInput (Styleguide), InputField Patterns (Webapp)
   └── Token: Border, Farben, Spacing
```

### Phase 3: Navigation

```
9. OsMenu + OsMenuItem
   └── Basis: DsMenu/DsMenuItem (Styleguide)
   └── Feature-Menus bleiben in Webapp
   └── Token: Spacing, Farben
```

---

## Erkenntnisse aus der Analyse

### Was funktioniert gut (beibehalten):
1. **DsModal als Basis** - Feature-Modals nutzen bereits DsModal
2. **BaseButton als Standard** - Webapp hat konsolidiert auf BaseButton
3. **Dropdown-Pattern** - Funktioniert gut mit v-popover

### Was problematisch ist (verbessern):
1. **Button-Varianten** - Zu viele unterschiedliche Buttons
2. **Inkonsistente Naming** - ds-* vs base-* vs kebab-case
3. **Doppelte Komponenten** - Logo, Icon, Card existieren doppelt

### Was überflüssig ist (nicht migrieren):
1. **bullet Button** - Zu spezifisch, kann mit circle erreicht werden
2. **hover Prop** - CSS :hover reicht
3. **Viele Feature-Buttons** - Behalten Business-Logik, nutzen OsButton

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

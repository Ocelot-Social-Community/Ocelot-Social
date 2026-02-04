# Komponenten-Katalog

> Tracking der Katalogisierung aller bestehenden Komponenten.
> Diese Datei ermöglicht das Unterbrechen und Fortsetzen der Analyse.

---

## Fortschritt

### Übersicht
```
Webapp:     ░░░░░░░░░░  0% (0/139 Komponenten)
Styleguide: ░░░░░░░░░░  0% (0/38 Komponenten)
───────────────────────────────────────────
Gesamt:     ░░░░░░░░░░  0% (0/177 Komponenten)
```

### Statistiken
| Metrik | Wert |
|--------|------|
| Webapp Komponenten | 139 |
| Styleguide Komponenten | 38 |
| **Gesamt** | **177** |
| Analysiert | 0 |
| Duplikate gefunden | 0 |
| Zur Konsolidierung markiert | 0 |

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

---

## Nächste Schritte

1. [x] Webapp-Komponenten auflisten
2. [x] Styleguide-Komponenten auflisten
3. [x] Offensichtliche Duplikate identifizieren
4. [ ] Button-Familie im Detail analysieren
5. [ ] Modal-Familie im Detail analysieren
6. [ ] Menu-Familie im Detail analysieren
7. [ ] Priorisierung festlegen
8. [ ] Konsolidierungsplan finalisieren

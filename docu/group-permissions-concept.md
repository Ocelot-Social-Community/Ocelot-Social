# Ocelot: Rechtesystem fuer Gruppen (Konzept)

> Uebernommen aus dem Konzept-Repo (`ulfgebhardt/concept/projects/ocelot-group-permissions.md`),
> damit die Entscheidungen dort liegen, wo der Code sie referenziert: die Kommentare im
> Backend nennen E3, E7, E9, E11, E12, E16, E18 und E19 beim Namen.
>
> **Stand der Umsetzung** (Branch `feat/group-permissions`):
>
> | Teil | Stand |
> |---|---|
> | Katalog, Rollen als Daten, eine Shield-Regel pro Recht | umgesetzt |
> | Harte Deckelung Gruppe ∩ Netzwerk ∩ Gates (E3) | umgesetzt |
> | Netzwerk-Seite `group.administer.any_*`, `group.content.read.any_*`, `group.moderate.any_*`, `group.roleTemplate.manage` (E5) | umgesetzt |
> | Report-Queue an das Leserecht gebunden (E19) | umgesetzt, inkl. Maskierung + gesperrtem `review` |
> | Invite gesplittet (E11) | umgesetzt |
> | Admin-Gruppenliste statt `organizations.vue` (E17) | umgesetzt |
> | Owner-los erlaubt (E8) | umgesetzt |
> | `groupType` bleibt autoritatives Preset (E2) | **abgewichen, inzwischen vollstaendig** — die Lesewege fragen die Rechte ueber abgeleitete Spalten am Gruppenknoten, und der Typ selbst ist jetzt *abgeleitet* (`groupRole/privacyLevel.ts`, Handlungsoption A aus `group-type-from-rights-concept.md`): er wird aus den Rechten der `none`-Rolle abgeleitet, weder gewaehlt noch gespeichert |
> | `videoCall.create_<type>` (E5-Muster) | **ersetzt** — gekoppelt an die *Tuer* statt an den Typ: `videoCall.create_open` fuer eine Gruppe, in die ein Fremder hineinlaufen kann (`group.read` + `group.join` auf `none`), `videoCall.create_restricted` sonst (`groupRole/callDoor.ts`). Auf den drei Presets verhaltensgleich |
> | `group.type.change` | **entfernt** — der Typ ist abgeleitet, also IST seine Aenderung das Bearbeiten der `none`/`pending`-Rollen: `group.role.manage` deckelt beides, ein eigener Key war ein zweiter Name fuer einen Weg dorthin |
> | Netzwerk-Rechte in fremden Gruppen (E18) | **abgewichen (Variante B), umgesetzt** — `group.administer.any_*` & Co. geben ohne explizite Freischaltung nur **Lesen**; alles Weitere wartet auf `elevateInGroup` (`groupRole/elevation.ts`), das nach 60 Minuten von selbst verfaellt und bei der Gruppe vermerkt wird. Ausserdem: ein Netzwerk-Recht macht eine Gruppe **erreichbar, nicht gelistet** (3.9) |
> | `group.leave` | **nicht abwaehlbar** fuer jede Rolle, die eine Mitgliedschaft ist (`groupRole/mandatoryRights.ts`). Die andere Tuer hinaus (`group.member.remove`) liegt in fremder Hand, also waere eine Rolle ohne `group.leave` eine Falle statt einer Einstellung |
> | `group.member.approve` (E9: kein Key ohne Konsument) | **entfernt** — Freigeben ist derselbe Akt wie Rolle zuweisen: `ChangeGroupMemberRole` befoerdert eine `pending`-Mitgliedschaft, der Mitglieder-Tab listet Bewerber (`includePending`), und `group.member.role.assign` deckelt beides. Der eigene Key deckelte damit nichts Eigenes. Was fehlt, ist eine *Affordanz* (Annehmen/Ablehnen, Zaehler, Benachrichtigung) — #10352 |
> | `banned`-Rolle (E14), `group.delete` (E9) | bewusst Folge-Issues |
>
> **Benennung.** Was das Konzept `groupType` nennt, heisst im Code
> `visibility` — `Group.visibility` ist abgeleitet (`groupRole/privacyLevel.ts`)
> und wird nicht gespeichert; gespeichert ist allein `Group.template`, das
> Rollen-Preset, aus dem die Gruppe entstand. Die Netzwerk-Keys behalten ihre
> Namen (`group.content.read.any_hidden`, …), weil ihr Suffix eine Sichtbarkeit benennt.
> Die Abschnitte unten verwenden `groupType` dort weiter, wo sie den
> **Ist-Zustand vor dem Umbau** oder die Entscheidung in ihrem Wortlaut
> beschreiben.

Gruppen bekommen dasselbe Freiheitsniveau, das das Netzwerk seit dem RBAC-Umbau
hat: einen **Katalog** gruppen-skopierter Rechte, **Rollendefinitionen als Daten**
statt hartcodierter Rollen-Literale, und **eine** Enforcement-Regel im Shield
statt zwoelf handgeschriebener Cypher-Guards.

Die Rechte-Hierarchie innerhalb einer Gruppe ist damit durchgaengig: Nicht-Mitglied
(sehr wenig) → Beitrittsanfrage (etwas mehr) → Mitglied (mehr) → Admin (viel) →
Owner (alles, was das Netzwerk in Gruppen ueberhaupt zulaesst).

---

## 1. Ausgangslage

### 1.1 Das netzwerkweite Muster (wird gespiegelt)

| Baustein | Ort | Eigenschaft |
|---|---|---|
| Permission-Katalog | `backend/src/permission/permission.catalog.json` | 24 Keys `resource.action`, **code-owned & geschlossen**: ein neuer Key kommt nur mit einem neuen Enforcement-Punkt |
| Hand-Mirror-Union | `permission/types.ts` | Compile-Time-Tippfehlerschutz auf `hasPermission('…')`, Drift-Guard-Test |
| Rollen | `role/` — `(:User)-[:HAS_ROLE]->(:Role {name, permissions[]})` | **Runtime-Daten**, Redis-synced, Single-Role-Modell |
| `owner` | `role/defaults.ts` | protected, speichert **keine** Liste → loest auf den vollen Katalog auf, waechst automatisch mit |
| Feature-Gates | `permission/gates.ts` | Recht nur wirksam, wenn **alle** `gatedBy`-Policies effektiv an sind (AND) |
| Act-on-Hierarchie | `role/dominance.ts` | **kein Rangfeld** — Akteur darf auf Ziel wirken, wenn seine Permission-Menge echte Obermenge ist |
| Enforcement | `middleware/permissionsMiddleware.ts` | `hasPermission(key)` als einzige Regel; Operation→Recht bleibt Code |
| Frontend | `myPermissions` → Vuex `auth/can` → `$can('x')`, `<permission-gate>` | "hide" und "gray out" als zwei Primitive |

Das Modell ist gut: Katalog = Code (weil jeder Key einen echten Enforcement-Punkt
braucht), Rollen = Daten (weil das die Betreiber-Entscheidung ist). Genau diese
Trennung wird auf Gruppen uebertragen.

### 1.2 Gruppen heute

Rolle als String-Property auf der Kante: `MEMBER_OF.role ∈ {pending, usual, admin, owner}`
(GraphQL-Enum `GroupMemberRole`). Nicht-Mitglieder haben gar keine Rolle — ihre
Rechte ergeben sich implizit aus `groupType ∈ {public, closed, hidden}`.

Zwoelf Shield-Regeln mit je eigener Cypher-Query:

| Regel | heutige Haerte | Befund |
|---|---|---|
| `isAllowedToChangeGroupSettings` | **nur `owner`** | Widerspricht der eigenen Schema-Doku ("Restricted to admins/owners"). Ein Gruppen-Admin kann keine Settings aendern. |
| `canRemoveUserFromGroup` | **nur `owner`** | Admin kann Rollen aendern, aber niemanden entfernen — inkonsistent. |
| `isAllowedToChangeGroupMemberRole` | admin → `pending/usual/admin`, owner → alles | Hartcodierte Rangleiter, dupliziert die Dominanz-Idee des Netzwerks. |
| `isAllowedSeeingGroupMembers` | `public` ∨ (`closed` ∧ `showMembers`) ∨ Mitglied | groupType-Logik im Guard. |
| `isAllowedToJoinGroup` | alles ausser `hidden` | `closed` erzeugt `pending`, `public` direkt `usual` (im Resolver, nicht im Guard). |
| `isAllowedToLeaveGroup` | Mitglied, aber nicht `owner` | |
| `isMemberOfGroup`, `canCommentPost` | `['usual','admin','owner']` | Das Literal liegt laut `viewerGroups.ts` in "a dozen hand-written Cypher strings". |
| `isAllowedToPinGroupPost` | admin/owner | korrekt implementiert (`toString(count(…)) === '1'`) |
| `isAllowedToGenerateGroupInviteCode` | *nominell* admin/owner bzw. nicht-pending | **faktisch No-op, siehe 1.3** |
| `CreateGroupRoom`, `joinGroupVideoCall`, `CreateMessage` | im Shield nur `isAuthenticated` | **Autorisierung in drei verschiedenen Schichten**: `CreateGroupRoom` prueft die Mitgliedschaft im eigenen Cypher (`WHERE membership.role IN [...]`), `joinGroupVideoCall` in JS (`getGroupMembershipType` wirft), `CreateMessage` ueber die `CHATS_IN`-Kante. Kein Loch, aber drei Mechanismen fuer eine Frage — und im Shield unsichtbar |
| `muteGroup`/`unmuteGroup`/`setGroupMembershipVisibility` | `isMemberOfGroup` | ok |

Dazu kommt: **Netzwerk-Admins haben in Gruppen null Rechte.** Es gibt keinen Weg,
eine Gruppe mit handlungsunfaehigem Owner (deaktivierter Account) wieder
administrierbar zu machen — und ein Netzwerk-Moderator kommt an Inhalte von
`closed`/`hidden`-Gruppen nicht heran (offen als Bug #9405, als Feature #6751).

### 1.3 Befund: `isAllowedToGenerateGroupInviteCode` ist wirkungslos

```ts
return !!(
  await context.database.query({
    query: `
      MATCH (user:User{id: $user.id})-[membership:MEMBER_OF]->(group:Group {id: $args.groupId})
      WHERE (group.type IN ['closed','hidden'] AND membership.role IN ['admin', 'owner'])
        OR (NOT group.type IN ['closed','hidden'] AND NOT membership.role = 'pending')
      RETURN count(group) as count
    `, …})
).records[0].get('count')
```

Zwei unabhaengige Defekte, die sich zu "immer erlaubt" addieren:

1. **`group.type` existiert nicht.** Die Property heisst `groupType`
   (`db/schema/entities/Group.ts`). `NULL IN [...]` ist `NULL`, `NOT NULL` ist
   `NULL` → das `WHERE` ist in **beiden** Zweigen nie wahr, es kommt keine Zeile
   durch den Filter.
2. **`!!` auf einen Neo4j-Integer.** Der Treiber laeuft ohne
   `disableLosslessIntegers` (`db/neo4j.ts`), `count()` kommt als
   `Integer`-**Objekt** zurueck. Eine Aggregation ohne Gruppierungsschluessel
   liefert immer genau eine Zeile — also `Integer{low: 0}` — und `!!objekt` ist
   `true`.

Ergebnis: **jeder angemeldete Nutzer kann fuer jede Gruppe einen Invite-Code
erzeugen**, auch als Nicht-Mitglied einer `hidden`-Gruppe. Getestet wird nur der
unauthentifizierte Fall (`inviteCodes.spec.ts`), der schon von `if (!context.user)`
abgefangen wird — deshalb faellt es nicht auf. Gehoert als eigenes Bug-Issue vor
den Umbau, inklusive der fehlenden Negativ-Tests.

---

## 2. Entscheidungen

| # | Entscheidung | Begruendung |
|---|---|---|
| E1 | **Zwei Ebenen: Netzwerk-Templates + freie benannte Rollen pro Gruppe** | Die Gruppe bekommt echte Hoheit (eigene Rollen wie "Redaktion", "Kassenwart"), das Netzwerk behaelt die Defaults in der Hand. Templates sind gleichzeitig der Recovery-Pfad ("Rollen auf Standard zuruecksetzen"). |
| E2 | **`groupType` bleibt autoritatives Preset**; Aufloesung in Rechte als Folge-Issue | Post-Visibility, Suche und Karten-Queries haengen an `groupType` (`postFilter.ts`, `posts.ts:572`); der Umbau auf Permission-Queries ist ein eigenes Performance-Thema (`viewerGroups.ts` dokumentiert 1.480.665 vs. 348.020 DB-Hits fuer genau diese Art Umbau). |
| E3 | **Harte Deckelung: effektiv = Gruppe ∩ Netzwerk ∩ Gates** | Sonst ist die selbst angelegte Gruppe ein Privilege-Escalation-Pfad um Moderation und Netzwerk-Policy herum (Recht netzwerkweit entzogen → in eigener Gruppe wieder gewaehrt). |
| E4 | **EPIC + Teil-Issues** | Der Umbau beruehrt 12 Enforcement-Punkte, Backend, Webapp, Migration und e2e. Als ein Issue nicht reviewbar. |
| E5 | **Netzwerk-Rechte fuer Gruppenzugriff pro `groupType`**, nach dem Muster von `group.create_*` | Das Repo hat dieses flache Per-Typ-Muster bereits zweimal (`group.create_*`, `videoCall.create_*`) und dokumentiert es als gewollt. `group.create_*` beantwortet #9405 **nicht** — es regelt das Anlegen, nicht das Lesen. Details in 7.3. |
| E6 | **Reports bleiben netzwerkweit.** Die Gruppe bekommt `group.post.moderate` (Inhalt aus der Gruppe entfernen), aber keinen Report-Zugriff | Ein Report kann einen *Account* treffen, nicht nur einen Post — das ist Netzwerk-Hoheit. #7702 nennt die Alternative selbst ("member writes to the admin per chat"). Haelt Schritt 1 klein; ein `group.report.review` liesse sich spaeter ohne Key-Bruch ergaenzen. |
| E7 | **`membersCount` haengt an `group.members.read`** | Bei kleinen Gruppen ist die Zahl selbst die Information ("3 Mitglieder" + bekannter Owner ≈ die Liste). Datensparsame Variante, beantwortet die Frage aus #5386. |
| E8 | **Owner-loser Zustand ist erlaubt.** Kein "mindestens ein Owner"-Guard; Wiederherstellung ueber `group.administer.any_<type>`, Mechanik in 3.9 | Mit der Matrix ist eine owner-lose Gruppe **nicht tot**: ihre Admins behalten Settings, Mitglieder- und Inhaltsverwaltung. Blockiert ist nur das Owner-Recht `group.role.manage` (das inzwischen auch den Typ-Wechsel deckelt, siehe oben). Damit entfaellt die Bedingung "provided another owner exists" aus #5386/#6153 komplett, und #6173 ist trivial erfuellt. **Weicht bewusst von #5386 ab** — gehoert im EPIC explizit markiert. |
| E9 | **Kein Key ohne Konsument.** Der Katalog enthaelt nur Rechte, die einen echten Enforcement-Punkt haben (Spalte in 3.1). `group.post.moderate` und `group.delete` fliegen deshalb aus Schritt 1 und kommen mit ihrer Funktion in eigenen Issues; `group.owner.transfer` faellt ganz weg (redundant, s. 3.4) | Ein Recht, das nichts blockiert, ist toter Code in der Matrix: es suggeriert dem Gruppen-Owner eine Wirkung, die es nicht hat. Genau die Disziplin, die der Netzwerk-Katalog sich selbst auferlegt ("a new key ships with a new gate"). |
| E10 | **Privatere Typen sind durch `group.create_<Zieltyp>` gedeckelt** | Sonst ist "public anlegen, dann auf hidden schalten" der Umweg um `group.create_hidden` — dieselbe Eskalationslogik wie E3. Umgesetzt an **beiden** Wegen: das Typ-Preset im Shield (`canChangeGroupType`) und die Rechte-Matrix selbst (`requirePrivacyCap`), weil beides seit der Ableitung dasselbe tut. |
| E11 | **`group.invite` wird gesplittet**: `group.invite` (bestehende Netzwerk-Mitglieder in die Gruppe holen, ungegated) und `group.invite.external` (Code, der auch zur Registrierung berechtigt, `gatedBy: inviteRegistration`) | Ein Gruppen-Invite-Code erfuellt heute zwei Zwecke in einem Objekt. Wer Mitglieder einladen darf, soll nicht automatisch Fremde ins Netzwerk holen duerfen — und ein Netzwerk mit abgeschalteter Invite-Registrierung darf nicht ueber Gruppen unterlaufen werden. |
| E12 | **Template-Aenderungen propagieren nicht automatisch**, dazu ein Admin-Werkzeug "auf Gruppen anwenden, die ihre Rollen nie angepasst haben" | Spiegelt die `ON CREATE`-Semantik des Rollen-Seedings: eine Anpassung wird nie ueberschrieben. Der Masseneingriff bleibt moeglich, aber als bewusste Aktion. |
| E13 | **Anzeigename frei, Key fix.** `GroupRole` traegt neben `name` (interner Key; fuer `none`/`pending`/`owner` unveraenderlich) ein optionales `label`; leer = i18n-Default | Code-Verhalten haengt am Key, Kommunikation am Label. Eine Gruppe mit eigenem Vokabular ("Anwaerter", "Aktive", "Gast") ist ein realer Wunsch aus #8993, und der Key bleibt trotzdem der stabile Anker fuer Cypher, Migrationen und `ACTIVE_GROUP_ROLES`. |
| E14 | **Systemrolle `banned` ist ein Folge-Issue**, kein Teil von Schritt 1 | Nach E9 kommt der Key mit seiner Funktion — und "Ausschluss mit Gedaechtnis" braucht eigene Antworten (bleibt die Kante bestehen? was passiert mit den Beitraegen? wie lange?). |
| E18 | **Netzwerk-Autoritaet wirkt implizit, wird aber gekennzeichnet.** Rechte aus `.any_*` gelten immer (Vereinigung, 3.5), auch wenn man in der Gruppe nur einfaches Mitglied ist; jede Aktion, deren Autoritaet aus `.any_*` statt aus der Mitgliedschaft stammt, wird als Netzwerk-Eingriff markiert und geloggt | Kein Umschalter, der vergessen werden kann und Aktionen scheinbar grundlos scheitern laesst — und keine Verwaltungsluecke. Die Herkunft wird fuer E16 ohnehin mitgefuehrt, die Kennzeichnung kostet also nur Anzeige. |
| E19 | **Die Report-Queue wird an `group.content.read.any_<type>` gebunden.** Ohne das Recht zeigt ein Report auf Gruppeninhalt nur Metadaten plus Hinweis "Inhalt nicht sichtbar"; `review` ist fuer solche Reports gesperrt (keine blinde Moderation) und sie brauchen eine Eskalation an Admins | Heute liefert `resolvers/reports.ts` `resource {.*}` **ohne jede Gruppen-Filterung** — der Moderator sieht Inhalt aus closed/hidden Gruppen dort schon jetzt, obwohl #9405 sagt, dass er ihn sonst nicht sieht. Ohne diese Bindung waere das neue Leserecht durch Selbst-Meldung umgehbar. |
| E16 | **Der `.any_*`-Pfad befoerdert nur bestehende Mitglieder.** Wenn die Autoritaet aus `group.administer.any_<type>` stammt (nicht aus eigener Mitgliedschaft), wird `setGroupMemberRole` zu einem `MATCH` auf die `MEMBER_OF`-Kante statt zu einem `MERGE` — ein Netzwerk-Admin kann sich also nicht selbst einsetzen | Er soll die Gruppe wieder handlungsfaehig machen, nicht sie uebernehmen; in einer `hidden`-Gruppe waere der Selbstbeitritt ein Einblick, den ihm niemand gegeben hat. Eine Gruppe **ohne jedes** Mitglied ist damit ein Loeschfall (#5388), kein Recovery-Fall. Die `MERGE`-Semantik bleibt fuer die gruppeneigenen Admins erhalten (so funktioniert "Nutzer zur Gruppe hinzufuegen"). |
| E17 | **Die Gruppen-Verwaltung im Admin-Bereich wird mitgebaut** und ersetzt den "Coming Soon"-Stub `webapp/pages/admin/organizations.vue`; #6751 ist damit vollstaendig erledigt | E8 ohne Discovery ist eine Entscheidung, die man nicht ausfuehren kann: es gibt heute **keine** Gruppen-Seite im Admin-Bereich, und eine `hidden`-Gruppe ist nicht einmal per URL auffindbar. Als eigenes Teil-Issue (reine Webapp + eine Query), damit Teil-Issue 7 reviewbar bleibt. |
| E15 | **Die Schema-Doku folgt dem Modell**, nicht umgekehrt: "there is exactly one owner" wird korrigiert | Mit Dominanz und E8 sind Mehr-Owner *und* Null-Owner wohldefinierte Zustaende. Die Doku beschreibt derzeit einen Zustand, den `ownerCanSetRole` schon heute nicht erzwingt. |

---

## 3. Architektur

### 3.1 Gruppen-Permission-Katalog

Eigene Datei `backend/src/groupPermission/groupPermission.catalog.json`, gleiche
Disziplin wie der Netzwerk-Katalog (code-owned, Hand-Mirror-Union, Drift-Guard-Test).
Getrennt vom Netzwerk-Katalog, weil die Keys einen **anderen Scope** haben: sie
werden immer relativ zu einer Gruppe geprueft, nie global.

Spalte "Netz" = Netzwerk-Recht, das zusaetzlich gelten muss (Deckelung E3).
Spalte "Gate" = Policy-Gate; `groupsEnabled` gilt implizit fuer alle.
Spalte **"Konsument"** = der Enforcement-Punkt, der das Recht tatsaechlich prueft.
Kein Key ohne Konsument (E9) — die Spalte ist die Abnahmebedingung fuer den
Katalog, nicht Doku.

| Key | UI-Gruppe | Netz | Gate | Konsument | Bedeutung |
|---|---|---|---|---|---|
| `group.read` | visibility | — | — | Feldregeln auf `Group.*`, `Query.Group` | Gruppenprofil sehen (ueber die immer offenen Felder hinaus) |
| `group.content.read` | visibility | — | — | `Group.posts`, `Group.postsCount`, `muteGroup`/`unmuteGroup`, `setGroupMembershipVisibility` | Inhalte der Gruppe lesen |
| `group.members.read` | visibility | — | — | `Query.GroupMembers`, `Group.membersCount` (E7) | Mitgliederliste und Mitgliederzahl sehen |
| `group.post.create` | content | `post.create` | — | `CreatePost` (mit `groupId`) | In der Gruppe posten |
| `group.comment.create` | content | `comment.create` | — | `CreateComment` auf einen Gruppen-Post | In der Gruppe kommentieren |
| `group.post.moderate` | moderation | — | — | `removePostFromGroup` | Fremden Post aus der Gruppe entfernen; der Post bleibt beim Autor (kam mit Teil-Issue 8, s. E9) |
| `group.post.pin` | content | — | — | `pinGroupPost`, `unpinGroupPost` | Post innerhalb der Gruppe anpinnen |
| `group.join` | membership | — | — | `JoinGroup` (direkt) | Direkt beitreten (Preset `public`) |
| `group.join.request` | membership | — | — | `JoinGroup` (→ `pending`) | Beitritt anfragen (Preset `closed`) |
| `group.leave` | membership | — | — | `LeaveGroup` | Gruppe verlassen |
| `group.member.remove` | membership | — | — | `RemoveUserFromGroup` (+ Dominanz, 3.4) | Mitglied entfernen |
| `group.member.role.assign` | membership | — | — | `setGroupMemberRole` (+ Dominanz + Deckung, 3.4) | Rolle eines Mitglieds aendern |
| `group.invite` | membership | — | — | `generateGroupInviteCode` | Invite-Code fuer **bestehende** Netzwerk-Mitglieder erzeugen |
| `group.invite.external` | membership | — | `inviteRegistration` | `generateGroupInviteCode` (Flag `externalAllowed`), `validateInviteCode` im Signup-Pfad | Code erzeugen, der auch zur **Registrierung** berechtigt (E11) |
| `group.settings.manage` | administration | — | — | `UpdateGroup` | Name, About, Description, Avatar, Ort, Kategorien, `showMembers` |
| `group.role.manage` | administration | — | — | `updateGroupRole` / `createGroupRole` / `renameGroupRole` / `deleteGroupRole` / `resetGroupRoles`, `Group.roles` | **Meta-Recht:** Rollendefinitionen dieser Gruppe bearbeiten |
| `group.chat.participate` | communication | — | — | `CreateGroupRoom`, `CreateMessage`, `MarkMessagesAsSeen` (Gruppen-Room) | Gruppen-Room lesen/schreiben — schliesst die heutige Luecke |
| `group.videoCall.create` | communication | `videoCall.create_<door>` | `videoConference` | Start eines Calls in der Gruppe | Video-Call eroeffnen |
| `group.videoCall.join` | communication | — | `videoConference` | `joinGroupVideoCall` | Laufendem Call beitreten |

**19 Keys.** Bewusst *nicht* enthalten (E9):

| Nicht enthalten | Warum | Wohin |
|---|---|---|
| `group.delete` | `DeleteGroup` ist im Schema auskommentiert | kommt mit #5388, das die Datenschutz-Fragen ohnehin klaeren muss |
| `group.owner.transfer` | **redundant**: die Deckungsregel aus 3.4 (`actor ⊇ zugewiesene Rolle`) laesst die Owner-Rolle ohnehin nur von jemandem vergeben, der alles haelt, was Owner haelt. Ein eigener Key koennte nur noch *mehr* erlauben — was #8537 explizit nicht will ("aber nicht Inhaber bestimmen koennen") | entfaellt |

### 3.2 Zwei Ebenen

```
Netzwerk-Ebene (Admin-Bereich, neues Recht group.roleTemplate.manage)
  GroupRoleTemplate: benannte Rollendefinitionen + Permission-Mengen
    ├─ none    ← drei Varianten, je groupType (public/closed/hidden)
    ├─ pending
    ├─ usual
    ├─ admin
    └─ owner   (protected, ohne Liste → voller Gruppen-Katalog)
                        │  Seed bei Gruppen-Erstellung / Reset
                        ▼
Gruppen-Ebene (Gruppen-Verwaltung, Recht group.role.manage)
  (:Group)-[:HAS_GROUP_ROLE]->(:GroupRole {name, permissions[], system, protected})
    frei umbenennbar, frei erweiterbar, neue Rollen anlegbar
                        │  MEMBER_OF.role = GroupRole.name
                        ▼
  Mitglied traegt genau eine Gruppenrolle (Single-Role, wie netzwerkweit)
```

Der Clou an der `none`-Rolle: sie ist ein ganz normaler `GroupRole`-Knoten der
Gruppe, nur ohne `MEMBER_OF`-Kante, die auf sie zeigt. Die groupType-Abhaengigkeit
steckt **nur im Seed** (welche Template-Variante kopiert wird) — zur Laufzeit gibt
es **keine** groupType-Verzweigung mehr in der Autorisierung. Das ist der
eigentliche Aufraeum-Gewinn gegenueber heute.

### 3.3 Systemrollen vs. freie Rollen

| Rolle | Kategorie | Regeln |
|---|---|---|
| `none` | system, unloeschbar, unbenennbar | keine `MEMBER_OF`-Kante; Permission-Menge editierbar innerhalb der groupType-Grenzen (E2: `hidden` kann nie `group.content.read` fuer `none` bekommen) |
| `pending` | system, unloeschbar, unbenennbar | Zielrolle von `group.join.request`; zaehlt nicht als Mitglied (`membersCount`, `ACTIVE_GROUP_ROLES`) |
| `owner` | protected | speichert keine Liste → voller Gruppen-Katalog (waechst mit); nicht loeschbar |
| `usual`, `admin` | frei | nur Seed-Namen. Umbenennbar, loeschbar, beliebig viele weitere Rollen daneben |

Systemrollen sind die Rollen, an denen **Code-Verhalten** haengt (Beitrittsziel,
Mitglieder-Zaehlung, Failsafe). Alles andere ist Betreiber-Entscheidung.

Unabhaengig davon darf **jede** Rolle ein gruppenspezifisches `label` tragen (E13):
`name` ist der interne Key (bei Systemrollen unveraenderlich), `label` der
Anzeigename. Leeres Label ⇒ i18n-Default fuer Seed-Namen, Key wortwoertlich fuer
freie Rollen. Damit kann eine Gruppe `pending` als "Wartet auf Freigabe" und
`none` als "Gast" fuehren, ohne dass eine einzige Query den Namen neu lernen muss.

### 3.4 Dominanz statt Rangleiter

`role/dominance.ts` wird unveraendert wiederverwendet, nur mit Gruppen-Mengen:
`group.member.remove` und `group.member.role.assign` duerfen nur gegen ein Ziel
wirken, dessen effektive Gruppen-Rechte eine **echte Teilmenge** der eigenen sind.

Konsequenzen, die heutige Sonderfaelle von selbst erledigen:

* Zwei Owner koennen sich nicht gegenseitig entfernen (gleiche Menge → keine Dominanz).
* Ein Owner kann sich selbst degradieren, sobald ein zweiter Owner existiert
  (Selbstbezug ist kein Dominanz-Fall) → das ist genau **Issue #6173**.
* Eine frei angelegte Rolle mit disjunkten Extra-Rechten dominiert nichts → im
  Zweifel gesperrt. Fuer destruktive Aktionen die richtige Richtung.
* Kein `rank`-Feld, das gepflegt und validiert werden muesste.
* **Ausnahme von aussen:** Wer per `group.administer.any_<visibility>` freigeschaltet
  ist (E18), steht ueber **jedem** Mitglied, auch ueber Ownern
  (`outranksMembers`, `groupRole/authority.ts`). Nach Rechten allein waere er nur
  Peer eines Owners — und eine Gruppe, deren Owner sie missbraucht oder
  verschwunden ist, liesse sich dann nur noch abschalten, nie zurueckgeben. Recht
  und Deckung gelten fuer ihn weiter.

Dazu die zweite, unabhaengige Regel fuer `group.member.role.assign`: die
**zugewiesene** Rolle muss von der eigenen Menge gedeckt sein (`actor ⊇ rolle`) —
man kann nie mehr verteilen, als man selbst hat. Heute steckt das in der
Literal-Liste `adminCanSetRole = ['pending','usual','admin']`. Beide Regeln
zusammen: Dominanz ueber das *Ziel*, Deckung der *zugewiesenen Rolle*. Genau das
verhindert, dass sich in einer owner-losen Gruppe (E8) ein Admin selbst zum Owner
macht — die Wiederherstellung bleibt beim Netzwerk.

Die Deckungsregel macht **`group.owner.transfer` ueberfluessig** (E9): die
Owner-Rolle loest auf den vollen Katalog auf, also kann sie nur jemand vergeben,
der selbst alles haelt — ein Owner oder ein Netzwerk-Admin mit
`group.administer.any_<type>`. Ein eigener Key koennte die Regel nur *lockern*.

### 3.5 Effektive Rechte zur Laufzeit

```
effectiveInGroup(user, group) =
   (  permissionsOf(groupRole(user, group))      // aus der Mitgliedschaft; owner ⇒ voller Katalog
   ∪  networkAuthority(user, group.visibility)   // aus *.any_<visibility>; fuer Nicht-Mitglieder
   )                                             //   die einzige Quelle — unelevated nur die
                                                 //   drei Leserechte (E18, 3.9)
  ∩   networkPrerequisites(user)                 // E3: Keys mit Netz-Gegenstueck
  ∩   openGates(policy)                          // groupsEnabled, videoConference, …
```

Die **Vereinigung** der beiden Autoritaetsquellen ist wesentlich: ein
Netzwerk-Admin ist in einer fremden Gruppe Rolle `none`, und `none ∩ irgendwas`
waere leer — ein `.any_*`-Recht waere damit wirkungslos. Erst danach greift die
Deckelung. Zwei Folgerungen:

* Wer ein `.any_<type>`-Recht haelt, kann in einer Gruppe dieses Typs auch dann
  handeln, wenn er dort nur einfaches Mitglied ist — die Autoritaet kommt aus dem
  Netzwerk-Recht und muss nicht "freigeschaltet" werden.
* Die **Herkunft** wird trotzdem mitgefuehrt (`membership` vs. `network`), weil
  E16 sie braucht (`MATCH` statt `MERGE`), das Audit-Log sie braucht und die UI
  sie zeigen soll — es macht einen Unterschied, ob jemand als Mitglied oder als
  Netzwerk-Admin handelt (die Sicht-Idee aus #5578 haengt genau daran).

**Group-Resolution-Layer** — eine Funktion, die aus dem GraphQL-Aufruf die
Gruppen-ID bestimmt, damit `hasGroupPermission(key)` eine einzige Shield-Regel
bleiben kann:

| Quelle | Operationen |
|---|---|
| `args.groupId` | `JoinGroup`, `LeaveGroup`, `ChangeGroupMemberRole`, `RemoveUserFromGroup`, `muteGroup`, `setGroupMembershipVisibility`, `CreateGroupRoom`, `joinGroupVideoCall`, `generateGroupInviteCode`, `CreatePost` |
| `args.id` | `UpdateGroup`, `GroupMembers` |
| `args.postId` / `args.id` → `(post)-[:IN]->(group)` | `CreateComment`, `pinGroupPost`, `unpinGroupPost` |
| `args.roomId` → Room→Group | `CreateMessage`, `MarkMessagesAsSeen` |
| `parent` | Feldregeln auf `Group.*` |
| nichts → **kein Gruppenkontext** | Regel greift nicht; die Netzwerk-Permission entscheidet allein (z. B. Post ohne Gruppe) |

Aufloesung **einmal pro (Request, Gruppe)**, gecacht in `context`, in einer Query:

```cypher
MATCH (g:Group {id: $groupId})
OPTIONAL MATCH (:User {id: $userId})-[m:MEMBER_OF]->(g)
OPTIONAL MATCH (:User {id: $userId})-[e:ELEVATED_IN]->(g) WHERE e.expiresAt > datetime()
WITH g, coalesce(m.role, 'none') AS role, e IS NOT NULL AS elevated
OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: role})
RETURN visibilityOf(g) AS visibility, role, elevated,
       r.permissions AS permissions, coalesce(r.protected, false) AS protected
```

`visibilityOf(g)` ist kein Neo4j-Builtin, sondern das `CASE` aus
`helpers/groupAccessCypher.ts` — der Cypher-Zwilling von `privacyLevelFrom()`:
die Sichtbarkeit ist **abgeleitet** und steht nicht am Knoten (siehe 3.6).

**Invariante: Autorisierung prueft nie einen Rollennamen.** Weder netzwerkweit
noch gruppenintern — Rollennamen sind Daten, Rechte sind die Waehrung. `.any_*`
ist deshalb ein Katalog-Key wie jeder andere; dass er per Default an der Rolle
`admin` haengt, ist eine Zuweisung, keine Logik, und jede beliebige (auch frei
angelegte) Netzwerkrolle kann ihn halten. Die drei Ausnahmen sind benannt und
betreffen **Verhalten, nicht Rechte**: `owner` loest auf den vollen Katalog auf,
`pending` zaehlt nicht als Mitglied, `none` hat keine Kante (3.3).

**Bewusste Abweichung vom Netzwerk-Modell: kein Redis-Fleet-Cache.**
Netzwerkrollen sind eine Handvoll globaler Objekte — Gruppenrollen skalieren mit
der Gruppenzahl. Sie werden pro Request gelesen (eine Query, indexiert auf
`Group.id`) und in der Request-Lifetime gecacht; die Subscription
`groupPermissionsChanged(groupId)` informiert nur Clients, nicht andere Instanzen.

### 3.6 Datenmodell — zwei Varianten

| Variante | Speicherung | Pro | Contra |
|---|---|---|---|
| **A: Knoten** (empfohlen) | `(:Group)-[:HAS_GROUP_ROLE]->(:GroupRole)` | spiegelt `(:Role)`, erlaubt spaeter Sortierung/i18n/Audit pro Rolle, Rename in place wie `renameRole` | ein Knoten + Kante pro Rolle pro Gruppe (5 × Gruppenzahl), eine Migration mehr |
| B: JSON-Property | `Group.roleDefinitions` (String) | null Schema-Aenderung, kein Join | keine Referenzintegritaet zu `MEMBER_OF.role`, kein Teil-Update, Serialisierung im Resolver |

### 3.7 GraphQL-API

```graphql
type GroupPermissionCatalogEntry { key: String!, group: String!, gatedBy: [String!]!,
                                   requiresNetworkPermission: String, description: String! }
type GroupRole { name: String!, label: String, system: Boolean!, protected: Boolean!, permissions: [String!]! }

extend type Query {
  groupPermissionCatalog: [GroupPermissionCatalogEntry!]!        # isAuthenticated
  groupRoleTemplates: [GroupRole!]!                              # group.roleTemplate.manage
}
extend type Group {
  myGroupPermissions: [String!]!                                 # effektive Menge des Viewers
  roles: [GroupRole!]!                                           # group.role.manage
  myGroupRoleName: String                                        # ersetzt myRole (s. 4)
}
extend type Mutation {
  updateGroupRole(groupId: ID!, name: String!, permissions: [String!]!, label: String): GroupRole!   # label: null setzt auf i18n-Default zurueck
  createGroupRole(groupId: ID!, name: String!, permissions: [String!]!): GroupRole!
  renameGroupRole(groupId: ID!, name: String!, newName: String!): GroupRole!   # nur freie Rollen; Systemrollen aendern nur ihr label
  deleteGroupRole(groupId: ID!, name: String!, reassignTo: String!): Boolean!
  resetGroupRoles(groupId: ID!): [GroupRole!]!                   # zurueck auf Template
  setGroupMemberRole(groupId: ID!, userId: ID!, roleName: String!): GroupMember!
  updateGroupRoleTemplate(template: String!, name: String!, permissions: [String!]!, label: String): GroupRole!
}
extend type Subscription { groupPermissionsChanged(groupId: ID!): ID! }
```

Shield-Zuordnung durchgaengig `hasGroupPermission('…')`; `updateGroupRole` &
Co. haengen an `group.role.manage`, die Template-Mutation am neuen Netzwerk-Recht.

### 3.8 Frontend

* `$canInGroup(key, group)` analog `$can` — Datenquelle ist
  `Group.myGroupPermissions`, das mit der Gruppe sowieso geladen wird (kein
  Extra-Roundtrip, kein Vuex-Store noetig).
* `<permission-gate :permission="…" :group="group">` — dieselbe Komponente, neues
  optionales Prop; ohne `group` unveraendert netzwerkweit.
* Bestehende Gruppen-UI (Mitgliederliste, Settings-Tab, Invite-Button, Pin-Menue,
  Call-Button) haengt an `$canInGroup` statt an `myRole === 'owner'`-Vergleichen.
* Rechte-Verwaltung in der Gruppe **zweistufig**: "Einfach" = Preset-Auswahl
  (Standard / restriktiv / offen / **Kanal**: nur Admins posten und kommentieren,
  Mitglieder lesen — das ist #5588), "Erweitert" = Matrix Rolle × Recht, wie der
  Admin-Bereich. Ein Gruppen-Owner ist kein Netzwerk-Admin — die Matrix darf
  nicht der Default-Einstieg sein.

### 3.9 Owner-los: der Recovery-Pfad konkret

E8 erlaubt den owner-losen Zustand — hier steht, wie er endet. **Kein neuer
Resolver**, sondern drei vorhandene Teile. Zwei Regeln begrenzen dabei, was ein
Netzwerk-Recht ueberhaupt bedeutet:

> **Ein Netzwerk-Recht macht eine Gruppe erreichbar, nicht gelistet.** Wer
> `group.content.read.any_hidden` haelt, bekommt die versteckten Gruppen des Netzwerks
> *nicht* in Gruppenliste, Suche oder Sidebar — er kann eine **benannte** Gruppe
> oeffnen. Technisch loest `Query.Group` den Netzwerk-Zweig nur auf, wenn
> `id` oder `slug` genau eine Gruppe benennt (`namesOneGroup`); ohne das bleibt
> die Bedingung `false` und es zaehlt allein die eigene Mitgliedschaft. Das
> Verzeichnis der benennbaren Gruppen ist damit ein einziges und ein bewusst
> betretenes: die Gruppen-Verwaltung im Admin-Bereich (E17).

> **Lesen gilt sofort, Handeln auf Ansage** (E18). Die
> `.any_*`-Rechte falten unelevated nur `group.read`, `group.content.read` und
> `group.members.read` (`UNELEVATED_NETWORK_RIGHTS`). Alles Schreibende wartet
> auf `elevateInGroup` — eine Freischaltung mit **Pflicht-Begruendung**, die an der
> Gruppe vermerkt wird (`ELEVATED_IN`) und nach 60 Minuten von selbst verfaellt.
> Angeboten wird sie dort, wo man landet: als Karte auf dem Gruppenprofil, und
> nur, wenn sie etwas hinzufuegt (`mayElevateInGroup` vergleicht die gehaltenen
> Rechte mit denen nach Freischaltung — ein Owner bekommt kein Angebot).

1. **Auffinden.** Gruppen-Verwaltung im Admin-Bereich (E17) mit Filter "ohne
   Owner". Ohne diesen Schritt ist der Pfad nur reaktiv begehbar, und eine
   `hidden`-Gruppe gar nicht.
2. **Zugriff.** `group.administer.any_<visibility>` macht die Gruppe lesbar: der
   Netzwerk-Admin oeffnet das Profil, sieht Mitglieder und findet dort die
   Freischaltung. Nach der Freischaltung loest das Recht auf den vollen
   Gruppen-Katalog auf — er benutzt die **normale Mitglieder-UI der Gruppe**,
   keine Sonderoberflaeche.
3. **Einsetzen.** Ein bestehendes Mitglied wird auf die Owner-Rolle gesetzt.
   Beide Schutzregeln greifen: Dominanz (Admin ⊋ einfaches Mitglied) und Deckung
   (Admin ⊇ Owner-Rolle, als Gleichheit erfuellt). Nach E16 **nur** bestehende
   Mitglieder — der Admin kann sich nicht selbst einsetzen.

Randfaelle:

| Fall | Antwort |
|---|---|
| Gruppe hat Mitglieder, aber keinen Owner | Normalfall oben |
| Gruppe hat **kein** Mitglied mehr | Kein Recovery, sondern Loeschfall → #5388 |
| Gruppe hat einen Owner, der sie missbraucht oder nicht mehr da ist | Nach der Freischaltung kann der Netzwerk-Admin den Owner herabstufen oder entfernen (Ausnahme in 3.4), danach Normalfall oben. Die Mitglieder-UI zeigt Owner-Zeilen nur dann bedienbar, wenn `myGroupElevation.outranksMembers` gilt |
| Rollen der Gruppe sind verkonfiguriert (z. B. `group.role.manage` nirgends) | `resetGroupRoles` setzt auf das Template zurueck; ausserdem loest `owner` immer auf den vollen Katalog auf, kann also nie ausgeschlossen werden |
| Admin handelt in einer Gruppe, in der er nichts zu suchen hat | Die Freischaltung ist der Moderationsakt: sie wird mit Grund, Zeitpunkt und Person an der Gruppe vermerkt und verfaellt |
| Admin ruft eine Gruppe auf, in der er gar nichts darf | `Query.Group` liefert nichts — dieselbe Antwort wie fuer eine Gruppe, die es nicht gibt. Eine `hidden`-Gruppe verraet ihre Existenz auch dem Admin nicht, der das passende `.any_*` nicht haelt |

---

## 4. Migration

**Grundsatz:** Eine Migration enthaelt nie eine Kopie von Katalog oder Templates — sie
beschreibt eine Aenderung als **Regel** ("wer X hat, bekommt Y"). Was in einem Template steht,
bestimmt allein der Boot-Code; so kann eine alte Migration nicht still etwas anderes tun, wenn
sich ein Default spaeter aendert. Zwei Migrationen tragen den Umstieg:
`20261004100000-groups-run-on-templates` (`Group.groupType` → `Group.template`, Zugangs-Spalten
bis zum Boot aus dem Typ vorbelegt) und `20261004110000-network-group-rights` (Punkt 5, als Regel
auf den gespeicherten Netzwerkrollen).

1. **Templates seeden** beim Boot (`seedGroupRoleTemplates`), idempotent mit
   `ON CREATE`-Semantik wie `seedRole` — eine Betreiber-Anpassung wird nie ueberschrieben.
2. **Pro bestehende Gruppe** die Rollen ihres Templates anlegen — ebenfalls beim Boot
   (`seedRolesForGroupsWithoutRoles`), der jede Gruppe ohne Rollen repariert und die
   Zugangs-Spalten aus den Rollen schreibt. Eine geschlossene Gruppe mit `showMembers` behaelt
   ihre offene Mitgliederliste (`group.members.read` auf `none`); eine versteckte nicht — das
   Recht impliziert `group.read` und wuerde sie sichtbar machen. Die Default-Mengen sind ein
   **Audit der heutigen Regeln** (Abschnitt 5) → Upgrade ohne Verhaltensaenderung. Gleiche
   Disziplin wie bei `role/defaults.ts` ("The sets are an audit of the pre-RBAC shield").
3. **Enum-Ausstieg zweistufig, ohne Hard-Break:**
   `Group.myRole: GroupMemberRole` bleibt (deprecated) und liefert den Namen,
   solange er einer der Seed-Namen ist, sonst `null`; neu ist
   `myGroupRoleName: String`. `ChangeGroupMemberRole` bleibt (deprecated) und
   delegiert an `setGroupMemberRole`. Entfernen im naechsten Major.
   *Grund:* Custom-Rollennamen sind durch ein GraphQL-Enum nicht transportierbar —
   der Break ist unvermeidbar, nur seine Zeitpunkt-Wahl ist es nicht.
4. **Shield-Umbau** Regel fuer Regel, jede mit Vorher/Nachher-Test (siehe 6).
4b. **`InviteCode.externalAllowed`** (E11): bestehende Gruppen-Codes werden auf
   `true` migriert, damit sich am Verhalten ausgegebener Codes nichts aendert.
   Neue Codes setzen das Flag nur, wenn der Ersteller `group.invite.external`
   haelt — geprueft wird es im Signup-Pfad, nicht beim Gruppen-Beitritt.
4c. **`Group.rolesCustomizedAt`** (E12): wird bei der ersten erfolgreichen
   Rollen-Mutation gesetzt und ist das Kriterium fuer das Admin-Werkzeug
   "Template auf nicht angepasste Gruppen anwenden".
5. **Sieben neue Netzwerk-Rechte** in den Netzwerk-Katalog, flach pro `groupType`
   (Liste und Defaults in 7.3): `group.content.read.any_{closed,hidden}`,
   `group.moderate.any_{closed,hidden}`, `group.administer.any_{public,closed,hidden}`.
   Keines im Baseline.
   Bestehende Rollen bekommen sie per Regel: `content.moderate` → die `any_closed`-Lese- und
   Moderationsrechte; `role.manage` → zusaetzlich die `any_hidden`-Rechte, alle drei
   `administer.any_*` und `group.roleTemplate.manage`. Im selben Schritt werden die
   Videocall-Rechte von Typ auf Tuer umgestellt (`create_public` → `create_open`,
   `create_closed`/`_hidden` → `create_restricted`).

---

## 5. Default-Matrix (Audit des Ist-Zustands)

`✓` = gewaehrt, `·` = nicht gewaehrt. `none` je groupType.

| Recht | none/public | none/closed | none/hidden | pending | usual | admin | owner |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `group.read` | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ |
| `group.content.read` | ✓ | · | · | · | ✓ | ✓ | ✓ |
| `group.members.read` | ✓ | nur `showMembers` | · | · | ✓ | ✓ | ✓ |
| `group.join` | ✓ | · | · | · | · | · | · |
| `group.join.request` | · | ✓ | · | · | · | · | · |
| `group.leave` | · | · | · | ✓ | ✓ | ✓ | ✓ ⚠ |
| `group.post.create` | · | · | · | · | ✓ | ✓ | ✓ |
| `group.comment.create` | · | · | · | · | ✓ | ✓ | ✓ |
| `group.chat.participate` | · | · | · | · | ✓ | ✓ | ✓ |
| `group.videoCall.join` | · | · | · | · | ✓ | ✓ | ✓ |
| `group.videoCall.create` | · | · | · | · | ✓ | ✓ | ✓ |
| `group.invite` | · | · | · | · | ✓ (public) | ✓ | ✓ |
| `group.invite.external` | · | · | · | · | · | ✓ | ✓ |
| `group.post.pin` | · | · | · | · | · | ✓ | ✓ |
| `group.member.role.assign` | · | · | · | · | · | ✓ | ✓ |
| `group.member.remove` | · | · | · | · | · | ✓ ⚠ | ✓ |
| `group.settings.manage` | · | · | · | · | · | ✓ ⚠ | ✓ |
| `group.role.manage` | · | · | · | · | · | · | ✓ |

**Vier bewusste Abweichungen vom Ist-Zustand** (mit ⚠ markiert) — drei davon
korrigieren
die Inkonsistenzen aus 1.2 und decken sich mit dem, was #8537 ausdruecklich will
("generell sollten Admins viele Dinge tun koennen, die im Moment nur Inhaber tun
koennen. Aber nicht Inhaber bestimmen koennen."):

* `group.settings.manage` und `group.member.remove` gehen an `admin`. Heute
  owner-only, obwohl die Schema-Doku Admins nennt und Admins Rollen aendern
  duerfen. Wer Rollen setzen darf, kann ohnehin faktisch entfernen.
* `group.chat.participate` / `group.videoCall.*` werden **nicht enger, sondern
  sichtbar**: die Mitgliedschaftspruefung existiert heute, steckt aber je Operation in
  einer anderen Schicht (Resolver-Cypher, JS-Guard, `CHATS_IN`-Kante). Sie wandert in
  den Shield, damit dieselbe Frage dieselbe Antwortstelle hat.
* `group.invite` fuer `usual` nur in `public`-Gruppen (Absicht der heutigen,
  defekten Regel) — in `closed`/`hidden` erst ab `admin`.

---

## 6. Shield-Umbau: Mapping alt → neu

| heute | neu |
|---|---|
| `isAllowedToChangeGroupSettings` | `hasGroupPermission('group.settings.manage')` (+ `group.role.manage` und der E10-Deckel, wenn `groupType` im Payload steht — das Preset schreibt Rollen) |
| `isAllowedSeeingGroupMembers` | `hasGroupPermission('group.members.read')` |
| `isAllowedToChangeGroupMemberRole` | `and(hasGroupPermission('group.member.role.assign'), dominatesInGroup)` |
| `canRemoveUserFromGroup` | `and(hasGroupPermission('group.member.remove'), dominatesInGroup)` |
| `isAllowedToJoinGroup` | `or(group.join, group.join.request)` — Zielrolle folgt dem Recht, nicht dem `groupType`-`CASE` im Resolver; jemand *anderen* hinzufuegen = `group.member.role.assign` |
| `isAllowedToLeaveGroup` | `hasGroupPermission('group.leave')` |
| `isMemberOfGroup` (bei `CreatePost`) | `hasGroupPermission('group.post.create')` |
| `canCommentPost` | `hasGroupPermission('group.comment.create')` |
| `isAllowedToPinGroupPost` | `hasGroupPermission('group.post.pin')` |
| `isAllowedToGenerateGroupInviteCode` | `hasGroupPermission('group.invite')`, fuer einen registrierungsfaehigen Code zusaetzlich `group.invite.external` (E11); der Bug aus 1.3 verschwindet mit der Regel |
| `CreateGroupRoom`, `CreateMessage`, `MarkMessagesAsSeen` (Gruppen-Room) | `hasGroupPermission('group.chat.participate')` |
| `joinGroupVideoCall` | `hasGroupPermission('group.videoCall.join')`, Start `group.videoCall.create` |
| `muteGroup`, `unmuteGroup`, `setGroupMembershipVisibility` | `hasGroupPermission('group.content.read')` (Mitgliedschaft implizit) |
| `Group: { '*': isAuthenticated }` + TODO im Shield | Feldregeln gegen `group.read` / `group.content.read` — erledigt das dortige "TODO — only those who are allowed to see the group" |
| `Group.membersCount` (heute offen fuer alle Angemeldeten) | `group.members.read` (E7) |

Zwoelf Guards mit eigener Query → **eine** Regel plus ein Resolution-Layer.

---

## 7. Abgleich mit bestehenden Konzepten und Issues

### 7.1 #5386 "Group Administration" (Tirokk, 2022) — das bestehende Konzept

Es ist eine Todo-Sammlung, kein Rechtemodell — aber die tragenden Saetze decken
sich mit diesem Entwurf, teils wortgleich:

| Aussage in #5386 | Entsprechung hier |
|---|---|
| "Owners can all do what admins can" | Dominanz als echte Mengen-Obermenge (3.4) — kein Rangfeld noetig |
| "Owners only can decide **what admins can do**: invite new members, confirm pending members" | **genau `group.role.manage` + Matrix.** Das erste ist `group.invite`, das zweite `group.member.role.assign` (Freigeben = Rolle zuweisen); eine eigene Annehmen/Ablehnen-Oberflaeche fehlt noch (#10352). Das Konzept ist die Verallgemeinerung dieses Satzes. |
| Netzwerk-Setting: Gruppen-Erstellung an/aus, `hidden` unmoeglich, Erstellung nur fuer Admins | **bereits erledigt** durch die `groupsEnabled`-Policy + `group.create_public/_closed/_hidden` (#5549 ist damit beantwortet) |
| "enable owners to downgrade their role in case another owner exists" | faellt aus der Dominanz heraus (#6173) |
| "is an owner allowed to change the role of other owners?" | **nein** — gleiche Menge, keine Dominanz (3.4) |
| "enable owners to leave the group provided another owner exists" | **bewusste Abweichung (E8):** `group.leave` gilt ohne Bedingung, die Gruppe darf owner-los werden. Ihre Admins bleiben handlungsfaehig, Recovery ueber `group.administer.any`. |
| "if I'm not allowed seeing group members: can I see the members count?" | nein (E7) — `Group.membersCount` haengt an `group.members.read` |
| `pending`-Mitglieder oben in der Liste, Notification-Todos | reines UI, unabhaengig — bleibt in #5386 |
| closed group: "who can post public posts of the group" | eigene Achse (Sichtbarkeit einzelner Posts *innerhalb* einer Gruppe), siehe 9 |

**#5386 wird nicht ersetzt, sondern geschnitten:** das Rechtemodell wandert
hierher, die UI- und Notification-Todos bleiben dort. Im EPIC als "relates",
nicht als "fixes".

### 7.2 Issues, die das Modell miterledigt

| Issue | Warum |
|---|---|
| #5588 "Groups – limit who can post" (inkl. Read-only-Channel) | `group.post.create` / `group.comment.create` pro Rolle; "Kanal" = beide nur fuer `admin` — als Preset im Gruppen-UI (3.8) |
| #5511 "Let Group Members Invite Other Users" | `group.invite` fuer `usual` |
| #8398 "joinGroup on hidden groups" (Bug) | `none`/hidden haelt weder `group.join` noch `group.join.request` → strukturell unmoeglich statt per Sonderfall |
| #6173 "Owner can Degrade their Own Role if a Second Owner Exists" | Dominanz (3.4) |
| #8537 "Ein Admin soll auch einladen koennen … aber nicht Inhaber bestimmen" | genau die Abweichungen in 5: Admin bekommt `settings.manage`, `member.remove`, `invite`. "Nicht Inhaber bestimmen" faellt aus der Deckungsregel (3.4), ohne eigenes Recht |
| #7702 "Group moderation" | Teil 1 ("user management") ist `group.member.*`. Teil 2 (fremde Posts entfernen) wird ein eigenes Issue am EPIC, weil Key und Funktion zusammen kommen muessen (E9). Reports bleiben netzwerkweit (E6) |
| #8993 "Groups: Show user roles" | `myGroupRoleName` + `Group.roles`; mit frei benannten Rollen wird daraus eine i18n-Frage (Seed-Namen uebersetzt, Custom-Namen wortwoertlich) |
| #5388 "Delete A Group" | **nicht** miterledigt: ohne `DeleteGroup`-Resolver waere `group.delete` ein Key ohne Konsument (E9). Der Key kommt mit #5388, das die Datenschutz-Fragen ohnehin klaeren muss — inklusive der neuen Antwort aus E8: eine owner-lose Gruppe wird nicht aufgeraeumt, sondern per `group.administer.any_<type>` wiederbelebt |

### 7.3 Netzwerk-Seite: #6751, #9405, #5578 — hier muss nachgeschaerft werden

Ein einzelner Schluessel `group.administer.any` ist zu grob fuer das, was diese
drei Issues verlangen:

* **#9405** (Bug): der Netzwerk-*Moderator* kommt nicht an Inhalte von
  `closed`/`hidden`-Gruppen. Er braucht **Lesezugriff zur Moderation**, nicht
  Owner-Rechte.
* **#6751**: der Netzwerk-*Admin* soll alle Gruppen **verwalten** koennen.
* **#5578** ("Special ideas"): ein Umschalter fuer Moderatoren/Admins zwischen
  "nur was ich normal sehe" und "alles", Fremdinhalt sichtbar markiert (blauer
  Rahmen). Das ist bewusst **kein** Recht, sondern eine Sicht — das Recht
  entscheidet nur, ob der Schalter existiert.

Deshalb getrennte Netzwerk-Rechte, flach pro `groupType` wie `group.create_*` (E5):

| Key | Gruppe | Default | Bedeutung |
|---|---|---|---|
| `group.content.read.any_closed` | moderation | moderator | Inhalte jeder `closed`-Gruppe lesen (#9405) |
| `group.content.read.any_hidden` | moderation | admin | dito fuer `hidden` |
| `group.moderate.any_closed` | moderation | moderator | in jeder `closed`-Gruppe moderieren (faltet `group.post.moderate` in den Gruppen-Scope) |
| `group.moderate.any_hidden` | moderation | admin | dito fuer `hidden` |
| `group.administer.any_public` | administration | admin | jede `public`-Gruppe verwalten wie ein Owner |
| `group.administer.any_closed` | administration | admin | dito fuer `closed` |
| `group.administer.any_hidden` | administration | admin | dito fuer `hidden` (#6751, Lockout-Recovery aus E8) |

**Konsistenz mit E9:** die beiden `group.moderate.any_*`-Keys haben erst dann
einen Konsumenten, wenn `group.post.moderate` existiert — sie ziehen also mit
Teil-Issue 9 ein, nicht mit 7. Vorher gaebe es nichts, was sie in den
Gruppen-Scope falten koennten.

Kein `_public` bei Lesen und Moderieren: der Inhalt einer `public`-Gruppe ist
ohnehin offen und faellt beim Moderieren unter das bestehende netzwerkweite
`content.moderate`. Bei `administer` braucht es die `_public`-Variante dagegen,
weil auch eine public Gruppe owner-los werden kann.

Alles, was `moderator` haelt, muss auch `admin` halten — sonst bricht die
Dominanzkette `owner ⊋ admin ⊋ moderator ⊋ user` (dokumentiert in
`role/defaults.ts`).

Die Sicht-Umschaltung aus #5578 ist **kein** Recht: sie setzt nur
`group.content.read.any_*` voraus und ist ansonsten UI.

**Wie #9405 technisch behoben wird** — und was die Konsumenten dieser Rechte sind
(E9). Vor dem Umbau stand in `helpers/postFilter.ts` ein hartcodiertes
`'public'`:

```cypher
WHERE NOT g.groupType = 'public' AND NOT g.id IN $groupIds
```

Danach entscheidet dort die **Rechtelage der Gruppe**, nicht ihr Label — und
weil der Typ inzwischen abgeleitet ist (E2, abgewichen), ist die erste
Bedingung die gespiegelte Spalte selbst:

```cypher
WHERE NOT coalesce(g.nonMemberContentRead, false)
  AND NOT g.id IN $groupIds
  AND NOT visibilityOf(g) IN $readableVisibilities
```

mit `$groupIds` = die Gruppen, in denen der Viewer selbst `group.content.read`
haelt, und `$readableVisibilities` = die Sichtbarkeiten aus seinen gehaltenen
`group.content.read.any_*`-Rechten. Kein zusaetzlicher Join, keine mit der
Gruppenzahl wachsende Typ-Liste — die Spiegelspalte ist genau dafuer da.

| Recht | Konsumenten |
|---|---|
| `group.content.read.any_<type>` | `$readableGroupTypes` im Post-Filter, `Query.Group`/`GroupMembers` fuer Gruppen dieses Typs, Maskierung der Report-Queue (E19) |
| `group.moderate.any_<type>` | faltet `group.post.moderate` in den Gruppen-Scope — zieht daher mit Teil-Issue 9 ein (E9) |
| `group.administer.any_<type>` | faltet den vollen Gruppen-Katalog; Owner-Recovery (3.9), `resetGroupRoles`, Gruppen-Verwaltung (E17) |

---

## 8. Risiken & offene Fragen

**Risiken**

| Risiko | Gegenmassnahme |
|---|---|
| Breaking Change am `GroupMemberRole`-Enum | Zweistufiger Ausstieg (4.3); Deprecation eine Minor-Version vorher |
| Rechte-Aenderung sperrt eine Gruppe aus (z. B. `group.role.manage` versehentlich entzogen) | `owner` ist protected und loest auf den vollen Katalog auf → kann nie ausgeschlossen werden; zusaetzlich `resetGroupRoles` und netzwerkseitig `group.administer.any_*` |
| Performance: ein Lookup pro Gruppenkontext | Eine indexierte Query, Request-Cache; Messung gegen den Seed-Datensatz in den Akzeptanzkriterien |
| UI-Ueberforderung des Gruppen-Owners | Preset-Modus als Default, Matrix nur unter "Erweitert" |
| Halb migrierte Gruppen (Migration bricht ab) | Fehlender `GroupRole`-Knoten ⇒ **fail closed** auf die leere Menge, plus Boot-Check, der nachseeded |

**Offene Fragen** — keine mehr. E1-E15 in Abschnitt 2 sind der geklaerte Stand;
was bewusst nicht in Schritt 1 gehoert, steht in 9.

## 9. Abgrenzung

Nicht in diesem Vorhaben:

* ~~**Aufloesung von `groupType` in Rechte** (E2)~~ — **doch drin**: der Typ ist
  jetzt abgeleitet und die Lesewege fragen die gespiegelten Spalten am
  Gruppenknoten, ohne Per-Zeilen-Rollen-Lookup. Die Performance-Betrachtung, die
  das Parken begruendete, ist damit beantwortet (`helpers/postFilter.ts`, 7.3).
* **Sichtbarkeit einzelner Posts innerhalb einer Gruppe** ("public posts of closed
  groups", #5386) — eine zweite Achse neben der Rolle: nicht *wer darf posten*,
  sondern *wie weit reicht ein einzelner Post*. Beruehrt das Public-Content-Feature
  und gehoert in ein eigenes Konzept.
* **Moderations-Sicht-Umschalter** (#5578) — UI-Thema, setzt nur
  `group.content.read.any_*` voraus. (Die Gruppen-*Verwaltung* im Admin-Bereich
  ist dagegen drin, E17.)
* **Fremde Posts aus einer Gruppe entfernen** (`group.post.moderate`, #7702) —
  eigenes Issue am EPIC: Key und Resolver kommen zusammen (E9). Offen dort:
  Soft-Delete oder Ausblenden, Benachrichtigung des Autors, Verhaeltnis zur
  netzwerkweiten Moderation.
* **Gruppe loeschen** (`group.delete`) — kommt mit #5388.
* **Systemrolle `banned`** (E14) — Ausschluss mit Gedaechtnis; eigenes Issue, das
  klaeren muss, ob die `MEMBER_OF`-Kante bestehen bleibt, was mit den Beitraegen
  passiert und ob der Ausschluss befristet ist.
* **Events / Friendship / ActivityPub-Gruppen** — beruehren den Katalog spaeter,
  aber nicht die Architektur.
* **Netzwerkweiter Katalog** bleibt unveraendet, ausser: `group.administer.any`
  und `group.roleTemplate.manage` kommen hinzu.

---

## 10. Umsetzungsschnitt (EPIC + Teil-Issues)

| # | Issue | Service | Inhalt |
|---|---|---|---|
| 0 | 🌟 EPIC | — | Dieses Konzept, Entscheidungen, Default-Matrix, Reihenfolge |
| 1 | 🐛 Bug | backend | `isAllowedToGenerateGroupInviteCode` wirkungslos (1.3) + Negativ-Tests — **vorziehen, unabhaengig vom Umbau** |
| 2 | 🚀 Feature | backend | Gruppen-Katalog, `GroupRoleService`, Templates, Seed + Migration, Default-Matrix |
| 3 | 🔧 Refactor | backend | Shield-Umbau: `hasGroupPermission`, Group-Resolution-Layer, `dominatesInGroup`, 12 Guards ersetzen (inkl. Chat-/Call-Luecke) |
| 4 | 🚀 Feature | backend | GraphQL-API: Katalog-Query, `Group.myGroupPermissions`, `Group.roles`, Rollen-Mutationen, Subscription, Enum-Deprecation |
| 5 | 🚀 Feature | webapp | `$canInGroup`, `<permission-gate :group>`, bestehende Gruppen-UI von `myRole`-Vergleichen loesen |
| 6 | 🚀 Feature | webapp | Rechte-Verwaltung in der Gruppe: Preset-Modus + Matrix |
| 7 | 🚀 Feature | backend + webapp | Netzwerk-Ebene: Template-Verwaltung im Admin-Bereich, die sieben `*.any_<type>`-Rechte aus 7.3, `group.roleTemplate.manage` — schliesst #9405 und #6751 |
| 8 | 🚀 Feature | backend + webapp | **neu:** fremde Posts aus der Gruppe entfernen — `group.post.moderate` samt Resolver und UI (an #7702) |
| 10 | 🚀 Feature | webapp | Gruppen-Verwaltung im Admin-Bereich (E17): Liste, Suche, Filter (Typ, Kategorie, **ohne Owner**, deaktiviert), Detailansicht, Owner-Recovery — ersetzt den `organizations.vue`-Stub, erledigt #6751 |
| 9 | 🔧 Refactor | backend | ~~*(geparkt)*~~ **erledigt** — `groupType` in Rechte aufgeloest: `Group.visibility` ist abgeleitet, `Group.template` ist das Gespeicherte |

Reihenfolge: 1 → 2 → 3 → 4 → (5 ∥ 6) → 7 → 10; 8 danach, 9 kam mit der
Ableitung unterwegs mit. Nach 3 ist das Verhalten identisch zu heute (plus die
vier Korrekturen aus 5), ab 4 wird es konfigurierbar, und 10 ist der Punkt, an
dem E8 tatsaechlich bedienbar wird.

Querverweise fuers EPIC: **relates** #5386, #5578, #7702, #8993, #8537, #5388,
#5549 — **fixes** #5588, #5511, #8398, #6173, #9405 (Teil-Issue 7), #6751 (Teil-Issue 10).

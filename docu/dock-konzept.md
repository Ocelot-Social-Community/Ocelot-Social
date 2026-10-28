# Dock: Seitenleisten neben dem Inhalt — Konzept

Stand: 2026-10-28
Status: Entscheidungen getroffen (Abschnitt 8), Umsetzung läuft

Links und rechts vom Inhalt entsteht Raum, der mit Modulen befüllt werden kann: das **Dock**. Das Dock gibt es auf allen Seiten des Default-Layouts. Welche Module wo erscheinen, wird pro Modul gesteuert. Erstes Modul: **laufende Video-Calls** (rechts), nur auf dem Hauptfeed.

---

## 1. Ausgangslage

### 1.1 Video-Calls

- Jede Gruppe hat höchstens einen Call, LiveKit-Raum `group-<groupId>` (`roomNameForGroup`).
- Webhook (`backend/src/livekit/webhook.ts`) und Poller (`backend/src/livekit/poller.ts`, 15 s) veröffentlichen pro Gruppe **nur eine Zahl**: `VIDEO_CALL_PARTICIPANT_COUNT_CHANGED { groupId, count }`.
- Lesend gibt es nur `videoCallParticipantCount(groupId)` (Shield: `group.videoCall.join`) und die Subscription `videoCallParticipantCountChanged(groupId)` (Filter: aktive Mitgliedschaft, 30 s gecacht).
- Die Zahl ist bereits `listParticipants().length`, die Teilnehmer werden also heute schon geholt und wieder verworfen.
- Ein Join-Token trägt `metadata.userId` und die Identität `userId#<suffix>`. Mehrere Tabs derselben Person sind mehrere LiveKit-Teilnehmer.
- `toldRooms.ts`: Rooms, deren laufenden Call ein Client per Query erfahren hat, bekommen beim nächsten Poll ihre Wahrheit nachgereicht (#10508). Jeder neue Lesepfad muss das ebenfalls tun.
- Die Gruppenseite (`pages/groups/_id/_slug.vue`) zeigt die Zahl am Call-Button (`os-counter-icon`), holt sie per Query und hält sie per Subscription aktuell.

### 1.2 Layout

`layouts/default.vue` hat einen einzigen Container (`ds-container-x-large`) ohne Seitenraum. Unten rechts sitzen fix der schwebende Chat (`.chat-modul`) und das minimierte Video. Das Dock darf beides nicht verdecken.

## 2. Ziel

1. Ein **Dock-Gerüst**, links und rechts, auf allen Seiten des Default-Layouts. Module werden registriert, und **pro Modul** wird gesteuert, auf welchen Seiten es erscheint.
2. **Modul „Laufende Calls“** (rechts, nur `/`): alle Calls, auf die ich Zugriff habe, auch in versteckten Gruppen. Pro Call die Gruppe und die Teilnehmer, kein Video.
3. **Mobil:** sichtbar, aber nicht störend, über ein Fähnchen am Rand.
4. **Eine Datenquelle** für „Call läuft, wer ist drin“: Die Zahl am Gruppen-Button und das Dock dürfen nicht auseinanderlaufen.

## 3. Backend

### 3.1 Schema

```graphql
type ActiveVideoCall {
  group: Group!
  "Connections to the call — tabs and devices, so two people sharing an account count twice."
  participantCount: Int!
  "The distinct users in the call, in the order they joined."
  participants: [User!]!
}

type ActiveVideoCallChange {
  groupId: ID!
  "The running call, or null once it has ended."
  call: ActiveVideoCall
}

type Query        { activeVideoCalls: [ActiveVideoCall!]! }
type Subscription { activeVideoCallChanged: ActiveVideoCallChange! }
```

- **`participantCount`** zählt LiveKit-Verbindungen, also Tabs (E2): Zwei Menschen können sich einen Account teilen, die Zahl soll sie nicht verschlucken. **`participants`** ist nach `userId` dedupliziert und nach Beitrittszeit sortiert. Die Karte zeigt deshalb die Zahl, und die Avatare darunter können weniger sein.
- Der Nutzer hinter einer Verbindung wird aus `metadata.userId` gelesen. Ist die Metadata unlesbar, dient die Identität `userId#suffix` als Rückfall.
- `Group.activeVideoCall` für die Gruppenseite folgt erst in Schritt 5, zusammen mit deren Umstellung, damit kein ungenutztes Feld entsteht.

### 3.2 Gemeinsamer Kern (`resolvers/videoCalls.ts`)

- **`getRoomParticipants(config, roomName)` → `{ count, userIds }`** ist die einzige Stelle, die LiveKit nach Teilnehmern fragt. `getLiveParticipantCount` (Gruppen-Button, Webhook) ist darauf umgestellt, sodass Zahl und Liste aus derselben Abfrage stammen. Auf Wunsch kann das als eigene Datei `livekit/rooms.ts` ausgelagert werden. Das würde aber nur Importe und Mocks verschieben, deshalb bleibt es vorerst hier.
- **Gemeinsame Anfragen statt Cache:** Ein Call-Wechsel erreicht alle Docks gleichzeitig, und alle fragen im selben Moment nach. Gleichzeitige Lese-Anfragen (`listRooms`, `listParticipants` je Raum) werden deshalb geteilt, sodass N Betrachter eine einzige LiveKit-Anfrage auslösen. Gespeichert wird nichts, weil eine gecachte Antwort genau nach dem Wechsel veraltet wäre, der alle fragen ließ.
- **`joinGroupVideoCall` teilt nie:** Wer anhand der Zahl entscheidet, ob er einen Call eröffnet oder ihm beitritt, fragt LiveKit selbst.
- Jeder Lesepfad, der einen laufenden Call ausliefert, ruft `noteCountTold` (#10508).

### 3.3 Zugriff

- `activeVideoCalls`: Ist `videoConference` aus, kommt `[]` zurück, ohne LiveKit zu fragen. Sonst: `listRooms()` liefert die `group-*`-Räume als Kandidaten, und pro Kandidat wird `groupAuthorization.forGroup(id).has('group.videoCall.join')` geprüft. Das ist dieselbe Regel wie beim Beitreten, deshalb sind versteckte Gruppen richtig erfasst, und Antragsteller (`pending`) sehen nichts. Die Teilnehmer werden nur für Räume abgefragt, die der Betrachter sehen darf.
- Kann LiveKit für einen einzelnen Raum nicht antworten, fällt nur dieser Raum weg. Scheitert dagegen `listRooms`, gibt die Abfrage einen Fehler zurück, statt so zu tun, als liefe nichts.
- **Elevation** wird nicht eigens behandelt. `has()` berücksichtigt sie nur, wenn jemand in einer Gruppe ausdrücklich elevated ist, und das passiert nur in Gruppen.
- **Teilnehmer** sieht, wer beitreten dürfte, also nichts, was beim Beitreten nicht ohnehin sichtbar wäre.
- **Geblockte Nutzer** bleiben in der Liste. Der Client markiert sie über `User.isBlocked`, also nur „von mir geblockt“ (E3).

### 3.4 Subscription

- `activeVideoCallChanged` hängt am **bestehenden** Event `VIDEO_CALL_PARTICIPANT_COUNT_CHANGED`. Webhook und Poller bleiben unverändert.
- **Filter** `mayJoinCallCached`: dasselbe Join-Recht, aber mit jeweils frischem Autorisierungs-Scope. Der Kontext einer Subscription lebt so lange wie die Verbindung, und dessen Request-Memo würde die Rechte vom Zeitpunkt des Abonnierens festschreiben. Antworten werden höchstens 30 s gehalten, „nein“ ebenso wie „ja“, denn die meisten Events betreffen fremde Gruppen. Danach wird der ganze Cache auf einmal verworfen, damit er nicht unbegrenzt wächst.
- **Payload:** `{ groupId, call }`, wobei `call` bei 0 gleich `null` ist. `participants` wird lazy bei LiveKit nachgefragt, weil der Event nur die Zahl kennt. Scheitert diese Nachfrage, kommt `[]` zurück; die Zahl bleibt trotzdem stehen.
- Ein Wechsel bei gleicher Zahl (A geht, B kommt) erzeugt über den Webhook trotzdem zwei Events. Nur im reinen Poller-Betrieb kann so ein Wechsel bis zum nächsten Zahlwechsel unbemerkt bleiben. Das wird akzeptiert.

### 3.5 Bestehende API

`videoCallParticipantCount` und `videoCallParticipantCountChanged` bleiben unverändert und laufen über den Kern aus 3.2. Die Gruppenseite wird in Schritt 5 umgestellt; erst dann stellt sich die Frage, ob die alten Felder `@deprecated` werden.

## 4. Webapp: Dock-Gerüst

### 4.1 Struktur

```text
components/Dock/
  Dock.vue                 # side: 'left' | 'right'; renders the modules that match the route
  DockFlag.vue             # mobile / narrow: edge tab + drawer
  modules.js               # registry
components/Dock/modules/ActiveVideoCalls/
  ActiveVideoCalls.vue
  ActiveVideoCallCard.vue
```

### 4.2 Modul-Registry und Sichtbarkeit

```js
// components/Dock/modules.js
export default [
  {
    id: 'activeVideoCalls',
    side: 'right',
    component: () => import('./modules/ActiveVideoCalls/ActiveVideoCalls.vue'),
    routes: ['index'],                 // route names; '*' = everywhere
    enabled: ({ store }) => store.getters['videoCall/enabled'],  // videoCallConfig
  },
]
```

- Ein Modul wird **nur gemountet**, wenn Route und Gate passen. Auf allen anderen Seiten laufen weder Query noch Subscription.
- Ein Modul meldet per Event `has-content` (`true/false`). Ein Dock ohne Inhalt nimmt keinen Platz ein. Mobil gibt es dann auch kein Fähnchen.
- Ausbaustufen der Steuerung sind in E1 beschrieben. Das Registry-Format ist so gewählt, dass `routes` später überschrieben werden kann, ohne Module umzubauen.

### 4.3 Breakpoints

| Viewport | Darstellung |
|---|---|
| breit (≥ 1760 px) | Seitenspalte von 256 px im freien Rand neben der 1200-px-Inhaltsspalte, fix unter dem Header. Die Inhaltsspalte bleibt unverändert, damit der Feed nicht schmaler wird. 1760 = 1200 + 2 × (256 + 24 Abstand); das linke Dock spiegelt das rechte. |
| darunter, inkl. mobil | **Fähnchen** am jeweiligen Rand: vertikaler Tab, vertikal mittig (nicht unten, dort sitzen Chat und Video), mit Zähler-Badge. Tippen öffnet eine Schublade von dieser Seite; schließen per Tap daneben, ESC oder Wischen. |

Barrierefreiheit: Das Fähnchen ist ein `button` mit `aria-expanded` und `aria-controls`. Die Schublade ist ein Dialog mit Fokusfalle, und der Fokus kehrt danach zum Fähnchen zurück.

## 5. Modul „Laufende Calls“

Karte pro Call:

- Gruppenavatar und Name (Link zur Gruppe), ein Schloss-Symbol bei geschlossenen oder versteckten Gruppen.
- Teilnehmerzahl (Verbindungen) und Avatare der verschiedenen Nutzer (bis 5, dann „+n“), Namen im Tooltip. Geblockte Nutzer bekommen ein Symbol am Avatar.
- Button „Beitreten“ öffnet das bestehende Pre-Join (`store/videoCall`), so wie der Gruppen-Button.
- Bin ich selbst in diesem Call, wird die Karte hervorgehoben („Du bist dabei“) und es gibt keinen Beitreten-Button.
- Sortierung: der eigene Call zuerst, danach nach Teilnehmerzahl absteigend.

## 6. Tests

- **Backend:** `rooms.ts` (Cache, Dedupe, 404 → leer), `activeVideoCalls` (Mitglied, Nicht-Mitglied, versteckte Gruppe, fehlendes Join-Recht, Policy aus), Subscription-Filter, `noteCountTold` auf dem neuen Pfad, `Group.activeVideoCall`. LiveKit wird gemockt wie in `videoCalls.spec.ts`.
- **Webapp (Jest):** Registry-Matching (Route, Gate), `has-content` → Dock/Fähnchen ein/aus, Karte (Hervorhebung, Geblockt-Symbol, „+n“), Fähnchen-a11y.
- **e2e:** nach der Umsetzung zu entscheiden. Kandidat: zwei Nutzer, einer im Call einer versteckten Gruppe, der andere sieht ihn im Dock.

## 7. Umsetzungsreihenfolge

1. ✅ Backend-Kern `getRoomParticipants`, Count-Pfad darauf umgestellt.
2. ✅ `ActiveVideoCall`, `activeVideoCalls`, `activeVideoCallChanged`.
3. ✅ Dock-Gerüst und Registry (`components/Dock/`), im Default-Layout links und rechts eingehängt.
4. ✅ Modul „Laufende Calls“ (`components/Dock/modules/ActiveVideoCalls/`), 11 Sprachen.
5. `Group.activeVideoCall`, Gruppenseite darauf umstellen.

## 8. Entscheidungen

Getroffen am 2026-10-28:

| # | Frage | Entscheidung | Warum |
|---|---|---|---|
| E1 | Steuerung der Modul-Sichtbarkeit | Registry im Code (`routes`), fest verdrahtet | Ein einziges Modul rechtfertigt keine Konfigurationsschicht. Das Format lässt einen späteren Override zu. |
| E2 | Was zählt die Zahl? | Verbindungen (Tabs), wie heute | Mehrere Menschen können sich einen Account teilen. |
| E3 | Geblockt-Symbol | nur „von mir geblockt“ (`isBlocked`) | `blocked` würde verraten, wer mich geblockt hat. |
| E4 | Avatare am Gruppen-Button | vorerst nicht | nicht Teil des ersten Schritts |
| – | Wo erscheint das Dock? | auf allen Seiten, das Video-Modul nur auf `/` | Das Dock soll überall nutzbar sein, die Module werden pro Seite gesteuert. |
| – | Elevation (`read.any_*`) | wird ignoriert | Elevation greift nur in Gruppen, nicht im Dock. |
| – | Geblockte Teilnehmer | sichtbar, mit Symbol markiert | Man soll selbst entscheiden können, ob man beitritt. |
| – | Mobil | Fähnchen am Rand und Schublade | sichtbar, aber nicht störend, und kollidiert nicht mit Chat oder Video |

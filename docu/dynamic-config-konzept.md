# Dynamic Configuration — Konzept

Stand: 2026-05-27
Status: Diskussionspapier / Architekturentwurf

Dieses Dokument konkretisiert **Bucket B (Netzwerk-Policy)** aus dem [Branding- & Konfigurations-Architektur-Konzept](./branding-architecture-konzept.md). Es beschreibt, wie Policy-Konfiguration aus dem Backend zur Laufzeit ausgeliefert und vom Frontend reaktiv konsumiert wird — als Vorbereitung für ein späteres Monetarisierungs-/Lizenzierungs-System.

---

## 1. Zielsetzung & Abgrenzung

### Was dieses Dokument löst

- **Doppelpflege beseitigen**: Heute werden Flags wie `PUBLIC_REGISTRATION` an zwei Stellen definiert (`backend/src/config/index.ts:138-152` und `webapp/nuxt.config.js:36-50`).
- **Build-Time-Kopplung auflösen**: Heute erfordert jede Toggle-Änderung einen Webapp-Rebuild.
- **Hot-Reload ermöglichen**: Admin soll Einstellungen zur Laufzeit ändern können, ohne Restart.
- **Type-Safety**: Eine Schema-Wahrheit für Backend, Frontend und Admin-UI.

### Was dieses Dokument _nicht_ behandelt

- **Branding** (Bucket C) — eigene Asset-Pipeline mit Manifest-Paketen, siehe Branding-Konzept §2.
- **Feature-Toggles via Plugins** (Bucket D) — Aktivierungsmodell mit Plugin-Manifesten, siehe Branding-Konzept §3.
- **Infrastruktur-Config** (Bucket A) — `NEO4J_URI`, `JWT_SECRET` etc. bleiben in ENV.
- **Per-User-Subscription/Premium-Features** — orthogonal zu Netzwerk-Policy, kommt als eigener Track nach Lizenz-System.

---

## 2. Verhältnis zu den vier Buckets

Erinnerung aus dem Branding-Konzept:

| Bucket | Inhalt | Quelle | Reload |
|---|---|---|---|
| A. Infrastruktur | `NEO4J_URI`, `JWT_SECRET`, `SMTP_HOST` | ENV / Secrets | Restart |
| **B. Netzwerk-Policy** | **`PUBLIC_REGISTRATION`, `MAX_UPLOAD_SIZE`, `RATE_LIMITS`** | **DB + ENV-Seed** | **Hot** |
| C. Branding | Farben, Logos, Copy, Emails | ZIP + DB-Override | Hot |
| D. Feature-Toggles | Chat, Karte, News, … | Plugin-Manifeste | Plugin (de)aktivieren |

Dieses Dokument betrifft ausschließlich **Bucket B**. Die anderen Buckets folgen denselben Prinzipien (Schema-First, GraphQL, Audit), haben aber eigene Persistenz-Layer und Lebenszyklen.

---

## 3. Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│  backend/src/policy/                                            │
│  ├── policy.schema.json     ← canonical schema                  │
│  ├── types.ts               ← hand-written, mirrors the schema  │
│  ├── schema.ts              ← accessors (defaults, x-envSeed,   │
│  │                            x-visibility) read JSON at runtime│
│  ├── repository.ts          ← Neo4j read/write                  │
│  └── PolicyService.ts       ← in-memory + DB resolver           │
│                                                                 │
│  (Codegen-Pipeline kann ergänzt werden, sobald das Schema       │
│  wächst oder ein zweiter Consumer dazukommt — z.B. Branding.    │
│  Für die aktuelle Größe sind Hand-Typen pragmatischer.)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: PolicyService                                         │
│                                                                 │
│  resolve(key, ctx) → Wert (mit Präzedenz):                      │
│    1. (Phase 3) License-Token-Override                          │
│    2. DB-Wert    (Settings-Node in Neo4j)                       │
│    3. ENV-Wert   (Seed-Fallback)                                │
│    4. Schema-Default                                            │
│                                                                 │
│  set(namespace, key, value, actor) →                            │
│    → Ajv-Validate                                               │
│    → (Phase 3) License-Constraint-Check                         │
│    → Persist in Neo4j                                           │
│    → Audit-Log-Eintrag                                          │
│    → Pub/Sub-Event 'policy.changed' via Redis                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GraphQL-API (über bestehende Apollo-Pipeline)                  │
│                                                                 │
│  Query.publicPolicy       (anon, gefiltert nach x-visibility)   │
│  Query.adminPolicy        (auth=admin, alle Keys)               │
│  Mutation.setPolicy       (auth=admin)                          │
│  Subscription.policyChanged  (existierende Redis-Pipeline)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Webapp (Nuxt 2 + Apollo)                                       │
│                                                                 │
│  • Nuxt-Plugin: publicPolicy-Query in nuxtServerInit            │
│  • Vuex-Store: store/policy.js hält Snapshot                    │
│  • Subscription-Client: invalidiert bei policyChanged           │
│  • Helper: $policy.get('publicRegistration')                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Schema-First mit JSON-Schema

Das Schema ist die einzige Wahrheit. Daraus wird alles Andere generiert.

### Schema-Beispiel

`backend/src/policy/policy.schema.json`:

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ocelot.social/schemas/policy.json",
  "title": "NetworkPolicy",
  "type": "object",
  "properties": {
    "publicRegistration": {
      "type": "boolean",
      "default": true,
      "x-visibility": "public",
      "x-envSeed": "PUBLIC_REGISTRATION",
      "description": "Ob neue Nutzer sich ohne Einladung registrieren können."
    },
    "inviteRegistration": {
      "type": "boolean",
      "default": false,
      "x-visibility": "public",
      "x-envSeed": "INVITE_REGISTRATION",
      "description": "Ob Registrierung via Einladungs-Code möglich ist."
    },
    "categoriesActive": {
      "type": "boolean",
      "default": false,
      "x-visibility": "public",
      "x-envSeed": "CATEGORIES_ACTIVE",
      "description": "Ob das Kategorien-Feature im Frontend angezeigt wird."
    },
    "apiKeysEnabled": {
      "type": "boolean",
      "default": false,
      "x-visibility": "admin",
      "x-envSeed": "API_KEYS_ENABLED",
      "description": "Ob API-Keys-Verwaltung im Admin-Panel sichtbar ist."
    },
    "maxUploadSizeMb": {
      "type": "integer",
      "minimum": 1,
      "maximum": 500,
      "default": 10,
      "x-visibility": "public",
      "x-licenseRequired": ["pro", "enterprise"],
      "description": "Maximale Upload-Größe pro Datei in MB."
    }
  },
  "required": ["publicRegistration"]
}
```

### Custom Schema-Annotationen

| Annotation | Bedeutung |
|---|---|
| `x-visibility` | `"public"` → über `publicPolicy`-Query exponiert. `"admin"` → nur über `adminPolicy`. |
| `x-envSeed` | Name der ENV-Variable, die als Seed dient, wenn DB-Wert fehlt. |
| `x-licenseRequired` | Phase 3: Tier-Liste, die das Setzen erlaubt. Lower bound: `default` ist immer zulässig. |

### Was wird (heute) generiert / gepflegt

| Artefakt | Quelle | Status |
|---|---|---|
| `types.ts` (TS-Interfaces im Backend) | hand-geschrieben | aktiv, sync mit Schema |
| GraphQL-Typen (`Policy.gql`) | hand-geschrieben | aktiv, sync mit Schema |
| Ajv-Validator | — | später (mit `setPolicy`-Mutation in B6/B8) |
| Form-Schema für Admin-UI | direkt das JSON-Schema | später (B6) |

**Warum nicht jetzt schon Codegen?** Bei 4 Keys ist Drift visuell erkennbar und Hand-Pflege trivial. Sobald >10 Keys oder komplexe Strukturen (Branding, Feature-Toggles) dazukommen, lohnt sich `json-schema-to-typescript` + ein Build-Step.

---

## 5. Backend: PolicyService

### TypeScript-Interface

```typescript
// backend/src/policy/PolicyService.ts

import type { NetworkPolicy } from './policy.types'

export interface PolicyContext {
  actor?: { id: string; role: 'admin' | 'moderator' | 'user' }
  // Phase 3:
  // license?: LicenseToken
}

export interface PolicyService {
  /** Resolve a single key, applying full precedence chain. */
  get<K extends keyof NetworkPolicy>(key: K, ctx?: PolicyContext): Promise<NetworkPolicy[K]>

  /** Resolve all keys at once (cached). */
  getAll(ctx?: PolicyContext): Promise<NetworkPolicy>

  /** Filtered snapshot for a given visibility level. */
  getSnapshot(visibility: 'public' | 'admin'): Promise<Partial<NetworkPolicy>>

  /** Persist a new value. Validates against schema and (Phase 3) license constraints. */
  set<K extends keyof NetworkPolicy>(
    key: K,
    value: NetworkPolicy[K],
    actor: { id: string; role: string },
  ): Promise<void>

  /** Reset to ENV/schema default. */
  reset<K extends keyof NetworkPolicy>(key: K, actor: { id: string; role: string }): Promise<void>
}
```

### Resolution-Order (Phase 1-2)

```typescript
async function resolve(key: string): Promise<unknown> {
  // 1. DB-Override (live setting)
  const dbValue = await readFromNeo4j(key)
  if (dbValue !== undefined) return dbValue

  // 2. ENV-Seed
  const envKey = schema.properties[key]['x-envSeed']
  if (envKey && process.env[envKey] !== undefined) {
    return coerce(process.env[envKey], schema.properties[key].type)
  }

  // 3. Schema-Default
  return schema.properties[key].default
}
```

### Cache-Strategie

- **In-Memory-Cache** im Backend-Prozess (Map<key, value>)
- **Invalidation via Redis Pub/Sub** (Channel `policy.changed`)
- Andere Backend-Instanzen abonnieren den Channel und invalidieren ihren Cache
- Same Channel wird in Phase 6 für GraphQL-Subscription-Broadcast genutzt

---

## 6. DB-Modell (Neo4j)

Ein einziger Node-Typ für alle Live-Settings (über die vier Buckets hinweg — Branding wird denselben Layer nutzen, nur anderer Namespace):

```cypher
CREATE CONSTRAINT setting_namespace_key IF NOT EXISTS
FOR (s:Setting) REQUIRE (s.namespace, s.key) IS UNIQUE;
```

Beispiel-Insert:

```cypher
MERGE (s:Setting {namespace: 'policy', key: 'publicRegistration'})
SET s.value = $jsonValue,         // JSON-stringified value
    s.updatedAt = datetime(),
    s.updatedBy = $actorId
RETURN s
```

### Warum JSON-Stringified Value?

Neo4j 4.x unterstützt keine nativen Map-Properties. Für skalare Werte (Boolean, Integer, String) wäre Direktablage möglich, aber für komplexere Settings (z. B. `rateLimits: { window: 60, max: 100 }`) wird's umständlich. **Einheitlich JSON-stringified** vermeidet Spezialfälle und erlaubt jede Schema-Erweiterung ohne Migration.

### Audit-Log

Separates Node-Modell:

```cypher
CREATE (a:SettingAudit {
  namespace: 'policy',
  key: 'publicRegistration',
  oldValue: $oldJson,
  newValue: $newJson,
  actor: $actorId,
  timestamp: datetime()
})
```

Phase 1: nur INSERT, kein UI. Phase 5: Admin-UI zeigt Audit-Trail.

---

## 7. GraphQL-API

### Schema-Auszug

```graphql
# backend/src/graphql/types/policy.gql (generiert)

type PublicPolicy {
  publicRegistration: Boolean!
  inviteRegistration: Boolean!
  categoriesActive: Boolean!
  maxUploadSizeMb: Int!
}

type AdminPolicy {
  publicRegistration: Boolean!
  inviteRegistration: Boolean!
  categoriesActive: Boolean!
  maxUploadSizeMb: Int!
  apiKeysEnabled: Boolean!
}

type PolicyChangeEvent {
  key: String!
  value: JSON!
  actor: String!
  timestamp: DateTime!
}

extend type Query {
  publicPolicy: PublicPolicy!
  adminPolicy: AdminPolicy!  # @auth(role: ADMIN)
}

extend type Mutation {
  setPolicy(key: String!, value: JSON!): PolicyChangeEvent!  # @auth(role: ADMIN)
  resetPolicy(key: String!): PolicyChangeEvent!              # @auth(role: ADMIN)
}

extend type Subscription {
  policyChanged: PolicyChangeEvent!
}
```

### Resolver-Skizze

```typescript
// backend/src/graphql/resolvers/policy.ts

export const policyResolvers = {
  Query: {
    publicPolicy: async (_, __, ctx) =>
      ctx.policyService.getSnapshot('public'),
    adminPolicy: async (_, __, ctx) => {
      assertAdmin(ctx)
      return ctx.policyService.getSnapshot('admin')
    },
  },
  Mutation: {
    setPolicy: async (_, { key, value }, ctx) => {
      assertAdmin(ctx)
      await ctx.policyService.set(key, value, ctx.user)
      return { key, value, actor: ctx.user.id, timestamp: new Date() }
    },
  },
  Subscription: {
    policyChanged: {
      subscribe: (_, __, ctx) =>
        ctx.pubsub.asyncIterator(['policy.changed']),
    },
  },
}
```

---

## 8. Frontend-Integration (Nuxt 2 + Apollo)

### Boot via `nuxtServerInit`

```javascript
// webapp/store/index.js

export const actions = {
  async nuxtServerInit({ dispatch }, { app }) {
    await dispatch('policy/load', { apollo: app.apolloProvider.defaultClient })
  },
}
```

### Vuex-Modul

```javascript
// webapp/store/policy.js

import { gql } from 'graphql-tag'

const QUERY = gql`
  query publicPolicy {
    publicPolicy {
      publicRegistration
      inviteRegistration
      categoriesActive
      maxUploadSizeMb
    }
  }
`

export const state = () => ({ snapshot: null })

export const mutations = {
  SET(state, snapshot) { state.snapshot = snapshot },
}

export const actions = {
  async load({ commit }, { apollo }) {
    const { data } = await apollo.query({ query: QUERY })
    commit('SET', data.publicPolicy)
  },
  async subscribe({ commit, dispatch }, { apollo }) {
    apollo.subscribe({ query: SUBSCRIPTION }).subscribe({
      next: () => dispatch('load', { apollo }),
    })
  },
}

export const getters = {
  get: (state) => (key) => state.snapshot?.[key],
}
```

### Plugin für Template-Zugriff

```javascript
// webapp/plugins/policy.js

export default ({ store }, inject) => {
  inject('policy', {
    get: (key) => store.getters['policy/get'](key),
  })
}
```

### Verwendung in Komponenten

```vue
<template>
  <RegisterButton v-if="$policy.get('publicRegistration')" />
</template>
```

Ersetzt heute:

```javascript
// webapp/nuxt.config.js (heute)
env: { PUBLIC_REGISTRATION: process.env.PUBLIC_REGISTRATION }
```

### SSR-Hydration

Apollo SSR-Plugin liefert den Cache als `__APOLLO_STATE__` im initial HTML. Vuex-State wird via `nuxtServerInit` befüllt — beides läuft serverseitig, kein FOUC.

---

## 9. Migration: ENV als Seed, DB gewinnt

### Bootstrap-Logik

```typescript
// backend/src/policy/bootstrap.ts

export async function bootstrapPolicy(service: PolicyService) {
  for (const [key, def] of Object.entries(schema.properties)) {
    const existing = await readFromNeo4j(key)
    if (existing !== undefined) continue  // DB gewinnt

    const envKey = def['x-envSeed']
    if (envKey && process.env[envKey] !== undefined) {
      const seeded = coerce(process.env[envKey], def.type)
      await writeToNeo4j(key, seeded, { actor: 'system:seed' })
    }
    // Sonst: Schema-Default reicht — kein DB-Eintrag nötig
  }
}
```

### Konsequenz für existierende Forks

- **Keine Breaking Change**: ENV-Variablen bleiben funktional als Seed.
- **Kein Stichtag**: Forks können die ENV-Pflege so lange behalten, wie sie wollen.
- **Sobald Admin im UI ändert**: DB-Wert gewinnt, ENV wird irrelevant für diesen Key.
- **Reset-Funktion**: löscht DB-Wert → ENV wird wieder Seed.

UI-Hinweis im Admin (Phase 5):

> *publicRegistration = true* — Wert zuletzt geändert: nie (System-Default). [Reset auf ENV/Default]

bzw. nach Änderung:

> *publicRegistration = false* — Wert zuletzt geändert: 2026-05-27 von alice@example.com. [Reset auf ENV/Default]

---

## 10. Beispiel-Migration: `API_KEYS_ENABLED`

Konkret durchexerziert, weil dieser Flag heute existiert (`backend/src/config/index.ts`, `webapp/pages/admin.vue:67-69`).

### Heute

```typescript
// backend/src/config/index.ts (Auszug)
options: {
  API_KEYS_ENABLED: process.env.API_KEYS_ENABLED === 'true',
}
```

```javascript
// webapp/nuxt.config.js
env: { API_KEYS_ENABLED: process.env.API_KEYS_ENABLED }
```

```vue
<!-- webapp/pages/admin.vue:67-69 -->
<li v-if="$env.API_KEYS_ENABLED">
  <nuxt-link to="/admin/api-keys">...</nuxt-link>
</li>
```

### Nach Migration

Schema-Eintrag (siehe §4):

```jsonc
"apiKeysEnabled": {
  "type": "boolean",
  "default": false,
  "x-visibility": "admin",
  "x-envSeed": "API_KEYS_ENABLED"
}
```

Backend-Code unverändert — Resolver greift jetzt auf `policyService.get('apiKeysEnabled')` statt `config.options.API_KEYS_ENABLED`.

Webapp:

```vue
<li v-if="$policy.get('apiKeysEnabled')">
  <nuxt-link to="/admin/api-keys">...</nuxt-link>
</li>
```

`nuxt.config.js`-Eintrag entfernt. ENV-Var bleibt für Initial-Bootstrap funktional.

---

## 11. Monetarisierungs-Hooks

Drei explizite Andockpunkte. Alle additiv — keiner blockiert Phase 1-6.

### a) `x-licenseRequired` im Schema

Keys können Tier-Constraints tragen. `PolicyService.set()` prüft diese bei Phase 7.

```jsonc
"maxUploadSizeMb": {
  "type": "integer",
  "default": 10,
  "x-licenseRequired": {
    "tier": ["pro", "enterprise"],
    "maxValueByTier": { "free": 10, "pro": 100, "enterprise": 500 }
  }
}
```

### b) License-Token als zusätzliche Resolver-Quelle

```typescript
async function resolve(key: string): Promise<unknown> {
  // 0. NEU in Phase 7: License-Override
  const licenseValue = licenseToken?.overrides?.[key]
  if (licenseValue !== undefined) return licenseValue

  // 1-3. wie gehabt
}
```

Damit kann Lizenz **erzwingen**, dass ein bestimmter Wert gilt — auch wenn Admin in DB etwas anderes setzt. Beispiel: Free-Tier deckelt `maxUploadSizeMb` auf 10, egal was Admin einträgt.

### c) Subscription-Status pro User

Bleibt **außerhalb** dieses Konzepts. Per-User-Premium ist eine Query `me.entitlements`, nicht Policy. Wird separat designed.

---

## 12. Phasenplan

Mit Wert-pro-Phase und Vorbereitung-für-was.

| Phase | Inhalt | Wert allein | Vorbereitet für |
|---|---|---|---|
| **B1** | `policy.schema.json` + Codegen-Pipeline | Type-Safety, Drift-Beseitigung | Alles weitere |
| **B2** | `PolicyService` mit ENV-Seed + Schema-Default (ohne DB) | Backend liest dynamisch aus Schema | DB-Layer |
| **B3** | Neo4j `Setting`-Node + DB-Override | Hot-Reload Backend-seitig möglich | Admin-UI |
| **B4** | GraphQL `publicPolicy`-Query + Webapp-Plugin | Webapp liest runtime, kein Rebuild | SSR + Apollo-Stack steht |
| **B5** | Migration der existierenden Flags (`PUBLIC_REGISTRATION` etc.) | Doppelpflege weg | Realer Use-Case-Test |
| **B6** | `adminPolicy`-Query + `setPolicy`-Mutation + minimales Admin-UI | Selfhoster autonom | UI-Pattern für Branding-Bucket |
| **B7** | Redis-Pub/Sub-Integration + `policyChanged`-Subscription | Multi-Instance-Sync | Live-Update-Channel |
| **B8** | `x-licenseRequired` + License-Token-Resolver-Source | Monetarisierung scharf | — |

**B1-B5 sind in sich abgeschlossen und liefern Wert ohne Monetarisierung.** Das ist die natürliche erste PR-Reihe.

---

## 13. Test-Strategie

### Schema-Tests

- **Schema-Roundtrip**: Generierte TS-Typen + JSON-Schema-Validator akzeptieren dieselben Daten.
- **Schema-Backward-Compat**: Tests stellen sicher, dass neue Keys nicht alte brechen.

### PolicyService-Tests (Unit)

- Resolution-Order: DB > ENV > Default (in jeder Kombination)
- `set()` validiert gegen Schema (Reject ungültiger Werte)
- `set()` emittet Pub/Sub-Event
- `reset()` löscht DB-Eintrag

### GraphQL-Tests (Integration)

- `publicPolicy` enthält nur `x-visibility: "public"` Keys
- `adminPolicy` erfordert Admin-Role
- `setPolicy` erfordert Admin-Role
- `setPolicy` emittet `policyChanged`-Subscription

### Webapp-Tests

- `$policy.get('publicRegistration')` reaktiv auf Vuex-Update
- Subscription-Reconnect bei WS-Drop
- SSR liefert korrekten Initial-State (keine Hydration-Mismatch-Warnungen)

### Migration-Test

- Bestehende ENV-Variable wird beim Boot zu DB-Eintrag, wenn DB leer
- Bestehender DB-Eintrag wird beim Boot nicht überschrieben

---

## 14. Entscheidungen und offene Fragen

### a) Validierungs-Library: **Ajv** (entschieden)

Drei harte Gründe:

1. **Bereits vollständig im Stack** (transitiv über Toolchain). Backend nutzt Ajv 6, Webapp hat Ajv 6 und 8 inklusive `ajv-formats` (email/date/uri-Validatoren), `ajv-errors` (humanisierte Fehlermeldungen) und `ajv-keywords` (Custom-Keyword-Support). Zod wäre demgegenüber eine echte neue Top-Level-Dependency-Familie.
2. **`x-*`-Custom-Annotationen sind first-class.** JSON-Schema erlaubt sie offiziell, Ajv ignoriert sie bei Validation, Codegen-Scripts lesen sie. `x-visibility`, `x-envSeed`, `x-licenseRequired` haben damit einen sauberen Platz. In Zod müsste man `.describe()` zweckentfremden oder eine externe Meta-Map pflegen.
3. **Form-Renderer geschenkt.** `@rjsf/vue` (React JSON Schema Form, Vue-Port) konsumiert JSON-Schema direkt. Das Admin-UI in Phase B6 schreibt sich praktisch von selbst. Mit Zod wäre bei jedem Render-Pass eine `zodToJsonSchema()`-Konversion nötig.

**Aufzunehmende direkte Dependencies** (sonst hängen wir an transitiven Versionen):

```jsonc
// backend/package.json
"dependencies": {
  "ajv": "^8.x",            // moderne Version (Webapp hat sie schon)
  "ajv-formats": "^2.x",
  "ajv-errors": "^3.x"      // ajv-8-kompatibel
}

// Build-Time only:
"devDependencies": {
  "json-schema-to-typescript": "^15.x"
}
```

Trade-off-Verzicht: TS-DX im Backend ist mit `import type { NetworkPolicy }` minimal schlechter als mit `z.infer<>`. Für ~20-50 Policy-Keys vernachlässigbar.

### b) Codegen-Tooling — offen

- `json-schema-to-typescript` für TS-Typen — Standard, vermutlich gesetzt.
- Custom-Script für GraphQL-Typen (kein Standard-Tool deckt `x-visibility`-Filter ab) — selbst schreiben.
- `@rjsf/vue` oder eigener Renderer für Admin-Forms? — bei B6 entscheiden.

### c) SSR-Strategy: Inline vs Query

- **Inline**: Public-Policy im initial HTML als `<script>__POLICY__ = {...}</script>` → kein Apollo-Roundtrip beim Boot.
- **Apollo-Query**: konsistent mit restlichem Stack, aber 1 zusätzlicher Server-Roundtrip.

**Empfehlung:** Apollo-Query — SSR füllt Apollo-Cache, Client hydratisiert. Konsistent, kein Sonderfall.

### d) Wert-Typen jenseits primitiv

Erste Phase: nur Boolean, Integer, String, Enum. Komplexe Strukturen (Rate-Limits mit nested objects) ab Phase B3 — sobald DB-Layer steht.

### e) Audit-Log-Retention

Phase 5 entscheiden: Alle Änderungen für immer, oder Retention-Policy (z. B. 1 Jahr)?

---

## 15. Kernaussagen in einem Satz

- **Schema-First mit JSON-Schema + Ajv** löst Drift zwischen Backend, Webapp und Admin-UI auf einmal — Ajv ist transitiv ohnehin im Stack.
- **GraphQL durchgehend** nutzt die existierende Apollo-/Subscription-Pipeline und vermeidet REST-Sonderfälle.
- **ENV als Seed, DB gewinnt** macht Migration ohne Stichtag möglich.
- **`x-licenseRequired` und License-Token-Source** sind die einzigen späteren Eingriffe für Monetarisierung — Phase 1-7 brauchen nichts davon.

# Deriving `groupType` from the rights

**Status:** analysis, nothing implemented. Written while the group rights (`feat/group-permissions`)
were being enforced, as the next step that branch makes possible.

**Goal:** stop asking a group whether it is `public`, `closed` or `hidden`. The three names
become *presets of rights*, and the type — where it is still needed — is derived from what the
group actually granted.

## 1. What the type still decides, after the rights

The branch already moved five of its jobs into rights, mirrored onto the group node so a query
over many groups can read them (`groupRole/nonMemberAccess.ts`):

| Question | Right | Column |
| --- | --- | --- |
| May a stranger see the profile? | `group.read` on `none` | `nonMemberRead` |
| May a stranger read posts and comments? | `group.content.read` on `none` | `nonMemberContentRead` |
| May a stranger see the member list? | `group.members.read` on `none` | `showMembers` |
| May one enter without approval? | `group.join` on `none` | — |
| May one ask to enter? | `group.join.request` on `none` | — |

"Unlisted" needs no job of its own: a group nobody may read is not in the list and not in the
search results, because both now ask `nonMemberRead` rather than the type.

What the type still does:

1. **The per-type network rights.** Eleven catalog keys are families over the type:
   `group.create_<type>`, `videoCall.create_<door>`, `group.administer.any_<type>`,
   `group.content.read.any_<type>`, `group.moderate.any_<type>`. They encode a *privacy
   ordering* — a moderator may read into `closed` groups but not `hidden` ones — which the
   rights themselves do not have.
2. **Blanking the public fields.** `Group.name` and `Group.about` return `''` for a hidden
   group, so that an id leaking somewhere does not leak a name.
3. **Presets.** The form's picker, the seeded role templates per type, the admin list filter,
   and the i18n labels people recognise.
4. **A handful of readers that have not moved yet** — the notification middleware, the group
   chat gate in `rooms.ts`, the per-type mapping in `reports.ts`.

Only (1) is a real obstacle. The rest is mechanical.

## 2. The obstacle: the network layer needs an ordering

A group as a *set* of rights has no order, and the network layer needs one: "may create a
closed group", "may read into hidden groups" are statements about how private a group may get.
Three ways out.

### (A) The type becomes a derived column — recommended next step

Define one total, monotone function over the non-member rights:

```
level(group) = hidden  if not nonMemberRead
             = closed  if not nonMemberContentRead
             = public  otherwise
```

Then:

- `groupType` stays in the database and in the GraphQL schema, but is **derived** — written by
  the same repository function that already maintains the three columns, never chosen.
- Every per-type network right keeps working unchanged, because it keeps reading `groupType`.
- The form's picker becomes a **preset action**: "make this group closed" applies the closed
  template to `none` and `pending` — which is exactly what `applyGroupTypeToNonMemberRoles()`
  does today when the type changes.
- `group.type.change` becomes what it already is in substance: the right to edit the `none` and
  `pending` roles, capped by `group.create_<resulting level>` so that lowering the walls can
  never go past what the actor could have created.

Cost: the function, one more `SET` in the sync, and moving the cap from `canChangeGroupType`
into the rights-matrix mutations. No migration (the column exists), no API break, old clients
keep reading `groupType`.

The mapping is not injective — a group can grant members-read while hiding its content — so the
function must round **towards the more private level** for the creation cap, or an unusual
combination becomes a way past `group.create_hidden`.

### (B) Replace the type with a stored privacy level

A number instead of three names, rights derived from it. This is the status quo with better
spelling: the choice stays explicit, which is the thing we want to remove. Rejected.

### (C) Per-feature network rights instead of per-type

Drop the ordering and key the network rights on the *capability* rather than the type:
`group.create` plus `group.create.unlisted`; `group.content.read.any.closedContent` and
`group.content.read.any.unlisted`. A moderator's reach is then stated in the same vocabulary the
group uses, and `groupType` disappears completely.

Conceptually the cleanest, and the actual end state. It renames eleven catalog keys, needs a
migration of every stored role, and touches the admin roles UI and eleven locales — a breaking
change to the permission catalog, which is why it belongs after (A) and not instead of it.

## 3. If (A) were done, the remaining work

1. `groupPrivacyLevel()` as a pure function, drift-guarded: each seeded template must map to its
   own name (a property the spec can state directly).
2. `syncNonMemberAccess()` writes `groupType` alongside the three flags.
3. `CreateGroup` computes the level from the rights the new group starts with and checks
   `group.create_<level>`; `UpdateGroup(groupType:)` becomes a preset mutation, deprecated in
   favour of editing the rights.
4. The rights matrix shows the resulting level ("this group is currently: closed") and refuses
   an edit to `none` that would exceed the actor's creation cap. This is the one piece of
   genuinely new logic.
5. The stragglers from §1.4 read the columns or the derived level instead of the type, and the
   hidden-field blanking keys on `nonMemberRead`.

## 4. Open questions

- Does `hidden` mean anything beyond "no non-member may read it"? Sitemaps, OpenGraph previews
  and e-mail digests are worth checking before the type stops being a thing one can switch on.
- A combination with no preset (profile visible, content visible, members hidden) is expressible
  today and will become common once the matrix is the entry point. The level function has to
  name it, the UI has to label it, and the per-type caps have to round conservatively.
- `group.create_<type>` is checked at creation. With presets, a group could be created as public
  and immediately be made hidden by its owner — the cap in step 4 is what closes that, and it
  only works if editing the `none` role is gated by the creation right rather than by
  `group.role.manage` alone.

---

## 5. Outcome

**(A) was taken, and then went one step further than (A) proposed.** What shipped
on `feat/group-permissions`:

- The field is **not stored at all.** (A) kept `groupType` as a derived *column*,
  written by the sync. It is now computed on read — `privacyLevelFrom()` in
  TypeScript and the `visibilityOf()` `CASE` in Cypher
  (`helpers/groupAccessCypher.ts`), from the same two mirrored columns
  (`nonMemberRead`, `nonMemberContentRead`). A stored copy of a derived value is
  a second source of truth that can drift, and the sync that would keep it in
  step already writes the columns it would be derived from.
- The field is **renamed**: `Group.groupType` → `Group.visibility`, because the
  two things this paper separated got separate names. What *is* stored is
  `Group.template` (`GroupRoleTemplate.groupType` → `.name`) — the role preset a
  group was created from. That one is genuinely not derivable: it answers "which
  template is this group still running", which is what E12's "apply to untouched
  groups" needs.
- `UpdateGroup(groupType:)` did not become a deprecated preset mutation, it
  became `UpdateGroup(visibility:)` — a preset that writes the `none`/`pending`
  roles, capped by `group.create_<visibility>` (E10) on both paths. The separate
  `group.type.change` key was dropped: changing the visibility *is* editing those
  roles, and `group.role.manage` already covers it.
- The per-type network rights kept their names (`group.content.read.any_hidden`, …):
  their suffix always named a privacy level, which is exactly what `visibility`
  is. No compatibility layer was kept anywhere else — there are no foreign
  clients, so the old names are simply gone.

The open questions from §4, answered:

- **Does `hidden` mean more than "no non-member may read it"?** No new meaning was
  found. The hidden-field blanking keys on the rights, not on the label.
- **A combination with no preset.** It is expressible and the level function
  rounds towards the more private answer (`PRIVACY_LEVELS` order), so such a
  group reports the stricter of the two. The video-call door (`callDoor.ts`) is
  the second derived value built on the same principle.
- **Create public, then switch to hidden.** Closed, as step 4 required, in both
  places that can do it: `canChangeGroupType` in the shield and
  `requirePrivacyCap` in the rights matrix.

<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">{{ $t('group.editGroupSettings.title') }}</h1>
      <h2 class="ds-heading ds-heading-h2">
        {{ $t('group.editGroupSettings.groupTitle') }}
        <nuxt-link :to="{ name: 'groups-id-slug', params: { slug: group.slug, id: group.id } }">
          {{ group.name }}
        </nuxt-link>
      </h2>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-small group-edit-layout">
      <div class="group-edit-layout__sidebar">
        <os-menu :routes="routes" :is-exact="() => true" link-tag="router-link" />
      </div>
      <div class="group-edit-layout__main">
        <!-- Acting here on a network right rather than on a membership is a decision, and this
             is where it is made and shown (components/Group/GroupElevation.vue). -->
        <group-elevation :group="group" @changed="$nuxt.refresh()" />
        <transition name="slide-up" appear>
          <nuxt-child :group="group" @update-invite-codes="updateInviteCodes" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsMenu } from '@ocelot-social/ui'
import GroupElevation from '~/components/Group/GroupElevation'
import { groupEditQuery } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

// Which right each tab of the group settings needs, and in which order they read.
//
// The tabs are routes rather than components here, so this shell is the one place that can know
// it — and it has to, because the rights are granted independently: the group content menu
// offers "invite links" to anybody holding `group.invite`, which in a public group is every
// member by default. Gating the whole area on `group.settings.manage` (as it did) sent exactly
// those people into a 403 from a link the app had just shown them.
const TABS = [
  { path: '', label: 'group.general', permissions: ['group.settings.manage'] },
  {
    path: '/members',
    label: 'group.members',
    // Either: the tab is the member list plus the actions on it, and a group may hand out
    // changing roles without removing.
    permissions: ['group.member.remove', 'group.member.role.assign'],
  },
  { path: '/invites', label: 'group.invite-links', permissions: ['group.invite'] },
  { path: '/rights', label: 'group.rights.title', permissions: ['group.role.manage'] },
]

const holdsAnyOf = (group, permissions) => {
  const held = group?.myGroupPermissions ?? []
  return permissions.some((permission) => held.includes(permission))
}

/** The tab a path asks for — the longest matching suffix, so `/invites` wins over ``. */
const tabForPath = (path, groupId) => {
  const base = `/groups/edit/${groupId}`
  const suffix = path.startsWith(base) ? path.slice(base.length).replace(/\/$/, '') : path
  return TABS.find((tab) => tab.path === suffix)
}

export default {
  middleware: ['groupsEnabled'],
  components: {
    OsMenu,
    GroupElevation,
  },
  data() {
    return {
      group: {},
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    // Only the tabs this viewer may actually open. A member who may invite sees the invite
    // links and nothing else.
    routes() {
      return TABS.filter((tab) => holdsAnyOf(this.group, tab.permissions)).map((tab) => ({
        name: this.$t(tab.label),
        path: `/groups/edit/${this.group.id}${tab.path}`,
      }))
    },
  },
  async asyncData(context) {
    const {
      app,
      error,
      params: { id },
      route,
    } = context
    const client = app.apolloProvider.defaultClient
    const {
      data: {
        Group: [group],
      },
    } = await client.query({
      query: groupEditQuery(),
      variables: { id },
      // The server, not the cache. This page is reached again by `$nuxt.refresh()` after an
      // elevation is picked up or put down, and the whole point of that refresh is that the
      // rights have CHANGED — a cached answer re-ran the access check below against the state
      // the viewer was in before, so ending administrator access left the page exactly as it
      // was until a browser reload.
      fetchPolicy: 'network-only',
    })
    // The right of the TAB that was asked for, not one right for the whole area: these are
    // granted independently, so a member who may only hand out invite links has to be able to
    // open that one tab — and must not be able to open the others.
    const tab = tabForPath(route?.path ?? '', id)
    // Somebody who COULD pick their network rights up here is let in to do exactly that: the
    // page then shows the elevation card and no tabs. Refusing them would be the chicken and
    // the egg — the rights that open these tabs are the ones they have not picked up yet.
    const mayElevate = group?.mayElevateInGroup === true
    const allowed =
      mayElevate ||
      (tab
        ? holdsAnyOf(group, tab.permissions)
        : TABS.some((candidate) => holdsAnyOf(group, candidate.permissions)))
    if (!allowed) {
      error({ statusCode: 403, message: 'NONONNNO' })
    }
    return { group }
  },
  methods: {
    updateInviteCodes(inviteCodes) {
      this.group.inviteCodes = inviteCodes
    },
  },
}
</script>

<style scoped>
.ds-heading {
  margin-top: 0;
}
</style>

<style>
.group-edit-layout__sidebar,
.group-edit-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media (--vp-tablet-up) {
  .group-edit-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .group-edit-layout__main {
    flex: 1 0 0;
  }
}
</style>

<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">
        {{ heading }}
      </h1>
      <h2 class="ds-heading ds-heading-h2 post-in-line">
        {{ $t('contribution.postIn') }}
        <dropdown placement="bottom-start" :offset="4">
          <template #default="{ toggleMenu }">
            <button
              type="button"
              class="post-in-trigger"
              data-test="post-in-trigger"
              :aria-label="$t('contribution.postIn')"
              @click.prevent="toggleMenu()"
            >
              <os-icon
                v-if="selectedGroup"
                class="post-in-trigger-icon"
                data-test="post-in-trigger-icon"
                :icon="icons.group"
              />
              <span class="post-in-link" data-test="post-in-link">{{ contextName }}</span>
              <span class="post-in-caret-icon" aria-hidden="true">▾</span>
            </button>
          </template>
          <template #popover="{ closeMenu }">
            <ul class="post-in-menu" role="menu">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="post-in-menu-item"
                  :class="{ 'is-selected': !draft.groupId }"
                  data-test="post-in-option-personal"
                  @click="selectContext(null, closeMenu)"
                >
                  {{ $t('contribution.postInPersonalProfile') }}
                </button>
              </li>
              <li v-for="g in myGroups" :key="g.id" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="post-in-menu-item"
                  :class="{ 'is-selected': draft.groupId === g.id }"
                  :data-test="`post-in-option-${g.id}`"
                  @click="selectContext(g.id, closeMenu)"
                >
                  <os-icon class="post-in-menu-item-icon" :icon="icons.group" />
                  {{ g.name }}
                </button>
              </li>
            </ul>
          </template>
        </dropdown>
      </h2>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-small post-create-layout">
      <div class="post-create-layout__sidebar">
        <os-menu :routes="routes" link-tag="router-link">
          <os-menu-item
            @click.prevent="switchPostType($event, item)"
            slot="menuitem"
            slot-scope="item"
            :route="item.route"
          >
            {{ item.route.name }}
          </os-menu-item>
        </os-menu>
      </div>
      <div class="post-create-layout__main">
        <transition name="slide-up" appear>
          <contribution-form
            :group="selectedGroup"
            :createEvent="createEvent"
            :externalFormData="draft"
          />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { mapGetters } from 'vuex'
import { iconRegistry } from '~/utils/iconRegistry'
import { myGroupsForPostCreation } from '~/graphql/groups'
import ContributionForm from '~/components/ContributionForm/ContributionForm'
import Dropdown from '~/components/Dropdown'

const buildEmptyDraft = () => ({
  title: '',
  content: '',
  image: null,
  imageAspectRatio: null,
  imageType: null,
  imageBlurred: false,
  categoryIds: [],
  eventStart: null,
  eventEnd: null,
  eventLocation: '',
  eventLocationName: '',
  eventVenue: '',
  eventIsOnline: false,
  groupId: null,
})

// Module-level draft cache. Nuxt remounts this page when the :type param
// changes, which would normally wipe the draft. Hoisting it to module scope
// lets the same object survive the remount. It is reset in beforeRouteLeave
// when the user navigates out of /post/create/*.
let sharedDraft = null

const acquireDraft = () => {
  if (!sharedDraft) sharedDraft = buildEmptyDraft()
  return sharedDraft
}

export const __resetSharedDraftForTests = () => {
  sharedDraft = null
}

export default {
  components: {
    ContributionForm,
    Dropdown,
    OsIcon,
    OsMenu,
    OsMenuItem,
  },
  data() {
    const draft = acquireDraft()
    // First-time arrival via /post/create/:type?groupId=x — seed the draft.
    // A non-null draft.groupId (from a prior remount) wins to avoid clobbering
    // a user choice with a stale URL parameter.
    if (!draft.groupId && this.$route.query.groupId) {
      draft.groupId = this.$route.query.groupId
    }
    return {
      type: this.$route.params.type,
      draft,
      myGroups: [],
    }
  },
  async asyncData({ route, redirect }) {
    const {
      params: { type },
      query: { groupId },
    } = route
    if (!['article', 'event'].includes(type)) {
      const defaultType = 'article'
      let path = `/post/create/${defaultType}`
      if (groupId) path += `?groupId=${groupId}`
      redirect(path)
    }
  },
  beforeRouteLeave(to, _from, next) {
    if (!to.path || !to.path.startsWith('/post/create/')) {
      sharedDraft = null
    }
    next()
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    selectedGroup() {
      if (!this.draft.groupId) return null
      return this.myGroups.find((g) => g.id === this.draft.groupId) || null
    },
    contextName() {
      if (this.selectedGroup) return this.selectedGroup.name
      return (this.currentUser && this.currentUser.name) || this.$t('contribution.postInPersonalProfile')
    },
    heading() {
      return !this.createEvent
        ? this.$t('post.createNewArticle.title')
        : this.$t('post.createNewEvent.title')
    },
    routes() {
      // Include the current groupId in the target path so router-link's
      // exact-active match (which compares path + query) keeps the sidebar
      // item highlighted when the URL carries ?groupId=…
      const query = this.draft.groupId ? `?groupId=${this.draft.groupId}` : ''
      return [
        {
          name: this.$t('post.name'),
          path: `/post/create/article${query}`,
          type: 'article',
        },
        {
          name: this.$t('post.event'),
          path: `/post/create/event${query}`,
          type: 'event',
        },
      ]
    },
    createEvent() {
      return this.type === 'event'
    },
  },
  apollo: {
    myGroups: {
      query() {
        return myGroupsForPostCreation()
      },
      update({ Group }) {
        return Group || []
      },
      error(error) {
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
  methods: {
    selectContext(groupId, closeMenu) {
      this.draft.groupId = groupId
      this.syncUrlQuery()
      if (typeof closeMenu === 'function') closeMenu()
    },
    syncUrlQuery() {
      const query = this.draft.groupId ? { groupId: this.draft.groupId } : {}
      if ((this.$route.query.groupId || null) === (this.draft.groupId || null)) return
      this.$router.replace({ path: this.$route.path, query })
    },
    switchPostType(_event, route) {
      const { type: oldType } = this.$route.params
      const newType = route.route.type.toLowerCase()
      if (newType === oldType) return
      this.type = newType
      const query = this.draft.groupId ? { groupId: this.draft.groupId } : {}
      this.$router.replace({ path: `/post/create/${this.type}`, query })
    },
  },
}
</script>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}

.post-in-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: $space-x-small;
}

.post-in-trigger {
  appearance: none;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  color: $color-primary;
  display: inline-flex;
  // Text (.post-in-link) aligns on the text baseline with the surrounding
  // "Veröffentlichen in" prefix; icons use align-self: center so they are
  // vertically centered next to the text instead of floating above it.
  align-items: baseline;
  gap: $space-xx-small;

  &:hover,
  &:focus {
    color: $color-primary-active;
  }
}

.post-in-trigger-icon,
.post-in-caret-icon {
  align-self: center;
}

.post-in-trigger-icon {
  flex-shrink: 0;
  font-size: 0.9em;
}

.post-in-link {
  color: inherit;
  text-decoration: none;
}

.post-in-caret-icon {
  display: inline-block;
  line-height: 1;
  font-size: 0.8em;
  transform: translateY(-1px);
  transition: color 0.15s ease;
}

.post-in-menu {
  list-style: none;
  padding: $space-xx-small 0;
  margin: 0;
  min-width: 200px;
}

.post-in-menu-item {
  display: flex;
  align-items: center;
  gap: $space-xx-small;
  width: 100%;
  padding: $space-xx-small $space-small;
  background: transparent;
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: $background-color-soft;
  }

  &.is-selected {
    color: $color-primary;
    font-weight: bold;
  }
}

.post-in-menu-item-icon {
  flex-shrink: 0;
  font-size: 0.9em;
}

.post-create-layout__sidebar,
.post-create-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .post-create-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .post-create-layout__main {
    flex: 1 0 0;
  }
}
</style>

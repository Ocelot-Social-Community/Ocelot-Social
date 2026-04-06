<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">
        {{ heading }}
      </h1>
      <h2 class="ds-heading ds-heading-h2 post-in-line">
        {{ $t('contribution.postIn') }}
        <span class="post-in-select-wrapper">
          <span class="post-in-trigger" aria-hidden="true">
            <os-icon
              v-if="selectedGroup"
              class="post-in-trigger-icon"
              data-test="post-in-trigger-icon"
              :icon="icons.group"
            />
            <span class="post-in-link" data-test="post-in-link">{{ contextName }}</span>
            <span class="post-in-caret-icon">▾</span>
          </span>
          <select
            ref="postInSelect"
            class="post-in-select-overlay"
            data-test="post-in-select"
            :value="draft.groupId || ''"
            :aria-label="$t('contribution.postIn')"
            @change="onSelectChange($event)"
          >
            <option value="">{{ $t('contribution.postInPersonalProfile') }}</option>
            <option v-for="g in myGroups" :key="g.id" :value="g.id">
              {{ $t('contribution.postInGroupOption', { name: g.name }) }}
            </option>
          </select>
        </span>
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

const buildEmptyDraft = () => ({
  title: '',
  content: '',
  image: null,
  imageAspectRatio: null,
  imageType: null,
  imageBlurred: false,
  imageUpload: null,
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
//
// SSR NOTE: this module lives inside the Node.js process that serves all
// requests. Caching across requests on the server would leak draft state
// between users — so on the server we always hand out a fresh draft.
// The client-side shared instance only gets populated the first time
// acquireDraft() runs in the browser.
let sharedDraft = null

const acquireDraft = () => {
  if (process.server) return buildEmptyDraft()
  if (!sharedDraft) sharedDraft = buildEmptyDraft()
  return sharedDraft
}

export const __resetSharedDraftForTests = () => {
  sharedDraft = null
}

export default {
  components: {
    ContributionForm,
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
      return (
        (this.currentUser && this.currentUser.name) || this.$t('contribution.postInPersonalProfile')
      )
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
  watch: {
    myGroups(groups) {
      // 1) Drop stale/unauthorized groupIds. ?groupId=… is accepted blindly
      //    in data() — if the server's list of groups the user is a member
      //    of doesn't include it, clear it so the submit can't smuggle a
      //    foreign group id to the backend. Only acts once the list is
      //    known (length > 0 OR a cached empty response has arrived).
      if (this.draft.groupId && !groups.some((g) => g.id === this.draft.groupId)) {
        this.draft.groupId = null
        this.syncUrlQuery()
      }
      // 2) Native <select> silently falls back to the first option when the
      //    initially bound value has no matching <option> — which happens
      //    for ?groupId=x until Apollo populates myGroups. Re-sync the DOM
      //    value once the options are available so draft.groupId and the
      //    select UI match and @change fires on every subsequent user pick.
      this.$nextTick(() => {
        const el = this.$refs.postInSelect
        if (!el) return
        const expected = this.draft.groupId || ''
        if (el.value !== expected) el.value = expected
      })
    },
  },
  methods: {
    selectContext(groupId) {
      this.draft.groupId = groupId
      this.syncUrlQuery()
    },
    onSelectChange(event) {
      this.selectContext(event.target.value || null)
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
  font: inherit;
  color: $color-primary;
  display: inline-flex;
  // Text (.post-in-link) aligns on the text baseline with the surrounding
  // "Veröffentlichen in" prefix; icons use align-self: center so they are
  // vertically centered next to the text instead of floating above it.
  align-items: baseline;
  gap: $space-xx-small;
  pointer-events: none;
  transition: color 0.15s ease;
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

.post-in-select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: baseline;
}

.post-in-select-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  appearance: none;
  border: 0;
  background: transparent;
  font: inherit;
  // Firefox needs a color so options inherit something readable when opened
  color: $text-color-base;
}

// Hover + keyboard focus both highlight the trigger via the wrapper.
// :focus-within (not `+ .post-in-trigger`) because the trigger sits before
// the select in DOM order — a sibling combinator would never match.
.post-in-select-wrapper:hover .post-in-trigger,
.post-in-select-wrapper:focus-within .post-in-trigger {
  color: $color-primary-active;
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

<template>
  <transition name="fade" appear>
    <div class="ds-flex ds-flex-gap-small post-detail-layout">
      <div class="post-detail-layout__sidebar">
        <os-menu :routes="routes" class="post-side-navigation" link-tag="router-link" />
      </div>
      <div class="post-detail-layout__main">
        <os-card
          v-if="post && ready"
          :lang="post.language"
          :class="{
            'post-page': true,
            'disabled-content': post.disabled,
            '--blur-image': blurred,
          }"
          :style="heroImageStyle"
        >
          <template #heroImage v-if="post.image">
            <responsive-image
              :image="post.image"
              sizes="(max-width: 1024px) 640px, 1024px"
              class="image"
            />
            <aside v-show="post.image && post.image.sensitive" class="blur-toggle">
              <img v-show="blurred" :src="post.image.url.w320" class="preview" />
              <os-button
                variant="primary"
                appearance="filled"
                circle
                :aria-label="
                  $t(blurred ? 'post.sensitiveContent.show' : 'post.sensitiveContent.hide')
                "
                @click="blurred = !blurred"
              >
                <template #icon>
                  <os-icon :icon="blurred ? icons.eye : icons.eyeSlash" />
                </template>
              </os-button>
            </aside>
          </template>
          <section class="menu" :class="{ 'menu--no-image': !post.image }">
            <user-avatar :user="post.author" wide :date-time="post.createdAt">
              <template #dateTime>
                <p class="ds-text" v-if="post.createdAt !== post.updatedAt">
                  ({{ $t('post.edited') }})
                </p>
              </template>
            </user-avatar>
            <div class="menu-meta">
              <!-- Same read-only counters as PostTeaser's footer (shout
                   count is already visible on the interactive shout button
                   below, so it's not repeated here). -->
              <a
                href="#comments"
                class="comments-jump-link"
                :aria-label="$t('contribution.amount-comments', { amount: commentsCount })"
              >
                <os-counter-icon
                  :icon="icons.comments"
                  :count="commentsCount"
                  v-tooltip="{
                    content: $t('contribution.amount-comments', { amount: commentsCount }),
                    placement: 'bottom-start',
                  }"
                />
              </a>
              <os-counter-icon
                :icon="icons.handPointer"
                :count="post.clickedCount"
                v-tooltip="{
                  content: $t('contribution.amount-clicks', { amount: post.clickedCount }),
                  placement: 'bottom-start',
                }"
              />
              <os-counter-icon
                :icon="icons.eye"
                :count="post.viewedTeaserCount"
                v-tooltip="{
                  content: $t('contribution.amount-views', { amount: post.viewedTeaserCount }),
                  placement: 'bottom-start',
                }"
              />
              <client-only>
                <content-menu
                  placement="bottom-end"
                  resource-type="contribution"
                  :resource="post"
                  :modalsData="menuModalsData"
                  :is-owner="isAuthor"
                  @pinPost="pinPost"
                  @unpinPost="unpinPost"
                  @pinGroupPost="pinGroupPost"
                  @unpinGroupPost="unpinGroupPost"
                  @pushPost="pushPost"
                  @unpushPost="unpushPost"
                  @toggleObservePost="toggleObservePost"
                />
              </client-only>
            </div>
            <!-- Same ribbon as PostTeaser (type only here — deliberately no
                 pinned state, that's only meaningful while browsing a list). -->
            <os-ribbon
              class="post-detail-ribbon"
              :class="post.image ? 'post-detail-ribbon-w-img' : ''"
              :text="ribbonText"
              :type="post.postType && post.postType[0]"
            />
          </section>
          <div class="ds-mb-small"></div>
          <p
            v-if="post.group && post.group.id && post.group.slug"
            class="post-kicker ds-text ds-text-soft ds-text-size-base"
          >
            {{ $t('post.viewPost.forGroup.title') }}
            <dropdown placement="top-start">
              <template #default="{ openMenu, closeMenu }">
                <user-avatar-helper
                  :link-to-profile="true"
                  :user-link="groupLink"
                  :show-popover="true"
                  @open-menu="openMenu(false)"
                  @close-menu="closeMenu(false)"
                >
                  {{ post.group.name }}
                </user-avatar-helper>
              </template>
              <template #popover="{ isOpen }">
                <group-avatar-popover
                  v-if="isOpen"
                  :group-id="post.group.id"
                  :group-link="groupLink"
                />
              </template>
            </dropdown>
          </p>
          <h1 class="ds-heading ds-heading-h1 title hyphenate-text">{{ post.title }}</h1>
          <!-- event data -->
          <div
            v-if="post && post.postType && post.postType[0] === 'Event'"
            class="ds-mb-small event-data"
          >
            <div class="event-data__info">
              <location-teaser
                class="event-info"
                :venue="post.eventVenue"
                :locationName="post.eventLocationName"
                :isOnline="post.eventIsOnline"
                :to="mapLinkTo"
              />
              <date-time-range
                class="event-info"
                :startDate="post.eventStart"
                :endDate="post.eventEnd"
              />
            </div>
            <event-location-map
              v-if="showEventMap"
              class="event-data__map"
              :location="eventMapLocation"
              :editable="false"
              :is-past-event="isPastEvent"
              :post-id="post.id"
            />
          </div>
          <div class="ds-mb-small"></div>
          <!-- content -->
          <content-viewer class="content hyphenate-text" :content="post.content" />
          <!-- categories -->
          <div v-if="categoriesActive && post.categories.length > 0" class="categories">
            <div class="ds-mb-large"></div>
            <div class="ds-my-xx-small"></div>
            <hc-category
              v-for="category in sortCategories(post.categories)"
              :key="category.id"
              :icon="category.icon"
              :name="$t(`contribution.category.name.${category.slug}`)"
              v-tooltip="{
                content: $t(`contribution.category.description.${category.slug}`),
                placement: 'bottom-start',
              }"
            />
          </div>
          <div class="ds-mb-small"></div>
          <!-- Tags -->
          <div v-if="post.tags && post.tags.length" class="tags">
            <div class="ds-my-xx-small"></div>
            <hc-hashtag v-for="tag in sortedTags" :key="tag.id" :id="tag.id" />
          </div>
          <div class="actions">
            <!-- Shout Button -->
            <os-action-button
              :disabled="isAuthor"
              :count="shoutedCount"
              :aria-label="$t('shoutButton.shouted', { count: shoutedCount })"
              :filled="shouted"
              :icon="icons.heartO"
              :loading="shoutLoading"
              @click="toggleShout"
            />
            <!-- Follow Button -->
            <os-action-button
              :count="post.observingUsersCount"
              :aria-label="$t('observeButton.observed', { count: post.observingUsersCount })"
              :filled="post.isObservedByMe"
              :icon="icons.bell"
              :loading="observeLoading"
              @click="toggleObservePost(post.id, !post.isObservedByMe)"
            />
          </div>
          <!-- comments -->
          <section id="comments" class="ds-section">
            <!-- comment list -->
            <comment-list
              :post="post"
              @toggleNewCommentForm="toggleNewCommentForm"
              @reply="reply"
            />
            <div class="ds-mb-large"></div>
            <!-- commenting form -->
            <comment-form
              v-if="
                showNewCommentForm &&
                !isBlocked &&
                (!this.post.group || commentingAllowedByGroupRole) &&
                canComment
              "
              ref="commentForm"
              :post="post"
              @createComment="createComment"
            />
            <!-- commenting disabled -->
            <div class="ds-placeholder" v-else>
              <hc-empty margin="xxx-small" icon="messages" :message="commentingDisabledMessage">
                <cta-unblock-author v-if="isBlocked" :author="post.author" />
                <cta-join-leave-group
                  v-else-if="group && !commentingAllowedByGroupRole"
                  :group="group"
                  @update="updateJoinLeave"
                />
              </hc-empty>
            </div>
          </section>
        </os-card>
      </div>
    </div>
  </transition>
</template>

<script>
import {
  OsButton,
  OsCard,
  OsCounterIcon,
  OsIcon,
  OsMenu,
  OsActionButton,
  OsRibbon,
} from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { isEventPast } from '~/utils/eventDate'
import ContentViewer from '~/components/Editor/ContentViewer'
import CommentForm from '~/components/CommentForm/CommentForm'
import CommentList from '~/components/CommentList/CommentList'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import CtaUnblockAuthor from '~/components/Empty/CallToAction/CtaUnblockAuthor.vue'
import CtaJoinLeaveGroup from '~/components/Empty/CallToAction/CtaJoinLeaveGroup.vue'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import Dropdown from '~/components/Dropdown'
import EventLocationMap from '~/components/Map/EventLocationMap'
import GroupAvatarPopover from '~/components/GroupAvatar/GroupAvatarPopover'
import HcCategory from '~/components/Category'
import HcEmpty from '~/components/Empty/Empty'
import HcHashtag from '~/components/Hashtag/Hashtag'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage.vue'
import { useShout } from '~/composables/useShout'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import UserAvatarHelper from '~/components/UserAvatar/UserAvatarHelper'
import {
  postMenuModalsData,
  deletePostMutation,
  sortTagsAlphabetically,
} from '~/components/utils/PostHelpers'
import PostQuery from '~/graphql/PostQuery'
import { groupQuery } from '~/graphql/groups'
import PostMutations from '~/graphql/PostMutations'
import { markAsReadMutation } from '~/graphql/User'
import links from '~/constants/links.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import postListActions from '~/mixins/postListActions'
import SortCategories from '~/mixins/sortCategoriesMixin.js'

export default {
  name: 'PostSlug',
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  components: {
    OsCard,
    OsButton,
    OsCounterIcon,
    OsIcon,
    OsMenu,
    CommentForm,
    CommentList,
    ContentMenu,
    ContentViewer,
    CtaUnblockAuthor,
    CtaJoinLeaveGroup,
    DateTimeRange,
    Dropdown,
    EventLocationMap,
    GroupAvatarPopover,
    HcCategory,
    HcEmpty,
    HcHashtag,
    LocationTeaser,
    OsActionButton,
    OsRibbon,
    ResponsiveImage,
    UserAvatar,
    UserAvatarHelper,
  },
  mixins: [GetCategories, postListActions, SortCategories],
  beforeCreate() {
    // Initialised before `created()` because Apollo `cache-and-network` can fire
    // update() synchronously during SmartQuery launch, which runs before our
    // `created()` hook. Accessing an uninitialised `_unreadCommentIds` would crash
    // inside `handleUnreadNotifications()`.
    this._autoMarkedForPostId = null
    this._unreadCommentObserver = null
    this._unreadCommentIds = new Set()
  },
  created() {
    this.icons = iconRegistry
    const { toggleShout } = useShout({ apollo: this.$apollo })
    this._toggleShout = toggleShout
  },
  head() {
    return {
      title: this.title,
    }
  },
  data() {
    return {
      links,
      post: null,
      ready: false,
      title: 'loading',
      showNewCommentForm: true,
      blurred: false,
      blocked: null,
      postAuthor: null,
      group: null,
      shoutedCount: 0,
      shouted: false,
      shoutLoading: false,
      observeLoading: false,
    }
  },
  mounted() {
    setTimeout(() => {
      // NOTE: quick fix for jumping flexbox implementation
      // will be fixed in a future update of the styleguide
      this.ready = true
    }, 50)
  },
  beforeDestroy() {
    this._unreadCommentObserver?.disconnect()
  },
  computed: {
    routes() {
      // $route.params are decoded — re-encode each segment so slugs with
      // reserved characters (e.g. "foo/bar") rebuild to a routable path.
      const encodedId = encodeURIComponent(this.$route.params.id)
      const encodedSlug = encodeURIComponent(this.$route.params.slug)
      const postPath = `/post/${encodedId}/${encodedSlug}`
      return [
        {
          // Reuses ribbonText (the same label shown on the ribbon) rather
          // than a second, separately-worded type lookup — the two must
          // never say something different for the same post.
          name: this.ribbonText,
          path: postPath,
          children: [
            {
              name: this.$t('common.comment', null, 2),
              path: `${postPath}#comments`,
            },
          ],
        },
      ]
    },
    // No pinned state here (unlike PostTeaser's ribbonText) — that's only
    // meaningful while browsing a list, not on the post itself.
    ribbonText() {
      // Also read by routes(), which the sidebar renders even before the
      // post has loaded — needs the same "post may still be null" guard
      // that computed used to have inline.
      if (this.post?.postType?.[0] === 'Event') return this.$t('post.event')
      return this.$t('post.article')
    },
    // Same derivation as CommentList's own heading counter — reading
    // post.commentsCount directly would miss comments added/removed on
    // this page, since createComment() only pushes into post.comments.
    commentsCount() {
      return (
        (this.post?.comments &&
          this.post.comments.filter((comment) => !comment.deleted && !comment.disabled).length) ||
        0
      )
    },
    // Shared by the "in group" kicker link and its popover trigger below.
    groupLink() {
      if (!this.post?.group?.id || !this.post.group.slug) return null
      return {
        name: 'groups-id-slug',
        params: { slug: this.post.group.slug, id: this.post.group.id },
      }
    },
    menuModalsData() {
      return postMenuModalsData(
        // "this.post" may not always be defined at the beginning …
        this.post ? this.$filters.truncate(this.post.title, 30) : '',
        this.deletePostCallback,
      )
    },
    isBlocked() {
      const { author } = this.post
      if (!author) return false
      return author.blocked
    },
    isAuthor() {
      const { author } = this.post
      if (!author) return false
      return this.$store.getters['auth/user'].id === author.id
    },
    sortedTags() {
      return sortTagsAlphabetically(this.post.tags)
    },
    heroImageStyle() {
      /*  Return false when image property is not present or is not a number
          so no unnecessary css variables are set.
        */

      if (!this.post.image || typeof this.post.image.aspectRatio !== 'number') return false
      /*  Return the aspect ratio as a css variable. Later to be used when calculating
          the height with respect to the width.
        */
      return {
        '--hero-image-aspect-ratio': 1.0 / this.post.image.aspectRatio,
      }
    },
    commentingAllowedByGroupRole() {
      return this.group && ['usual', 'admin', 'owner'].includes(this.group.myRole)
    },
    hasEventCoordinates() {
      return (
        !!this.post?.eventLocation &&
        typeof this.post.eventLocation.lat === 'number' &&
        typeof this.post.eventLocation.lng === 'number'
      )
    },
    // Same definition the main map itself uses (eventStart AND eventEnd both
    // past, with a same-day grace period) — deep-linking from a still-running
    // event must not tell the map to hide it.
    isPastEvent() {
      return isEventPast(this.post)
    },
    // Read-only map only makes sense for in-person events with a resolved pin.
    showEventMap() {
      return (
        this.post?.postType?.[0] === 'Event' && !this.post.eventIsOnline && this.hasEventCoordinates
      )
    },
    eventMapLocation() {
      return this.hasEventCoordinates
        ? { lat: this.post.eventLocation.lat, lng: this.post.eventLocation.lng }
        : null
    },
    // Lets the venue/address text (LocationTeaser's `to` prop) deep-link into
    // the main map, same coordinates the read-only pin uses.
    mapLinkTo() {
      if (!this.hasEventCoordinates) return null
      return {
        path: '/map',
        query: {
          lat: this.post.eventLocation.lat,
          lng: this.post.eventLocation.lng,
          eventId: this.post.id,
          ...(this.isPastEvent ? { showPastEvents: '1' } : {}),
        },
      }
    },
    // Network permission to comment at all (separate from group membership / blocking).
    canComment() {
      return this.$can('comment.create')
    },
    // Reason-specific placeholder text. Block and group cases keep the generic message
    // (each carries an actionable CTA); the permission case gets a dedicated message —
    // there is no CTA, since only an admin can grant the role.
    commentingDisabledMessage() {
      if (
        !this.isBlocked &&
        (!this.post.group || this.commentingAllowedByGroupRole) &&
        !this.canComment
      ) {
        return this.$t('post.comment.noPermission')
      }
      return this.$t('settings.blocked-users.explanation.commenting-disabled')
    },
  },
  methods: {
    async toggleShout() {
      const newShouted = !this.shouted
      const backup = { shoutedCount: this.shoutedCount, shouted: this.shouted }
      this.shouted = newShouted
      this.shoutedCount += newShouted ? 1 : -1
      this.shoutLoading = true
      const { success } = await this._toggleShout({
        id: this.post.id,
        type: 'Post',
        isCurrentlyShouted: !newShouted,
      })
      if (!success) {
        this.shoutedCount = backup.shoutedCount
        this.shouted = backup.shouted
      }
      this.shoutLoading = false
    },
    reply(message) {
      this.$refs.commentForm && this.$refs.commentForm.reply(message)
    },
    async deletePostCallback() {
      try {
        await this.$apollo.mutate(deletePostMutation(this.post.id))
        this.$toast.success(this.$t('delete.contribution.success'))
        this.$router.push('/') // Redirect to index (main) page
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    async createComment(comment) {
      this.post.comments.push(comment)
      this.post.isObservedByMe = comment.isPostObservedByMe
      this.post.observingUsersCount = comment.postObservingUsersCount
    },
    async toggleObservePost(postId, value) {
      this.observeLoading = true
      try {
        await this.$apollo.mutate({
          mutation: PostMutations().toggleObservePost,
          variables: { value, id: postId },
        })
        const message = this.$t(
          `post.menu.${value ? 'observedSuccessfully' : 'unobservedSuccessfully'}`,
        )
        this.$toast.success(message)
        await this.$apollo.queries.Post.refetch()
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.observeLoading = false
      }
    },
    toggleNewCommentForm(showNewCommentForm) {
      this.showNewCommentForm = showNewCommentForm
    },
    updateJoinLeave() {
      this.$apollo.queries.Group.refetch()
      this.$toast.success(this.$t('post.comment.joinGroup', { name: this.post.group.name }))
    },
    handleUnreadNotifications(post) {
      if (!post?.id) return
      // Lazy-init: Apollo `cache-and-network` can synchronously fire update() from
      // SmartQuery launch before any Vue lifecycle hook runs for this component.
      if (!this._unreadCommentIds) this._unreadCommentIds = new Set()

      // Post-level: mark once per post visit, only when unread data is actually present.
      // Guarding on the data (not just post.id) prevents an early cache-only update()
      // from locking the handler before the network response with real unread data arrives.
      if (post.unreadNotificationByCurrentUser && this._autoMarkedForPostId !== post.id) {
        this._autoMarkedForPostId = post.id
        this.markNotificationAsRead(post.id)
      }

      // Comments: merge new IDs across updates. Later responses (cache → network,
      // subscription, refetch) may surface comments the earlier response missed.
      const incomingIds = (post.unreadCommentNotificationsByCurrentUser || [])
        .map((n) => n.from?.id)
        .filter(Boolean)
      incomingIds.forEach((id) => this._unreadCommentIds.add(id))
      if (this._unreadCommentIds.size === 0) return

      // Always sweep on every update: the comment DOM may render on a later tick
      // than the unread data arrives (child-component cycles, cache → network etc.),
      // so we can't rely on `newIds` alone to trigger observation.
      this.$nextTick(() => this.setupUnreadCommentObserver())
    },
    setupUnreadCommentObserver() {
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

      if (!this._unreadCommentObserver) {
        this._unreadCommentObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              const commentId = entry.target.dataset.unreadCommentId
              if (!commentId || !this._unreadCommentIds.has(commentId)) continue
              this._unreadCommentIds.delete(commentId)
              this._unreadCommentObserver.unobserve(entry.target)
              this.markNotificationAsRead(commentId)
            }
          },
          { threshold: 0.5 },
        )
      }

      // Idempotent sweep: observe any element whose DOM has appeared since last call.
      // The dataset.unreadCommentId marker prevents double-observation.
      for (const id of this._unreadCommentIds) {
        const el = document.getElementById(`commentId-${id}`)
        if (el && !el.dataset.unreadCommentId) {
          el.dataset.unreadCommentId = id
          this._unreadCommentObserver.observe(el)
        }
      }
    },
    async markNotificationAsRead(resourceId) {
      try {
        await this.$apollo.mutate({
          mutation: markAsReadMutation(this.$i18n),
          variables: { id: resourceId },
        })
      } catch (error) {
        // Silent: auto-mark is best-effort. User can still navigate notifications manually.
      }
    },
  },
  apollo: {
    Post: {
      query() {
        return PostQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.$route.params.id,
        }
      },
      update({ Post }) {
        this.post = Post[0] || {}
        this.title = this.post.title
        const { image } = this.post
        this.postAuthor = this.post.author
        this.blurred = image && image.sensitive
        this.shouted = !!this.post.shoutedByCurrentUser
        this.shoutedCount = this.post.shoutedCount || 0
        this.handleUnreadNotifications(this.post)
      },
      fetchPolicy: 'cache-and-network',
    },
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.post && this.post.group ? this.post.group.id : null,
        }
      },
      update({ Group }) {
        this.group = Group[0]
      },
      skip() {
        return !(this.post && this.post.group)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style>
.post-kicker {
  margin: 0;

  /* Dropdown renders its trigger wrapped in a block-level ".v-popover" div
     (v-tooltip), which breaks the text flow onto its own line here — force
     it back inline so the group link sits right after the label text. */
  .v-popover {
    display: inline-block;
  }

  /* On touch devices UserAvatarHelper renders the trigger as a <button>
     instead of a <nuxt-link> (tap opens the popover instead of navigating
     straight away) — buttons don't pick up the global "a { color }" rule,
     so the group name loses its link color there unless set explicitly. */
  .trigger button {
    color: var(--color-primary);
  }
}

/* .ds-heading defaults to a large top margin meant for headings that open a
   section on their own — too much space here, whether or not the "in group"
   kicker line precedes it. */
.post-page .title.ds-heading {
  margin-top: 0.2em;
}

/* main.css's ".os-card > .title" sizes teaser-card titles (e.g. a post
   teaser in a feed) at --font-size-large and gives them a tight
   margin-bottom of --space-x-small. OsCard only nests this h1 one level
   deeper (inside .os-card__content) when the post has a hero image, so
   without one this h1 was also a *direct* child of .os-card and matched
   that rule — with 2 classes it out-specifies .ds-heading-h1's single
   class, silently shrinking the title and the gap below it whenever the
   post had no image (visible e.g. on events, which rarely carry a hero
   image, vs. articles, which usually do).
   Re-assert ds-heading-h1's own sizing/spacing here with higher
   specificity so it wins regardless of hero-image-driven nesting depth. */
.post-page .title.hyphenate-text {
  font-size: var(--font-size-xx-large);
  margin-bottom: 0.6em;
}
@media (--vp-desktop-up) {
  .post-page .title.hyphenate-text {
    font-size: var(--font-size-xxx-large);
  }
}

.post-detail-layout__sidebar,
.post-detail-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media (--vp-tablet-up) {
  .post-detail-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .post-detail-layout__main {
    flex: 1 0 0;
  }
}
.post-side-navigation {
  position: sticky;
  top: 65px;
  z-index: 2;
}

.post-page {
  > .os-card__hero-image {
    position: relative;
    /*  The padding top makes sure the correct height is set (according to the
        hero image aspect ratio) before the hero image loads so
        the autoscroll works correctly when following a comment link.
      */

    padding-top: calc(var(--hero-image-aspect-ratio) * 100%);
    /*  Letting the image fill the container, since the container
        is the one determining height
      */
    > .image {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
  }

  .menu {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    row-gap: var(--space-x-small);
    justify-content: space-between;
    align-items: center;
    /* Positioned like PostTeaser's ribbon (same component/offsets) — its
       folded corner is hard-coded to the right in Ribbon/index.vue, so it
       stays right here too. Clearance from the "..." button/counters is
       handled vertically below (per image/no-image case) rather than by
       indenting the whole row horizontally, which looked cramped on
       narrow/mobile widths. */

    /* On narrow screens the avatar name/date plus the counters + "..."
       button don't fit on one line — wrap instead of letting the trailing
       group get pushed past the card edge. */
    > .user-avatar {
      min-width: 0;
    }

    .post-detail-ribbon {
      position: absolute;
      top: -16px;
      right: -29px;
    }

    .post-detail-ribbon-w-img {
      /* With a hero image the ribbon sits on the image's bottom-right
         corner, well above the menu row already. */
      top: -40px;
    }

    /* Without a hero image the ribbon (top: -16px above) has no image
       corner to sit on and can't move further up without poking out past
       the card's own top edge, so instead the row's content (avatar,
       "..." button) is pushed down to clear the ribbon — its anchor point
       (.menu's top border edge) stays put, only the flex content shifts. */
    &.menu--no-image {
      padding-top: var(--space-base);
    }

    .menu-meta {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      /* justify-content: space-between only distributes space *within* a
         wrapped line — with .menu-meta alone on the second line it would
         sit at the left. margin-left: auto claims all remaining space on
         that line instead, keeping it pinned to the right in both cases. */
      margin-left: auto;

      /* Same muted, non-interactive look as PostTeaser's footer counters. */
      .os-counter-icon {
        display: block;
        margin-right: var(--space-small);
        opacity: var(--opacity-disabled);
      }

      /* Comments icon doubles as a jump-to-comments link — keep it looking
         like the other, non-interactive counters instead of picking up the
         global link color. */
      .comments-jump-link {
        color: inherit;
      }
    }
  }

  &.--blur-image > .os-card__hero-image > .image {
    filter: blur(var(--blur-radius));
  }

  .blur-toggle {
    position: absolute;
    bottom: 0;
    right: 0;

    display: flex;
    align-items: center;

    height: 80px;
    padding: 12px;

    .preview {
      height: 100%;
      margin-right: 12px;
    }
  }

  .comments {
    margin-top: var(--space-small);

    .ProseMirror {
      min-height: 0px;
    }
  }
}
</style>

<style scoped>
.event-data {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.event-data__map {
  /* Extra breathing room below the map specifically — the surrounding
     ds-mb-small spacers are shared across the page and fine for the
     location/date text alone, but felt cramped after the map's large,
     hard-edged box. */
  margin-bottom: var(--space-small);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: right;
  gap: var(--space-small);
  margin-top: var(--space-small);
  margin-bottom: calc(var(--space-base) * 2);
}

.ds-heading {
  margin-top: 0;
}
</style>

<template>
  <div class="map-event-popover">
    <os-button
      v-if="!(resolvedPost && resolvedPost.image)"
      class="close-button close-button-no-img"
      variant="primary"
      appearance="outline"
      circle
      size="sm"
      :aria-label="$t('actions.close')"
      @click="$emit('close')"
    >
      <template #icon>
        <os-icon :icon="icons.close" />
      </template>
    </os-button>
    <div v-if="!showContent" class="loading-state">
      <os-spinner size="md" />
    </div>
    <nuxt-link
      v-else-if="showContent && resolvedPost"
      :to="{ name: 'post-id-slug', params: { id: resolvedPost.id, slug: resolvedPost.slug } }"
      class="event-link"
    >
      <div v-if="resolvedPost.image" class="image-wrapper-outer">
        <div class="image-wrapper">
          <responsive-image :image="resolvedPost.image" sizes="280px" class="image" />
        </div>
        <os-ribbon class="event-ribbon-w-img" :text="$t('post.event')" type="Event" />
        <!-- click.stop.prevent: this sits inside the card-wide nuxt-link,
             otherwise the click would also trigger navigation. -->
        <os-button
          class="close-button close-button-w-img"
          variant="primary"
          appearance="outline"
          circle
          size="sm"
          :aria-label="$t('actions.close')"
          @click.stop.prevent="$emit('close')"
        >
          <template #icon>
            <os-icon :icon="icons.close" />
          </template>
        </os-button>
      </div>
      <div class="content" :class="{ 'content--no-image': !resolvedPost.image }">
        <div class="post-user-row">
          <user-avatar :user="resolvedPost.author" size="small" :show-popover="false" />
          <os-ribbon
            v-if="!resolvedPost.image"
            class="event-ribbon"
            :text="$t('post.event')"
            type="Event"
          />
        </div>
        <h3 class="event-title hyphenate-text">{{ resolvedPost.title }}</h3>
        <location-teaser
          size="small"
          :venue="resolvedPost.eventVenue"
          :location-name="resolvedPost.eventLocationName"
          :is-online="resolvedPost.eventIsOnline"
        />
        <date-time-range
          class="event-datetime"
          size="small"
          :start-date="resolvedPost.eventStart"
          :end-date="resolvedPost.eventEnd"
        />
      </div>
    </nuxt-link>
    <div v-else-if="showContent" class="unavailable-state">
      <empty icon="alert" :message="$t('map.eventPopover.unavailable')" />
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsRibbon, OsSpinner } from '@ocelot-social/ui'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import Empty from '~/components/Empty/Empty'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { postTeaserQuery } from '~/graphql/PostQuery'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'MapEventPopover',
  components: {
    DateTimeRange,
    Empty,
    LocationTeaser,
    OsButton,
    OsIcon,
    OsRibbon,
    OsSpinner,
    ResponsiveImage,
    UserAvatar,
  },
  props: {
    postId: { type: String, default: null },
    // Already-loaded post (e.g. the map's own feature data), skipping the
    // query entirely — same optional-override shape GroupAvatarPopover uses
    // for its `group` prop.
    post: { type: Object, default: null },
  },
  data() {
    return {
      showContent: false,
      minSpinnerDone: false,
      querySettled: false,
      spinnerTimer: null,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    if (this.resolvedPost) {
      this.showContent = true
      return
    }
    // Same brief minimum-spinner-time pattern as GroupAvatarPopover — avoids
    // a flash of the spinner for queries that resolve near-instantly.
    this.spinnerTimer = setTimeout(() => {
      this.minSpinnerDone = true
      if (this.resolvedPost || this.querySettled) this.showContent = true
    }, 400)
  },
  beforeDestroy() {
    if (this.spinnerTimer) clearTimeout(this.spinnerTimer)
  },
  computed: {
    resolvedPost() {
      return this.post || (this.Post && this.Post[0]) || null
    },
  },
  watch: {
    resolvedPost(post) {
      if (post && this.minSpinnerDone) this.showContent = true
    },
  },
  methods: {
    onQuerySettled() {
      if (this.minSpinnerDone) {
        this.showContent = true
      } else {
        this.querySettled = true
      }
    },
  },
  apollo: {
    Post: {
      query() {
        return postTeaserQuery()
      },
      variables() {
        return { id: this.postId }
      },
      skip() {
        return !this.postId || !!this.post
      },
      result() {
        this.onQuerySettled()
      },
      error() {
        this.onQuerySettled()
      },
    },
  },
}
</script>

<style scoped>
.map-event-popover {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 280px;
  width: 280px;
  min-height: 120px;
}

/* Replaces the mapbox-gl popup's own close button (removed for every
   marker type, see pages/map.vue) with a standard small outline OsButton.
   Two variants, like the ribbon's own .event-ribbon-w-img/.event-ribbon
   split, since "top-right corner" means a different anchor depending on
   whether there's an image to sit on.
   !important: OsButton is a vue-demi/Composition-API component (its own
   render function manually re-merges the parent's class list — see its
   source — precisely because Vue 2's usual "scoped CSS reaches a child
   component's root element" mechanism does NOT apply to it). This scoped
   rule's compiled selector never actually matches the real DOM node, so
   OsButton's own baked-in Tailwind `relative` base class would otherwise
   win by default, leaving the button in normal flow instead of taken out
   of it — which top/right then shift as a relative offset, not an anchor. */
.close-button {
  position: absolute !important;
}

/* Sits on the image itself (anchored to .image-wrapper-outer) — within its
   bounds, so it never changes the image's own size/format. */
.close-button-w-img {
  top: 8px;
  right: 8px;
}

/* No image here (also covers the loading/unavailable states, which never
   have one) — anchored to the popover root instead, same corner offsets as
   the with-image variant. .content--no-image below adds the extra
   headroom this needs to clear the ribbon without moving it. */
.close-button-no-img {
  top: 8px;
  right: 8px;
}

.loading-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
  padding: 24px;
}

.event-link {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.image-wrapper-outer {
  position: relative;
}

/* Clips and rounds the image itself (top corners only, like PostTeaser's
   own .os-card__hero-image) — the popup shell (.mapboxgl-popup-content in
   pages/map.vue) is overflow: visible for this popover specifically, so the
   ribbon's folded-corner triangle below can poke out past this box instead
   of being clipped away with it.
   Unlike PostTeaser (which lets the image keep its own aspect ratio at
   640px wide), this popover has a hard height budget shared with the
   title/location/date below it — a tall portrait or square photo at 280px
   wide would otherwise eat that whole budget and push the actual event
   info out of view. Fixed height + object-fit: cover keeps the hero-image
   look without that risk. */
.image-wrapper {
  height: 140px;
  overflow: hidden;
  border-radius: var(--border-radius-x-large) var(--border-radius-x-large) 0 0;
}

.image-wrapper .image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 24px;
}

/* Extra headroom above the ribbon's own unchanged poke (top: -16px, see
   .event-ribbon below) so the close button — sitting at the same top: 8px
   corner as the with-image variant — has room above it without moving or
   resizing the ribbon itself. */
.content--no-image {
  padding-top: 56px;
}

.post-user-row {
  position: relative;
  display: flex;
  align-items: center;
  /* Own dedicated (smaller) gap to the title below, on top of .content's
     6px flex gap — deliberately less than PostTeaser's own --space-small
     here, this popover reads better with the title closer to the row. */
  margin-bottom: var(--space-x-small);
}

/* Anchored to the image itself (via .image-wrapper-outer) instead of
   guessing an offset from the content row below — bottom: 0 would sit
   flush with the image's own bottom edge regardless of the ribbon's actual
   rendered height. -14px is half of the ribbon's own height (2 × 6px
   padding + ~16px line box for the 0.7rem/600 text), so its text line —
   not just its lower edge — lands right on the image's bottom edge, with
   the folded-corner triangle hanging just past it into the content area.
   right: -6px matches PostTeaser's own ribbon, which likewise pokes a few
   pixels past its card's true right edge rather than sitting flush/inset. */
.event-ribbon-w-img {
  position: absolute;
  bottom: -14px;
  right: -6px;
}

/* No image to anchor to here, so this one still hangs off the content row
   like PostTeaser's own .post-ribbon (same 24px content padding). */
.event-ribbon {
  position: absolute;
  top: -16px;
  right: -29px;
}

.event-title {
  margin: 0;
  /* Own dedicated gap to the location-teaser below, on top of .content's
     6px flex gap — bigger than the row-to-title gap above, so the title
     reads as its own block rather than crowding into the location/date. */
  margin-bottom: var(--space-x-small);
  font-size: 1rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Pulls this a little closer to the location-teaser above than .content's
   6px flex gap alone gives it. */
.event-datetime {
  margin-top: calc(-1 * var(--space-xxx-small));
}

.unavailable-state {
  padding: 24px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

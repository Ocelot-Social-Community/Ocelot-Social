<template>
  <div class="map-event-popover">
    <div v-if="!showContent" class="loading-state">
      <os-spinner size="md" />
    </div>
    <nuxt-link
      v-else-if="showContent && resolvedPost"
      :to="{ name: 'post-id-slug', params: { id: resolvedPost.id, slug: resolvedPost.slug } }"
      class="event-link"
    >
      <div v-if="resolvedPost.image" class="image-wrapper">
        <responsive-image :image="resolvedPost.image" sizes="280px" class="image" />
      </div>
      <div class="content">
        <div class="post-user-row">
          <user-avatar :user="resolvedPost.author" size="small" :show-popover="false" />
          <os-ribbon
            :class="resolvedPost.image ? 'event-ribbon-w-img' : 'event-ribbon'"
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
import { OsRibbon, OsSpinner } from '@ocelot-social/ui'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import Empty from '~/components/Empty/Empty'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { postTeaserQuery } from '~/graphql/PostQuery'

export default {
  name: 'MapEventPopover',
  components: {
    DateTimeRange,
    Empty,
    LocationTeaser,
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
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 280px;
  width: 280px;
  min-height: 120px;
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

.post-user-row {
  position: relative;
  display: flex;
  align-items: center;
}

/* Same folded-corner ribbon placement and offsets as PostTeaser's own
   .post-ribbon-w-img / .post-ribbon — this popover now matches its 24px
   content padding exactly, so the same values apply unscaled. */
.event-ribbon-w-img {
  position: absolute;
  top: -36px;
  right: -29px;
}

.event-ribbon {
  position: absolute;
  top: -16px;
  right: -29px;
}

.event-title {
  margin: 0;
  font-size: 1rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.unavailable-state {
  padding: 24px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

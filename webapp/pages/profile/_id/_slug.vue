<template>
  <div>
    <div class="ds-mb-large"></div>
    <div v-if="user" class="ds-flex ds-flex-gap-base profile-layout">
      <div class="profile-layout__sidebar">
        <os-card
          :class="{ 'disabled-content': user.disabled }"
          style="position: relative; height: auto; overflow: visible"
        >
          <avatar-uploader v-if="myProfile" :profile="user" :updateMutation="updateUserMutation">
            <profile-avatar :profile="user" class="profile-page-avatar" size="large" />
          </avatar-uploader>
          <profile-avatar v-else :profile="user" class="profile-page-avatar" size="large" />
          <!-- Menu -->
          <client-only>
            <content-menu
              placement="bottom-end"
              resource-type="user"
              :resource="user"
              :is-owner="myProfile"
              class="user-content-menu"
              @mute="muteUser"
              @unmute="unmuteUser"
              @block="blockUser"
              @unblock="unblockUser"
              @delete="deleteUser"
            />
          </client-only>
          <div class="ds-my-small">
            <h3 class="ds-heading ds-heading-h3 ds-heading-align-center ds-heading-no-margin">
              {{ userName }}
            </h3>
            <p class="ds-text ds-text-center ds-text-soft">
              {{ `@${userSlug}` }}
            </p>
            <location-info
              v-if="user.location"
              :location-data="user.location"
              :is-owner="myProfile"
              size="small"
            />
            <p class="ds-text ds-text-center ds-text-soft ds-text-size-small">
              {{ $t('profile.memberSince') }} {{ user.createdAt | date('MMMM yyyy') }}
            </p>
          </div>
          <div v-if="userBadges && userBadges.length" class="ds-my-x-small">
            <a v-if="myProfile" href="/settings/badges" class="badge-edit-link">
              <hc-badges :badges="userBadges" />
            </a>
            <hc-badges v-if="!myProfile" :badges="userBadges" />
          </div>
          <div class="ds-flex">
            <div class="ds-flex-item">
              <client-only>
                <ds-number :label="$t('profile.followers')">
                  <hc-count-to
                    slot="count"
                    :start-val="followedByCountStartValue"
                    :end-val="user.followedByCount"
                  />
                </ds-number>
              </client-only>
            </div>
            <div class="ds-flex-item">
              <client-only>
                <ds-number :label="$t('profile.following')">
                  <hc-count-to slot="count" :end-val="user.followingCount" />
                </ds-number>
              </client-only>
            </div>
          </div>
          <div v-if="!myProfile" class="action-buttons">
            <os-button
              v-if="user.isBlocked"
              variant="primary"
              appearance="outline"
              full-width
              @click="unblockUser(user)"
            >
              {{ $t('settings.blocked-users.unblock') }}
            </os-button>
            <os-button
              v-if="user.isMuted"
              variant="primary"
              appearance="outline"
              full-width
              @click="unmuteUser(user)"
            >
              {{ $t('settings.muted-users.unmute') }}
            </os-button>
            <hc-follow-button
              v-if="!user.isMuted && !user.isBlocked"
              :follow-id="user.id"
              :is-followed="user.followedByCurrentUser"
              @optimistic="optimisticFollow"
              @update="updateFollow"
            />
            <os-button
              variant="primary"
              appearance="outline"
              full-width
              v-tooltip="{
                content: $t('chat.userProfileButton.tooltip', { name: userName }),
                placement: 'bottom-start',
              }"
              @click="showOrChangeChat(user.id)"
            >
              <template #icon><os-icon :icon="icons.chatBubble" /></template>
              {{ $t('chat.userProfileButton.label') }}
            </os-button>
          </div>
          <template v-if="user.about">
            <hr />
            <div class="ds-mt-small ds-mb-small">
              <p class="ds-text ds-text-center ds-text-soft ds-text-size-small hyphenate-text">
                {{ user.about }}
              </p>
            </div>
          </template>
        </os-card>
        <div class="ds-mb-large"></div>
        <h3
          class="ds-heading ds-heading-h3 ds-heading-soft"
          style="text-align: center; margin-bottom: 10px"
        >
          {{ $t('profile.network.title') }}
        </h3>
        <follow-list
          :loading="$apollo.loading"
          :user="user"
          type="followedBy"
          @fetchAllConnections="fetchAllConnections"
        />
        <div class="ds-mb-large"></div>
        <follow-list
          :loading="$apollo.loading"
          :user="user"
          type="following"
          @fetchAllConnections="fetchAllConnections"
        />
        <social-media :user-name="userName" :user="user" />
      </div>

      <div class="profile-layout__main">
        <masonry-grid>
          <!-- TapNavigation -->
          <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" />

          <!-- feed -->
          <ds-grid-item v-if="myProfile" :row-span="2" column-span="fullWidth">
            <div class="profile-post-add-button-container">
              <os-button
                as="nuxt-link"
                :to="{ name: 'post-create-type' }"
                v-tooltip="{
                  content: $t('contribution.newPost'),
                  placement: 'left',
                }"
                class="profile-post-add-button"
                variant="primary"
                appearance="filled"
                circle
                :aria-label="$t('contribution.newPost')"
              >
                <template #icon>
                  <os-icon :icon="icons.plus" />
                </template>
              </os-button>
            </div>
          </ds-grid-item>

          <template v-if="posts.length">
            <masonry-grid-item
              v-for="post in posts"
              :key="post.id"
              :imageAspectRatio="post.image && post.image.aspectRatio"
            >
              <post-teaser
                :post="post"
                :width="{ base: '100%', md: '100%', xl: '50%' }"
                @removePostFromList="posts = removePostFromList(post, posts)"
                @pinPost="pinPost(post, refetchPostList)"
                @unpinPost="unpinPost(post, refetchPostList)"
                @pinGroupPost="pinGroupPost(post, refetchPostList)"
                @unpinGroupPost="unpinGroupPost(post, refetchPostList)"
                @pushPost="pushPost(post, refetchPostList)"
                @unpushPost="unpushPost(post, refetchPostList)"
                @toggleObservePost="
                  (postId, value) => toggleObservePost(postId, value, refetchPostList)
                "
              />
            </masonry-grid-item>
          </template>
          <template v-else-if="$apollo.loading">
            <ds-grid-item column-span="fullWidth">
              <div style="text-align: center; padding: 48px 0">
                <os-spinner size="lg" />
              </div>
            </ds-grid-item>
          </template>
          <template v-else>
            <ds-grid-item column-span="fullWidth">
              <hc-empty margin="xx-large" icon="file" />
            </ds-grid-item>
          </template>
        </masonry-grid>
        <client-only>
          <infinite-loading v-if="hasMore" @infinite="showMoreContributions">
            <os-spinner slot="spinner" size="lg" />
          </infinite-loading>
        </client-only>
      </div>
    </div>
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import uniqBy from 'lodash/uniqBy'
import { mapGetters, mapMutations } from 'vuex'
import postListActions from '~/mixins/postListActions'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import HcFollowButton from '~/components/Button/FollowButton'
import HcCountTo from '~/components/CountTo.vue'
import HcBadges from '~/components/Badges.vue'
import FollowList, { followListVisibleCount } from '~/components/features/ProfileList/FollowList'
import HcEmpty from '~/components/Empty/Empty'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import AvatarUploader from '~/components/Uploader/AvatarUploader'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'
import { profilePagePosts } from '~/graphql/PostQuery'
import { profileUserQuery, updateUserMutation } from '~/graphql/User'
import { muteUser, unmuteUser } from '~/graphql/settings/MutedUsers'
import { blockUser, unblockUser } from '~/graphql/settings/BlockedUsers'
import UpdateQuery from '~/components/utils/UpdateQuery'
import SocialMedia from '~/components/SocialMedia/SocialMedia'
import LocationInfo from '~/components/LocationInfo/LocationInfo.vue'

const tabToFilterMapping = ({ tab, id }) => {
  return {
    post: { author: { id } },
    comment: { comments_some: { author: { id } } },
    shout: { shoutedBy_some: { id } },
  }[tab]
}

export default {
  components: {
    OsCard,
    OsButton,
    OsIcon,
    OsSpinner,
    SocialMedia,
    PostTeaser,
    HcFollowButton,
    HcCountTo,
    HcBadges,
    HcEmpty,
    ProfileAvatar,
    ContentMenu,
    AvatarUploader,
    MasonryGrid,
    MasonryGridItem,
    FollowList,
    TabNavigation,
    LocationInfo,
  },
  created() {
    this.icons = iconRegistry
  },
  mixins: [postListActions],
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  head() {
    return {
      title: this.userName,
    }
  },
  data() {
    const filter = tabToFilterMapping({ tab: 'post', id: this.$route.params.id })
    return {
      User: [],
      posts: [],
      hasMore: true,
      offset: 0,
      pageSize: 6,
      tabActive: 'post',
      filter,
      followedByCountStartValue: 0,
      followedByCount: followListVisibleCount,
      followingCount: followListVisibleCount,
      updateUserMutation,
    }
  },
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
    }),
    myProfile() {
      return this.$route.params.id === this.$store.getters['auth/user'].id
    },
    user() {
      return this.User ? this.User[0] : {}
    },
    userBadges() {
      if (!this.$env.BADGES_ENABLED) return null
      return [this.user.badgeVerification, ...(this.user.badgeTrophiesSelected || [])]
    },
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
    userSlug() {
      const { slug } = this.user || {}
      return slug
    },
    tabOptions() {
      return [
        {
          type: 'post',
          title: this.$t('common.post', null, this.user.contributionsCount),
          count: this.user.contributionsCount,
          disabled: this.user.contributionsCount === 0,
        },
        {
          type: 'comment',
          title: this.$t('profile.commented'),
          count: this.user.commentedCount,
          disabled: this.user.commentedCount === 0,
        },
        {
          type: 'shout',
          title: this.$t('profile.shouted'),
          count: this.user.shoutedCount,
          disabled: this.user.shoutedCount === 0,
        },
      ]
    },
  },
  methods: {
    ...mapMutations({
      commitModalData: 'modal/SET_OPEN',
      showChat: 'chat/SET_OPEN_CHAT',
    }),
    handleTab(tab) {
      if (this.tabActive !== tab) {
        this.tabActive = tab
        this.filter = tabToFilterMapping({ tab, id: this.$route.params.id })
        this.resetPostList()
      }
    },
    uniq(items, field = 'id') {
      return uniqBy(items, field)
    },
    showMoreContributions($state) {
      const { profilePagePosts: PostQuery } = this.$apollo.queries
      if (!PostQuery) return // seems this can be undefined on subpages
      this.offset += this.pageSize

      PostQuery.fetchMore({
        variables: {
          offset: this.offset,
          filter: this.filter,
          first: this.pageSize,
          orderBy: 'sortDate_desc',
        },
        updateQuery: UpdateQuery(this, { $state, pageKey: 'profilePagePosts' }),
      })
    },
    resetPostList() {
      this.offset = 0
      this.posts = []
      this.hasMore = true
    },
    refetchPostList() {
      this.resetPostList()
      this.$apollo.queries.profilePagePosts.refetch()
    },
    async muteUser(user) {
      try {
        await this.$apollo.mutate({ mutation: muteUser(), variables: { id: user.id } })
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.$apollo.queries.User.refetch()
        this.resetPostList()
        this.$apollo.queries.profilePagePosts.refetch()
      }
    },
    async unmuteUser(user) {
      try {
        await this.$apollo.mutate({ mutation: unmuteUser(), variables: { id: user.id } })
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.$apollo.queries.User.refetch()
        this.resetPostList()
        this.$apollo.queries.profilePagePosts.refetch()
      }
    },
    async blockUser(user) {
      try {
        await this.$apollo.mutate({ mutation: blockUser(), variables: { id: user.id } })
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.$apollo.queries.User.refetch()
      }
    },
    async unblockUser(user) {
      try {
        await this.$apollo.mutate({ mutation: unblockUser(), variables: { id: user.id } })
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.$apollo.queries.User.refetch()
      }
    },
    async deleteUser(userdata) {
      this.commitModalData({
        name: 'delete',
        data: {
          userdata: userdata,
        },
      })
    },
    optimisticFollow({ followedByCurrentUser }) {
      /*
       * Note: followedByCountStartValue is updated to avoid counting from 0 when follow/unfollow
       */
      this.followedByCountStartValue = this.user.followedByCount
      const currentUser = this.$store.getters['auth/user']
      if (followedByCurrentUser) {
        this.user.followedByCount++
        this.user.followedBy = [currentUser, ...this.user.followedBy]
      } else {
        this.user.followedByCount--
        this.user.followedBy = this.user.followedBy.filter((user) => user.id !== currentUser.id)
      }
      this.user.followedByCurrentUser = followedByCurrentUser
    },
    updateFollow({ followedByCurrentUser, followedBy, followedByCount }) {
      this.followedByCountStartValue = this.user.followedByCount
      this.user.followedByCount = followedByCount
      this.user.followedByCurrentUser = followedByCurrentUser
      this.user.followedBy = followedBy
    },
    fetchAllConnections(type, count) {
      if (type === 'following') this.followingCount = count
      if (type === 'followedBy') this.followedByCount = count
    },
    async showOrChangeChat(roomID) {
      if (this.getShowChat.showChat) {
        await this.showChat({ showChat: false, roomID: null })
      }
      await this.showChat({ showChat: true, roomID })
    },
  },
  apollo: {
    profilePagePosts: {
      query() {
        return profilePagePosts(this.$i18n)
      },
      variables() {
        return {
          filter: this.filter,
          first: this.pageSize,
          offset: 0,
          orderBy: 'sortDate_desc',
        }
      },
      update({ profilePagePosts }) {
        this.posts = profilePagePosts
      },
      fetchPolicy: 'cache-and-network',
    },
    User: {
      query() {
        return profileUserQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.$route.params.id,
          followedByCount: this.followedByCount,
          followingCount: this.followingCount,
        }
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
.profile-page-avatar.profile-avatar {
  margin: auto;
  margin-top: -60px;
}
.badge-edit-link {
  transition: all 0.2s ease-out;
  &:hover {
    opacity: 0.7;
  }
}
.page-name-profile-id-slug {
  .profile-layout__sidebar .content-menu {
    position: absolute;
    top: $space-x-small;
    right: $space-x-small;
  }
}
.profile-layout__sidebar,
.profile-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-small} {
  .profile-layout__sidebar {
    flex: 2 0 0;
  }
  .profile-layout__main {
    flex: 3 0 0;
  }
}
@media #{$media-query-medium} {
  .profile-layout__sidebar {
    flex: 2 0 0;
  }
  .profile-layout__main {
    flex: 5 0 0;
  }
}
@media #{$media-query-large} {
  .profile-layout__sidebar {
    flex: 1 0 0;
  }
  .profile-layout__main {
    flex: 3 0 0;
  }
}
.profile-post-add-button-container {
  display: flex;
  justify-content: center;
  padding: $space-x-small 0;
}
.profile-post-add-button {
  box-shadow: $box-shadow-x-large !important;
}
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: $space-x-small;
  margin: $space-small 0;
}
</style>

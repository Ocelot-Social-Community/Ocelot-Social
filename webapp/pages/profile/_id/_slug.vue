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
              <os-number
                :count="user.followedByCount"
                :label="$t('profile.followers')"
                :animated="true"
              />
            </div>
            <div class="ds-flex-item">
              <os-number
                :count="user.followingCount"
                :label="$t('profile.following')"
                :animated="true"
              />
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
            <os-button
              v-if="!user.isMuted && !user.isBlocked"
              data-test="follow-btn"
              :variant="user.followedByCurrentUser && followHovered ? 'danger' : 'primary'"
              :appearance="user.followedByCurrentUser && !followHovered ? 'filled' : 'outline'"
              :disabled="!user.id"
              :loading="followLoading"
              :aria-pressed="user.followedByCurrentUser"
              full-width
              @mouseenter="onFollowHover"
              @mouseleave="followHovered = false"
              @focus="onFollowHover"
              @blur="followHovered = false"
              @click.prevent="toggleFollow"
            >
              <template #icon>
                <os-icon :icon="followIcon" />
              </template>
              {{ followLabel }}
            </os-button>
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
        <h3 class="ds-heading ds-heading-h3 ds-heading-soft ds-text-center ds-mb-x-small">
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
        <tab-navigation
          :tabs="tabOptions"
          :activeTab="tabActive"
          class="ds-mb-large"
          @switch-tab="handleTab"
        />

        <div v-if="myProfile" class="profile-post-add-button-container">
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

        <masonry-grid>
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
            <div style="grid-row-end: span 4; grid-column: 1 / -1">
              <div style="text-align: center; padding: 48px 0">
                <os-spinner size="lg" />
              </div>
            </div>
          </template>
          <template v-else>
            <div style="grid-row-end: span 4; grid-column: 1 / -1">
              <hc-empty margin="xx-large" icon="file" />
            </div>
          </template>
        </masonry-grid>
        <client-only>
          <infinite-loading v-if="hasMore" @infinite="showMoreContributions">
            <os-spinner slot="spinner" size="lg" />
          </infinite-loading>
        </client-only>
      </div>
    </div>

    <os-modal
      v-if="deleteUserData"
      :open="showDeleteModal"
      :title="$t('settings.deleteUserAccount.accountWarningIsAdmin')"
      @cancel="cancelDeleteUser"
    >
      <p>{{ $t('settings.deleteUserAccount.infoAdmin') }}</p>
      <div class="ds-flex" style="margin-top: 0.75rem">
        <div style="flex: 0 0 50%; width: 50%">
          <user-teaser :user="deleteUserData" :link-to-profile="false" :show-popover="false" />
        </div>
        <div style="flex: 0 0 20%; width: 20%">
          <p class="ds-text ds-text-size-small">
            <strong>{{ $t('modals.deleteUser.created') }}</strong>
            <br />
            <date-time :date-time="deleteUserData.createdAt" />
          </p>
        </div>
        <div style="flex: 0 0 15%; width: 15%">
          <p class="ds-text ds-text-size-small">
            <strong>{{ $t('common.post', null, deleteUserData.contributionsCount) }}</strong>
            <br />
            {{ deleteUserData.contributionsCount }}
          </p>
        </div>
        <div style="flex: 0 0 15%; width: 15%">
          <p class="ds-text ds-text-size-small">
            <strong>{{ $t('common.comment', null, deleteUserData.commentedCount) }}</strong>
            <br />
            {{ deleteUserData.commentedCount }}
          </p>
        </div>
      </div>

      <template #footer="{ cancel }">
        <os-button variant="primary" appearance="outline" @click="cancel">
          {{ $t('actions.cancel') }}
        </os-button>
        <os-button
          variant="danger"
          appearance="filled"
          :loading="deleteLoading"
          @click="confirmDeleteUser"
        >
          <template #icon><os-icon :icon="icons.exclamationCircle" /></template>
          {{ $t('settings.deleteUserAccount.name') }}
        </os-button>
      </template>
    </os-modal>
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsModal, OsNumber, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import gql from 'graphql-tag'
import uniqBy from 'lodash/uniqBy'
import { mapGetters, mapMutations } from 'vuex'
import postListActions from '~/mixins/postListActions'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import { useFollowUser } from '~/composables/useFollowUser'
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
import DateTime from '~/components/DateTime'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
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
    OsModal,
    OsNumber,
    OsSpinner,
    SocialMedia,
    PostTeaser,
    HcBadges,
    HcEmpty,
    ProfileAvatar,
    ContentMenu,
    AvatarUploader,
    DateTime,
    UserTeaser,
    MasonryGrid,
    MasonryGridItem,
    FollowList,
    TabNavigation,
    LocationInfo,
  },
  created() {
    this.icons = iconRegistry
    const { toggleFollow } = useFollowUser({ apollo: this.$apollo, i18n: this.$i18n })
    this._toggleFollow = toggleFollow
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
      followedByCount: followListVisibleCount,
      followingCount: followListVisibleCount,
      updateUserMutation,
      showDeleteModal: false,
      deleteUserData: null,
      deleteLoading: false,
      followHovered: false,
      followLoading: false,
    }
  },
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
    }),
    myProfile() {
      return this.$route.params.id === this.$store.getters['auth/user'].id
    },
    followIcon() {
      if (this.user.followedByCurrentUser && this.followHovered) return this.icons.close
      return this.user.followedByCurrentUser ? this.icons.check : this.icons.plus
    },
    followLabel() {
      if (this.user.followedByCurrentUser && this.followHovered) {
        return this.$t('followButton.unfollow')
      }
      return this.user.followedByCurrentUser
        ? this.$t('followButton.following')
        : this.$t('followButton.follow')
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
    deleteUser(userdata) {
      this.deleteUserData = userdata
      this.showDeleteModal = true
    },
    cancelDeleteUser() {
      this.showDeleteModal = false
      this.deleteUserData = null
    },
    async confirmDeleteUser() {
      this.deleteLoading = true
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation ($id: ID!, $resource: [Deletable]) {
              DeleteUser(id: $id, resource: $resource) {
                id
              }
            }
          `,
          variables: { id: this.deleteUserData.id, resource: ['Post', 'Comment'] },
        })
        this.$toast.success(this.$t('settings.deleteUserAccount.success'))
        this.showDeleteModal = false
        this.$router.replace('/')
      } catch (err) {
        this.$toast.error(err.message)
        this.showDeleteModal = false
      } finally {
        this.deleteLoading = false
      }
    },
    onFollowHover() {
      if (!this.followLoading) this.followHovered = true
    },
    async toggleFollow() {
      if (this.followLoading) return
      const follow = !this.user.followedByCurrentUser
      this.followHovered = false
      this.followLoading = true

      // optimistic update
      const currentUser = this.$store.getters['auth/user']
      if (follow) {
        this.user.followedByCount++
        this.user.followedBy = [currentUser, ...this.user.followedBy]
      } else {
        this.user.followedByCount--
        this.user.followedBy = this.user.followedBy.filter((u) => u.id !== currentUser.id)
      }
      this.user.followedByCurrentUser = follow

      const { success, data } = await this._toggleFollow({
        id: this.user.id,
        isCurrentlyFollowed: !follow,
      })
      if (success) {
        this.user.followedByCount = data.followedByCount
        this.user.followedByCurrentUser = data.followedByCurrentUser
        this.user.followedBy = data.followedBy
      } else {
        // rollback optimistic update
        this.$toast.error(this.$t('followButton.error'))
        this.user.followedByCurrentUser = !follow
        if (follow) {
          this.user.followedByCount--
          this.user.followedBy = this.user.followedBy.filter((u) => u.id !== currentUser.id)
        } else {
          this.user.followedByCount++
          this.user.followedBy = [currentUser, ...this.user.followedBy]
        }
      }
      this.followLoading = false
    },
    fetchAllConnections(type, count) {
      if (type === 'following') this.followingCount = count
      if (type === 'followedBy') this.followedByCount = count
    },
    showOrChangeChat(userId) {
      if (this.getShowChat.showChat) {
        this.showChat({ showChat: false, chatUserId: null })
      }
      this.showChat({ showChat: true, chatUserId: userId })
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
  min-width: 0;
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
  margin: $space-small 0;
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

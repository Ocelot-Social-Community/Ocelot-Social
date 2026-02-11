<template>
  <div>
    <ds-space />
    <ds-flex v-if="user" :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', sm: 2, md: 2, lg: 1 }">
        <base-card
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
          <ds-space margin="small">
            <ds-heading tag="h3" align="center" no-margin>
              {{ userName }}
            </ds-heading>
            <ds-text align="center" color="soft">
              <!-- <base-icon name="at" data-test="at" /> -->
              {{ `@${userSlug}` }}
            </ds-text>
            <location-info
              v-if="user.location"
              :location-data="user.location"
              :is-owner="myProfile"
              size="small"
            />
            <ds-text align="center" color="soft" size="small">
              {{ $t('profile.memberSince') }} {{ user.createdAt | date('MMMM yyyy') }}
            </ds-text>
          </ds-space>
          <ds-space v-if="userBadges && userBadges.length" margin="x-small">
            <a v-if="myProfile" href="/settings/badges" class="badge-edit-link">
              <hc-badges :badges="userBadges" />
            </a>
            <hc-badges v-if="!myProfile" :badges="userBadges" />
          </ds-space>
          <ds-flex>
            <ds-flex-item>
              <client-only>
                <ds-number :label="$t('profile.followers')">
                  <hc-count-to
                    slot="count"
                    :start-val="followedByCountStartValue"
                    :end-val="user.followedByCount"
                  />
                </ds-number>
              </client-only>
            </ds-flex-item>
            <ds-flex-item>
              <client-only>
                <ds-number :label="$t('profile.following')">
                  <hc-count-to slot="count" :end-val="user.followingCount" />
                </ds-number>
              </client-only>
            </ds-flex-item>
          </ds-flex>
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
              <template #icon><base-icon name="chat-bubble" /></template>
              {{ $t('chat.userProfileButton.label') }}
            </os-button>
          </div>
          <template v-if="user.about">
            <hr />
            <ds-space margin-top="small" margin-bottom="small">
              <ds-text align="center" color="soft" size="small" class="hyphenate-text">
                {{ user.about }}
              </ds-text>
            </ds-space>
          </template>
        </base-card>
        <ds-space />
        <ds-heading tag="h3" soft style="text-align: center; margin-bottom: 10px">
          {{ $t('profile.network.title') }}
        </ds-heading>
        <follow-list
          :loading="$apollo.loading"
          :user="user"
          type="followedBy"
          @fetchAllConnections="fetchAllConnections"
        />
        <ds-space />
        <follow-list
          :loading="$apollo.loading"
          :user="user"
          type="following"
          @fetchAllConnections="fetchAllConnections"
        />
        <social-media :user-name="userName" :user="user" />
      </ds-flex-item>

      <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
        <masonry-grid>
          <!-- TapNavigation -->
          <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" />

          <!-- feed -->
          <ds-grid-item :row-span="2" column-span="fullWidth">
            <ds-space centered>
              <nuxt-link :to="{ name: 'post-create-type' }">
                <base-button
                  v-if="myProfile"
                  v-tooltip="{
                    content: $t('contribution.newPost'),
                    placement: 'left',
                  }"
                  class="profile-post-add-button"
                  icon="plus"
                  circle
                  filled
                />
              </nuxt-link>
            </ds-space>
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
              <ds-space centered>
                <ds-spinner size="base"></ds-spinner>
              </ds-space>
            </ds-grid-item>
          </template>
          <template v-else>
            <ds-grid-item column-span="fullWidth">
              <hc-empty margin="xx-large" icon="file" />
            </ds-grid-item>
          </template>
        </masonry-grid>
        <client-only>
          <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
        </client-only>
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
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
    OsButton,
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
  .ds-flex-item:first-child .content-menu {
    position: absolute;
    top: $space-x-small;
    right: $space-x-small;
  }
}
.profile-post-add-button {
  box-shadow: $box-shadow-x-large;
}
.action-buttons {
  margin: $space-small 0;

  > button {
    margin-bottom: $space-x-small;
  }
  > .base-button {
    display: block;
    width: 100%;
  }
}
</style>

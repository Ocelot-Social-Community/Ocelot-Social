<template>
  <div>
    <ds-space />
    <ds-flex v-if="group" :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', sm: 2, md: 2, lg: 1 }">
        <base-card
          :class="{ 'disabled-content': group.disabled }"
          style="position: relative; height: auto; overflow: visible"
        >
          <avatar-uploader v-if="isMyGroup" :profile="group">
            <!-- Wolle: <user-avatar :user="user" class="profile-avatar" size="large"></user-avatar> -->
          </avatar-uploader>
          <!-- Wolle: <user-avatar v-else :user="user" class="profile-avatar" size="large" /> -->
          <!-- Menu -->
          <!-- Wolle: <client-only>
            <content-menu
              placement="bottom-end"
              resource-type="user"
              :resource="user"
              :is-owner="isMyGroup"
              class="user-content-menu"
              @mute="muteUser"
              @unmute="unmuteUser"
              @block="blockUser"
              @unblock="unblockUser"
              @delete="deleteUser"
            />
          </client-only> -->
          <ds-space margin="small">
            <ds-heading tag="h3" align="center" no-margin>
              {{ groupName }}
            </ds-heading>
            <ds-text align="center" color="soft">
              {{ groupSlug }}
            </ds-text>
            <!-- Wolle: <ds-text v-if="user.location" align="center" color="soft" size="small">
              <base-icon name="map-marker" />
              {{ user.location.name }}
            </ds-text> -->
            <ds-text align="center" color="soft" size="small">
              {{ $t('profile.groupSince') }} {{ group.createdAt | date('MMMM yyyy') }}
            </ds-text>
          </ds-space>
          <!-- Wolle: <ds-space v-if="user.badges && user.badges.length" margin="x-small">
            <hc-badges :badges="user.badges" />
          </ds-space> -->
          <ds-flex>
            <ds-flex-item>
              <!-- Wolle: <client-only>
                <ds-number :label="$t('profile.followers')">
                  <hc-count-to
                    slot="count"
                    :start-val="followedByCountStartValue"
                    :end-val="user.followedByCount"
                  />
                </ds-number>
              </client-only> -->
            </ds-flex-item>
            <ds-flex-item>
              <!-- Wolle: <client-only>
                <ds-number :label="$t('profile.following')">
                  <hc-count-to slot="count" :end-val="user.followingCount" />
                </ds-number>
              </client-only> -->
            </ds-flex-item>
          </ds-flex>
          <!-- Wolle: <div v-if="!isMyGroup" class="action-buttons">
            <base-button v-if="user.isBlocked" @click="unblockUser(user)">
              {{ $t('settings.blocked-users.unblock') }}
            </base-button>
            <base-button v-if="user.isMuted" @click="unmuteUser(user)">
              {{ $t('settings.muted-users.unmute') }}
            </base-button>
            <hc-follow-button
              v-if="!user.isMuted && !user.isBlocked"
              :follow-id="user.id"
              :is-followed="user.followedByCurrentUser"
              @optimistic="optimisticFollow"
              @update="updateFollow"
            />
          </div> -->
          <template v-if="group.about">
            <hr />
            <ds-space margin-top="small" margin-bottom="small">
              <ds-text color="soft" size="small" class="hyphenate-text">
                {{ $t('profile.groupGoal') }} {{ group.about }}
              </ds-text>
            </ds-space>
          </template>
        </base-card>
        <ds-space />
        <ds-heading tag="h3" soft style="text-align: center; margin-bottom: 10px">
          {{ $t('profile.network.title') }}
        </ds-heading>
        <!-- Wolle: <follow-list
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
        /> -->
        <!-- Wolle: <social-media :user-name="groupName" :user="user" /> -->
      </ds-flex-item>

      <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
        <masonry-grid>
          <!-- TapNavigation -->
          <!-- Wolle: <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" /> -->

          <!-- feed -->
          <ds-grid-item :row-span="2" column-span="fullWidth">
            <ds-space centered>
              <nuxt-link :to="{ name: 'post-create' }">
                <base-button
                  v-if="isMyGroup"
                  v-tooltip="{
                    content: $t('contribution.newPost'),
                    placement: 'left',
                    delay: { show: 500 },
                  }"
                  :path="{ name: 'post-create' }"
                  class="profile-post-add-button"
                  icon="plus"
                  circle
                  filled
                />
              </nuxt-link>
            </ds-space>
          </ds-grid-item>

          <template v-if="posts && posts.length">
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
        <!-- Wolle: <client-only>
          <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
        </client-only> -->
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import uniqBy from 'lodash/uniqBy'
import postListActions from '~/mixins/postListActions'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import HcFollowButton from '~/components/FollowButton.vue'
import HcCountTo from '~/components/CountTo.vue'
import HcBadges from '~/components/Badges.vue'
import FollowList from '~/components/features/FollowList/FollowList'
import HcEmpty from '~/components/Empty/Empty'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import AvatarUploader from '~/components/Uploader/AvatarUploader'
import UserAvatar from '~/components/_new/generic/UserAvatar/UserAvatar'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'
import { profilePagePosts } from '~/graphql/PostQuery'
import { groupQuery } from '~/graphql/groups'
import { muteUser, unmuteUser } from '~/graphql/settings/MutedUsers'
import { blockUser, unblockUser } from '~/graphql/settings/BlockedUsers'
import UpdateQuery from '~/components/utils/UpdateQuery'
import SocialMedia from '~/components/SocialMedia/SocialMedia'

// Wolle:
// const tabToFilterMapping = ({ tab, id }) => {
//   return {
//     post: { author: { id } },
//     comment: { comments_some: { author: { id } } },
//     shout: { shoutedBy_some: { id } },
//   }[tab]
// }

export default {
  components: {
    SocialMedia,
    PostTeaser,
    HcFollowButton,
    HcCountTo,
    HcBadges,
    HcEmpty,
    UserAvatar,
    ContentMenu,
    AvatarUploader,
    MasonryGrid,
    MasonryGridItem,
    FollowList,
    TabNavigation,
  },
  mixins: [postListActions],
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  data() {
    // Wolle:
    // const filter = tabToFilterMapping({ tab: 'post', id: this.$route.params.id })
    return {
      Group: [],
      posts: [],
      hasMore: true,
      offset: 0,
      pageSize: 6,
      tabActive: 'post',
      // Wolle: filter,
      followedByCountStartValue: 0,
      followedByCount: 7,
      followingCount: 7,
    }
  },
  computed: {
    isMyGroup() {
      return this.group.myRole
    },
    group() {
      return this.Group ? this.Group[0] : {}
    },
    groupName() {
      const { name } = this.group || {}
      return name || this.$t('profile.userAnonym')
    },
    groupSlug() {
      const { slug } = this.group || {}
      return slug && `@${slug}`
    },
    // tabOptions() {
    //   return [
    //     {
    //       type: 'post',
    //       title: this.$t('common.post', null, this.user.contributionsCount),
    //       count: this.user.contributionsCount,
    //       disabled: this.user.contributionsCount === 0,
    //     },
    //     {
    //       type: 'comment',
    //       title: this.$t('profile.commented'),
    //       count: this.user.commentedCount,
    //       disabled: this.user.commentedCount === 0,
    //     },
    //     {
    //       type: 'shout',
    //       title: this.$t('profile.shouted'),
    //       count: this.user.shoutedCount,
    //       disabled: this.user.shoutedCount === 0,
    //     },
    //   ]
    // },
  },
  methods: {
    // Wolle: handleTab(tab) {
    //   if (this.tabActive !== tab) {
    //     this.tabActive = tab
    //     this.filter = tabToFilterMapping({ tab, id: this.$route.params.id })
    //     this.resetPostList()
    //   }
    // },
    uniq(items, field = 'id') {
      return uniqBy(items, field)
    },
    // Wolle:
    // showMoreContributions($state) {
    //   const { profilePagePosts: PostQuery } = this.$apollo.queries
    //   if (!PostQuery) return // seems this can be undefined on subpages
    //   this.offset += this.pageSize

    //   PostQuery.fetchMore({
    //     variables: {
    //       offset: this.offset,
    //       filter: this.filter,
    //       first: this.pageSize,
    //       orderBy: 'createdAt_desc',
    //     },
    //     updateQuery: UpdateQuery(this, { $state, pageKey: 'profilePagePosts' }),
    //   })
    // },
    // resetPostList() {
    //   this.offset = 0
    //   this.posts = []
    //   this.hasMore = true
    // },
    // refetchPostList() {
    //   this.resetPostList()
    //   this.$apollo.queries.profilePagePosts.refetch()
    // },
    // async muteUser(user) {
    //   try {
    //     await this.$apollo.mutate({ mutation: muteUser(), variables: { id: user.id } })
    //   } catch (error) {
    //     this.$toast.error(error.message)
    //   } finally {
    //     this.$apollo.queries.User.refetch()
    //     this.resetPostList()
    //     this.$apollo.queries.profilePagePosts.refetch()
    //   }
    // },
    // async unmuteUser(user) {
    //   try {
    //     this.$apollo.mutate({ mutation: unmuteUser(), variables: { id: user.id } })
    //   } catch (error) {
    //     this.$toast.error(error.message)
    //   } finally {
    //     this.$apollo.queries.User.refetch()
    //     this.resetPostList()
    //     this.$apollo.queries.profilePagePosts.refetch()
    //   }
    // },
    // async blockUser(user) {
    //   try {
    //     await this.$apollo.mutate({ mutation: blockUser(), variables: { id: user.id } })
    //   } catch (error) {
    //     this.$toast.error(error.message)
    //   } finally {
    //     this.$apollo.queries.User.refetch()
    //   }
    // },
    // async unblockUser(user) {
    //   try {
    //     this.$apollo.mutate({ mutation: unblockUser(), variables: { id: user.id } })
    //   } catch (error) {
    //     this.$toast.error(error.message)
    //   } finally {
    //     this.$apollo.queries.User.refetch()
    //   }
    // },
    // async deleteUser(userdata) {
    //   this.$store.commit('modal/SET_OPEN', {
    //     name: 'delete',
    //     data: {
    //       userdata: userdata,
    //     },
    //   })
    // },
    // Wolle:
    // optimisticFollow({ followedByCurrentUser }) {
    //   /*
    //    * Note: followedByCountStartValue is updated to avoid counting from 0 when follow/unfollow
    //    */
    //   this.followedByCountStartValue = this.user.followedByCount
    //   const currentUser = this.$store.getters['auth/user']
    //   if (followedByCurrentUser) {
    //     this.user.followedByCount++
    //     this.user.followedBy = [currentUser, ...this.user.followedBy]
    //   } else {
    //     this.user.followedByCount--
    //     this.user.followedBy = this.user.followedBy.filter((user) => user.id !== currentUser.id)
    //   }
    //   this.user.followedByCurrentUser = followedByCurrentUser
    // },
    // Wolle:
    // updateFollow({ followedByCurrentUser, followedBy, followedByCount }) {
    //   this.followedByCountStartValue = this.user.followedByCount
    //   this.user.followedByCount = followedByCount
    //   this.user.followedByCurrentUser = followedByCurrentUser
    //   this.user.followedBy = followedBy
    // },
    // Wolle:
    // fetchAllConnections(type) {
    //   if (type === 'following') this.followingCount = Infinity
    //   if (type === 'followedBy') this.followedByCount = Infinity
    // },
  },
  apollo: {
    // Wolle:
    // profilePagePosts: {
    //   query() {
    //     return profilePagePosts(this.$i18n)
    //   },
    //   variables() {
    //     return {
    //       filter: this.filter,
    //       first: this.pageSize,
    //       offset: 0,
    //       orderBy: 'createdAt_desc',
    //     }
    //   },
    //   update({ profilePagePosts }) {
    //     this.posts = profilePagePosts
    //   },
    //   fetchPolicy: 'cache-and-network',
    // },
    Group: {
      query() {
        // Wolle: return groupQuery(this.$i18n) // language will be needed for lacations
        return groupQuery
      },
      variables() {
        return {
          id: this.$route.params.id,
          // followedByCount: this.followedByCount,
          // followingCount: this.followingCount,
        }
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
.profile-avatar.user-avatar {
  margin: auto;
  margin-top: -60px;
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

  > .base-button {
    display: block;
    width: 100%;
    margin-bottom: $space-x-small;
  }
}
</style>

<template>
  <div>
    <ds-space />
    <ds-flex v-if="group" :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', sm: 2, md: 2, lg: 1 }">
        <base-card
          :class="{ 'disabled-content': group.disabled }"
          style="position: relative; height: auto; overflow: visible"
        >
          <avatar-uploader
            v-if="isGroupOwner"
            :profile="group"
            :updateMutation="updateGroupMutation"
          >
            <profile-avatar :profile="group" class="profile-page-avatar" size="large" />
          </avatar-uploader>
          <profile-avatar v-else :profile="group" class="profile-page-avatar" size="large" />
          <!-- Menu -->
          <!-- <client-only>
            <content-menu
              placement="bottom-end"
              resource-type="user"
              :resource="user"
              :is-owner="isGroupOwner"
              class="user-content-menu"
              @mute="muteUser"
              @unmute="unmuteUser"
              @block="blockUser"
              @unblock="unblockUser"
              @delete="deleteUser"
            />
          </client-only> -->
          <ds-space margin="small">
            <!-- Group name -->
            <ds-heading tag="h3" align="center" no-margin>
              {{ groupName }}
            </ds-heading>
            <!-- Group slug -->
            <ds-text align="center" color="soft">
              {{ groupSlug }}
            </ds-text>
            <!-- Group location -->
            <!-- <ds-text v-if="user.location" align="center" color="soft" size="small">
              <base-icon name="map-marker" />
              {{ user.location.name }}
            </ds-text> -->
            <!-- Group created at -->
            <ds-text align="center" color="soft" size="small">
              {{ $t('group.foundation') }} {{ group.createdAt | date('MMMM yyyy') }}
            </ds-text>
          </ds-space>
          <ds-flex>
            <!-- Group members count -->
            <ds-flex-item>
              <client-only>
                <ds-number :label="$t('group.membersCount')">
                  <count-to
                    slot="count"
                    :start-val="membersCountStartValue"
                    :end-val="groupMembers.length"
                  />
                </ds-number>
              </client-only>
            </ds-flex-item>
            <!-- <ds-flex-item>
              <client-only>
                <ds-number :label="$t('profile.followers')">
                  <count-to
                    slot="count"
                    :start-val="followedByCountStartValue"
                    :end-val="user.followedByCount"
                  />
                </ds-number>
              </client-only>
            </ds-flex-item> -->
            <!-- <ds-flex-item>
              <client-only>
                <ds-number :label="$t('profile.following')">
                  <count-to slot="count" :end-val="user.followingCount" />
                </ds-number>
              </client-only>
            </ds-flex-item> -->
          </ds-flex>
          <div class="action-buttons">
            <!-- <base-button v-if="user.isBlocked" @click="unblockUser(user)">
              {{ $t('settings.blocked-users.unblock') }}
            </base-button>
            <base-button v-if="user.isMuted" @click="unmuteUser(user)">
              {{ $t('settings.muted-users.unmute') }}
            </base-button>
            <follow-button
              v-if="!user.isMuted && !user.isBlocked"
              :follow-id="user.id"
              :is-followed="user.followedByCurrentUser"
              @optimistic="optimisticFollow"
              @update="updateFollow"
            /> -->
            <!-- Group join / leave -->
            <join-leave-button
              :group="group || {}"
              :userId="currentUser.id"
              :isMember="isGroupMember"
              :disabled="isGroupOwner"
              :loading="$apollo.loading"
              @prepare="prepareJoinLeave"
              @update="updateJoinLeave"
            />
            <!-- implement:
              v-if="!user.isMuted && !user.isBlocked" -->
          </div>
          <hr />
          <ds-space margin-top="small" margin-bottom="small">
            <!-- Group my role in group -->
            <template v-if="isGroupMember">
              <ds-text class="centered-text hyphenate-text" color="soft" size="small">
                {{ $t('group.role') }}
              </ds-text>
              <div class="chip" align="center">
                <ds-chip color="primary">{{ $t('group.roles.' + group.myRole) }}</ds-chip>
              </div>
            </template>
            <!-- Group type -->
            <ds-text class="centered-text hyphenate-text" color="soft" size="small">
              {{ $t('group.type') }}
            </ds-text>
            <div class="chip" align="center">
              <ds-chip color="primary">{{ $t('group.types.' + group.groupType) }}</ds-chip>
            </div>
            <!-- Group action radius -->
            <ds-text class="centered-text hyphenate-text" color="soft" size="small">
              {{ $t('group.actionRadius') }}
            </ds-text>
            <div class="chip" align="center">
              <ds-chip color="primary">{{ $t('group.actionRadii.' + group.actionRadius) }}</ds-chip>
            </div>
          </ds-space>
          <template v-if="group.about">
            <hr />
            <!-- Group goal -->
            <ds-space margin-top="small" margin-bottom="small">
              <ds-text class="centered-text hyphenate-text" color="soft" size="small">
                {{ $t('group.goal') }}
              </ds-text>
              <div class="chip" align="center">
                <ds-chip>{{ group.about }}</ds-chip>
              </div>
            </ds-space>
          </template>
        </base-card>
        <ds-space />
        <ds-heading tag="h3" soft style="text-align: center; margin-bottom: 10px">
          {{ $t('profile.network.title') }}
        </ds-heading>
        <!-- Group members list -->
        <profile-list
          :uniqueName="`groupMembersFilter`"
          :title="$t('group.membersListTitle')"
          :allProfilesCount="groupMembers.length"
          :profiles="groupMembers"
          :loading="$apollo.loading"
          @fetchAllProfiles="fetchAllMembers"
        />
        <!-- <ds-space />
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
        /> -->
        <!-- <social-media :user-name="groupName" :user="user" /> -->
      </ds-flex-item>

      <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
        <masonry-grid>
          <!-- TapNavigation -->
          <!-- <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" /> -->

          <!-- feed -->
          <ds-grid-item :row-span="2" column-span="fullWidth">
            <ds-space centered>
              <nuxt-link :to="{ name: 'post-create' }">
                <base-button
                  v-if="isGroupMember"
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
              <empty margin="xx-large" icon="file" />
            </ds-grid-item>
          </template>
        </masonry-grid>
        <!-- <client-only>
          <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
        </client-only> -->
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import uniqBy from 'lodash/uniqBy'
// import { profilePagePosts } from '~/graphql/PostQuery'
import { updateGroupMutation, groupQuery, groupMembersQuery } from '~/graphql/groups'
// import { muteUser, unmuteUser } from '~/graphql/settings/MutedUsers'
// import { blockUser, unblockUser } from '~/graphql/settings/BlockedUsers'
// import UpdateQuery from '~/components/utils/UpdateQuery'
import postListActions from '~/mixins/postListActions'
import AvatarUploader from '~/components/Uploader/AvatarUploader'
// import ContentMenu from '~/components/ContentMenu/ContentMenu'
import CountTo from '~/components/CountTo.vue'
import Empty from '~/components/Empty/Empty'
// import FollowButton from '~/components/Button/FollowButton'
// import FollowList from '~/components/features/ProfileList/FollowList'
import JoinLeaveButton from '~/components/Button/JoinLeaveButton'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import ProfileList from '~/components/features/ProfileList/ProfileList'
// import SocialMedia from '~/components/SocialMedia/SocialMedia'
// import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'

// const tabToFilterMapping = ({ tab, id }) => {
//   return {
//     post: { author: { id } },
//     comment: { comments_some: { author: { id } } },
//     shout: { shoutedBy_some: { id } },
//   }[tab]
// }

export default {
  components: {
    AvatarUploader,
    // ContentMenu,
    CountTo,
    Empty,
    // FollowButton,
    // FollowList,
    JoinLeaveButton,
    PostTeaser,
    ProfileAvatar,
    ProfileList,
    MasonryGrid,
    MasonryGridItem,
    // SocialMedia,
    // TabNavigation,
  },
  mixins: [postListActions],
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  head() {
    return {
      title: this.groupName,
    }
  },
  data() {
    // const filter = tabToFilterMapping({ tab: 'post', id: this.$route.params.id })
    return {
      Group: [],
      GroupMembers: [],
      posts: [],
      // hasMore: true,
      // offset: 0,
      // pageSize: 6,
      // tabActive: 'post',
      // filter,
      // followedByCountStartValue: 0,
      // followedByCount: 7,
      // followingCount: 7,
      membersCountStartValue: 0,
      membersCountToLoad: Infinity,
      updateGroupMutation,
    }
  },
  computed: {
    currentUser() {
      return this.$store.getters['auth/user']
    },
    group() {
      return this.Group[0] ? this.Group[0] : {}
    },
    groupMembers() {
      return this.GroupMembers ? this.GroupMembers : []
    },
    isGroupOwner() {
      return this.group ? this.group.myRole === 'owner' : false
    },
    isGroupMember() {
      return this.group ? !!this.group.myRole : false
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
    // handleTab(tab) {
    //   if (this.tabActive !== tab) {
    //     this.tabActive = tab
    //     this.filter = tabToFilterMapping({ tab, id: this.$route.params.id })
    //     this.resetPostList()
    //   }
    // },
    uniq(items, field = 'id') {
      return uniqBy(items, field)
    },
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
    // updateFollow({ followedByCurrentUser, followedBy, followedByCount }) {
    //   this.followedByCountStartValue = this.user.followedByCount
    //   this.user.followedByCount = followedByCount
    //   this.user.followedByCurrentUser = followedByCurrentUser
    //   this.user.followedBy = followedBy
    // },
    prepareJoinLeave() {
      // "membersCountStartValue" is updated to avoid counting from 0 when join/leave
      this.membersCountStartValue = this.GroupMembers.length
    },
    updateJoinLeave({ myRoleInGroup }) {
      this.Group[0].myRole = myRoleInGroup
      this.$apollo.queries.GroupMembers.refetch()
    },
    fetchAllMembers() {
      this.membersCountToLoad = Infinity
    },
  },
  apollo: {
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
        // return groupQuery(this.$i18n) // language will be needed for locations
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
    GroupMembers: {
      query() {
        return groupMembersQuery
      },
      variables() {
        return {
          id: this.$route.params.id,
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
.centered-text {
  text-align: center;
  margin-bottom: $space-xxx-small;
}
.chip {
  margin-bottom: $space-x-small;
}
</style>

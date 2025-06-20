<template>
  <div class="group-profile" v-if="isGroupVisible">
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
          <client-only>
            <group-content-menu
              v-if="isGroupMemberNonePending"
              class="group-profile-content-menu"
              :usage="'groupProfile'"
              :group="group || {}"
              placement="bottom-end"
              @mute="muteGroup"
              @unmute="unmuteGroup"
            />
          </client-only>
          <ds-space margin="small">
            <!-- group name -->
            <ds-heading tag="h3" align="center" no-margin>
              {{ groupName }}
            </ds-heading>
            <!-- group slug -->
            <ds-text align="center" color="soft">
              <!-- <base-icon name="at" data-test="ampersand" /> -->
              {{ `&${groupSlug}` }}
            </ds-text>
            <!-- group location -->
            <ds-text v-if="group && group.location" align="center" color="soft" size="small">
              <base-icon name="map-marker" data-test="map-marker" />
              {{ group && group.location ? group.location.name : '' }}
            </ds-text>
            <!-- group created at -->
            <ds-text align="center" color="soft" size="small">
              {{ $t('group.foundation') }} {{ group.createdAt | date('MMMM yyyy') }}
            </ds-text>
          </ds-space>
          <ds-flex v-if="isAllowedSeeingGroupMembers">
            <!-- group members count -->
            <ds-flex-item v-if="isAllowedSeeingGroupMembers">
              <client-only>
                <ds-number :label="$t('group.membersCount', {}, groupMembers.length)">
                  <count-to
                    slot="count"
                    :start-val="membersCountStartValue"
                    :end-val="group.membersCount"
                  />
                </ds-number>
              </client-only>
            </ds-flex-item>
          </ds-flex>
          <div class="action-buttons">
            <base-button danger v-if="group.isMutedByMe" @click="unmuteGroup" icon="volume-up">
              {{ $t('group.unmute') }}
            </base-button>
            <!-- Group join / leave -->
            <join-leave-button
              :group="group || {}"
              :userId="currentUser.id"
              :isMember="isGroupMember"
              :isNonePendingMember="isGroupMemberNonePending"
              :disabled="isGroupOwner"
              :loading="$apollo.loading"
              @prepare="prepareJoinLeave"
              @update="updateJoinLeave"
            />
          </div>
          <hr />
          <ds-space margin-top="small" margin-bottom="small">
            <!-- group my role in group -->
            <template v-if="isGroupMember">
              <ds-text class="centered-text hyphenate-text" color="soft" size="small">
                {{ $t('group.role') }}
              </ds-text>
              <div class="chip" align="center">
                <ds-chip color="primary">
                  {{ group && group.myRole ? $t('group.roles.' + group.myRole) : '' }}
                </ds-chip>
              </div>
            </template>
            <!-- group type -->
            <ds-text class="centered-text hyphenate-text" color="soft" size="small">
              {{ $t('group.type') }}
            </ds-text>
            <div class="chip" align="center">
              <ds-chip color="primary">
                {{ group && group.groupType ? $t('group.types.' + group.groupType) : '' }}
              </ds-chip>
            </div>
            <!-- group action radius -->
            <ds-text class="centered-text hyphenate-text" color="soft" size="small">
              {{ $t('group.actionRadius') }}
            </ds-text>
            <div class="chip" align="center">
              <ds-chip color="primary">
                {{
                  group && group.actionRadius ? $t('group.actionRadii.' + group.actionRadius) : ''
                }}
              </ds-chip>
            </div>
            <ds-space margin="x-small" />
          </ds-space>
          <!-- group categories -->
          <template
            v-if="categoriesActive && group && group.categories && group.categories.length > 0"
          >
            <hr />
            <ds-space margin-top="small" margin-bottom="small">
              <ds-text class="centered-text hyphenate-text" color="soft" size="small">
                {{
                  $t(
                    'group.categories',
                    {},
                    group && group.categories ? group.categories.length : 0,
                  )
                }}
              </ds-text>
              <ds-space margin="xx-small" />
              <div class="categories">
                <div
                  v-for="(category, index) in sortCategories(
                    group && group.categories ? group.categories : [],
                  )"
                  :key="category.id"
                  align="center"
                >
                  <category
                    :icon="category.icon"
                    :name="$t(`contribution.category.name.${category.slug}`)"
                    v-tooltip="{
                      content: $t(`contribution.category.description.${category.slug}`),
                      placement: 'bottom-start',
                    }"
                  />
                  <ds-space v-if="index < group.categories.length - 1" margin="xxx-small" />
                </div>
              </div>
            </ds-space>
          </template>
          <!-- group goal -->
          <template v-if="group && group.about">
            <hr />
            <ds-space margin-top="small" margin-bottom="small">
              <ds-text class="centered-text hyphenate-text" color="soft" size="small">
                {{ $t('group.goal') }}
              </ds-text>
              <ds-space margin="xx-small" />
              <div class="chip" align="center">
                <ds-chip>{{ group ? group.about : '' }}</ds-chip>
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
          :uniqueName="'groupMembersFilter'"
          :title="$t('group.membersListTitle')"
          :titleNobody="
            !isAllowedSeeingGroupMembers
              ? $t('group.membersListTitleNotAllowedSeeingGroupMembers')
              : null
          "
          :allProfilesCount="isAllowedSeeingGroupMembers ? group.membersCount : 0"
          :profiles="isAllowedSeeingGroupMembers ? groupMembers : []"
          :loading="$apollo.loading"
          @fetchAllProfiles="fetchAllMembers"
        />
        <!-- <social-media :user-name="groupName" :user="user" /> -->
      </ds-flex-item>

      <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
        <!-- Group description -->
        <ds-space>
          <base-card class="group-description">
            <!-- TODO: replace editor content with tiptap render view -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-if="isDescriptionCollapsed"
              class="content hyphenate-text"
              v-html="groupDescriptionExcerpt"
            />
            <content-viewer v-else class="content hyphenate-text" :content="group.description" />
            <base-button
              class="collaps-button"
              size="small"
              ghost
              @click="isDescriptionCollapsed = !isDescriptionCollapsed"
            >
              {{ isDescriptionCollapsed ? $t('comment.show.more') : $t('comment.show.less') }}
            </base-button>
          </base-card>
        </ds-space>
        <ds-space v-if="isGroupMemberNonePending" centered>
          <nuxt-link :to="{ name: 'post-create', query: { groupId: group.id } }">
            <base-button
              class="profile-post-add-button"
              icon="plus"
              circle
              filled
              v-tooltip="{
                content: $t('contribution.newPost'),
                placement: 'left',
              }"
            />
          </nuxt-link>
        </ds-space>
        <masonry-grid>
          <!-- TapNavigation -->
          <!-- <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" /> -->

          <!-- Group post feed -->
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
              <empty margin="xx-large" icon="file" data-test="icon-empty" />
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
import uniqBy from 'lodash/uniqBy'
import { profilePagePosts } from '~/graphql/PostQuery'
import { updateGroupMutation, groupQuery, groupMembersQuery } from '~/graphql/groups'
import { muteGroup, unmuteGroup } from '~/graphql/settings/MutedGroups'
import UpdateQuery from '~/components/utils/UpdateQuery'
import postListActions from '~/mixins/postListActions'
import AvatarUploader from '~/components/Uploader/AvatarUploader'
import Category from '~/components/Category'
import ContentViewer from '~/components/Editor/ContentViewer'
import CountTo from '~/components/CountTo.vue'
import Empty from '~/components/Empty/Empty'
import GroupContentMenu from '~/components/ContentMenu/GroupContentMenu'
import JoinLeaveButton from '~/components/Button/JoinLeaveButton'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import ProfileList from '~/components/features/ProfileList/ProfileList'
import SortCategories from '~/mixins/sortCategoriesMixin.js'
import { mapGetters } from 'vuex'
import GetCategories from '~/mixins/getCategoriesMixin.js'
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
    Category,
    ContentViewer,
    CountTo,
    Empty,
    GroupContentMenu,
    JoinLeaveButton,
    PostTeaser,
    ProfileAvatar,
    ProfileList,
    MasonryGrid,
    MasonryGridItem,
    // SocialMedia,
    // TabNavigation,
  },
  mixins: [postListActions, SortCategories, GetCategories],
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
    const filter = { group: { id: this.$route.params.id } }
    return {
      loadGroupMembers: false,
      posts: [],
      hasMore: true,
      offset: 0,
      pageSize: 6,
      // tabActive: 'post',
      filter,
      membersCountStartValue: 0,
      membersCountToLoad: 25,
      updateGroupMutation,
      isDescriptionCollapsed: true,
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    group() {
      return this.Group && this.Group[0] ? this.Group[0] : {}
    },
    groupName() {
      const { name } = this.group || {}
      return name || this.$t('profile.userAnonym')
    },
    groupSlug() {
      const { slug } = this.group || {}
      return slug
    },
    groupDescriptionExcerpt() {
      return this.group ? this.$filters.removeLinks(this.group.descriptionExcerpt) : ''
    },
    isGroupOwner() {
      return this.group ? this.group.myRole === 'owner' : false
    },
    isGroupMember() {
      return this.group ? !!this.group.myRole : false
    },
    isGroupMemberNonePending() {
      return this.group ? ['usual', 'admin', 'owner'].includes(this.group.myRole) : false
    },
    isGroupVisible() {
      return this.group && !(this.group.groupType === 'hidden' && !this.isGroupMemberNonePending)
    },
    groupMembers() {
      return this.GroupMembers ? this.GroupMembers : []
    },
    isAllowedSeeingGroupMembers() {
      return (
        this.group &&
        (this.group.groupType === 'public' ||
          (['closed', 'hidden'].includes(this.group.groupType) && this.isGroupMemberNonePending))
      )
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
  watch: {
    isAllowedSeeingGroupMembers(to, _from) {
      this.loadGroupMembers = to
    },
  },
  methods: {
    // handleTab(tab) {
    //   if (this.tabActive !== tab) {
    //     this.tabActive = tab
    //     this.filter = tabToFilterMapping({ tab, id: this.$route.params.id })
    //     this.resetPostList()
    //   }
    // },
    async muteGroup() {
      try {
        await this.$apollo.mutate({
          mutation: muteGroup(),
          variables: {
            groupId: this.group.id,
          },
        })
        this.$toast.success(this.$t('group.muted'))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async unmuteGroup() {
      try {
        await this.$apollo.mutate({
          mutation: unmuteGroup(),
          variables: {
            groupId: this.group.id,
          },
        })
        this.$toast.success(this.$t('group.unmuted'))
      } catch (error) {
        this.$toast.error(error.message)
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
      this.membersCountStartValue = (this.GroupMembers && this.GroupMembers.length) || 0
    },
    updateJoinLeave({ myRoleInGroup }) {
      this.Group[0].myRole = myRoleInGroup
      if (this.isAllowedSeeingGroupMembers) {
        this.$apollo.queries.GroupMembers.refetch()
      } else {
        this.GroupMembers = []
      }
    },
    fetchAllMembers() {
      this.membersCountToLoad = this.group.membersCount
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
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.$route.params.id,
        }
      },
      error(error) {
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
    GroupMembers: {
      query() {
        return groupMembersQuery()
      },
      variables() {
        return {
          id: this.$route.params.id,
          first: this.membersCountToLoad,
        }
      },
      skip() {
        return !this.loadGroupMembers
      },
      error(error) {
        this.$toast.error(error.message)
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
.group-profile {
  .ds-flex-item:first-child .group-profile-content-menu {
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
.group-description > .base-card {
  display: flex;
  flex-direction: column;
  height: 100%;

  > .content {
    flex-grow: 1;
    margin-bottom: $space-small;
  }
}
.collaps-button {
  float: right;
}
</style>

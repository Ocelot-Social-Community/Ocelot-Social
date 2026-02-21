<template>
  <div class="group-profile" v-if="isGroupVisible">
    <div class="ds-mb-large"></div>
    <div v-if="group" class="ds-flex ds-flex-gap-base group-layout">
      <div class="group-layout__sidebar">
        <os-card
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
          <div class="ds-my-small">
            <!-- group name -->
            <h3 class="ds-heading ds-heading-h3 ds-heading-align-center ds-heading-no-margin">
              {{ groupName }}
            </h3>
            <!-- group slug -->
            <p class="ds-text ds-text-center ds-text-soft" style="word-break: break-all">
              {{ `&${groupSlug}` }}
            </p>
            <!-- group location -->
            <location-info
              v-if="group.location"
              :location-data="group.location"
              :is-owner="false"
              size="small"
            />
            <!-- group created at -->
            <p class="ds-text ds-text-center ds-text-soft ds-text-size-small">
              {{ $t('group.foundation') }} {{ group.createdAt | date('MMMM yyyy') }}
            </p>
          </div>
          <div class="ds-flex" v-if="isAllowedSeeingGroupMembers">
            <!-- group members count -->
            <div class="ds-flex-item" v-if="isAllowedSeeingGroupMembers">
              <os-number
                :count="group.membersCount"
                :label="$t('group.membersCount', {}, groupMembers.length)"
                :animated="true"
              />
            </div>
          </div>
          <div class="action-buttons">
            <os-button
              variant="danger"
              appearance="outline"
              v-if="group.isMutedByMe"
              @click="unmuteGroup"
            >
              <template #icon><os-icon :icon="icons.volumeUp" /></template>
              {{ $t('group.unmute') }}
            </os-button>
            <!-- Group join / leave -->
            <join-leave-button
              :group="group"
              :userId="currentUser.id"
              :isMember="isGroupMember"
              :isNonePendingMember="isGroupMemberNonePending"
              :disabled="isGroupOwner"
              :loading="$apollo.loading"
              @update="updateJoinLeave"
            />
          </div>
          <hr />
          <div class="ds-mt-small ds-mb-small">
            <!-- group my role in group -->
            <template v-if="isGroupMember">
              <p class="ds-text ds-text-soft ds-text-size-small centered-text hyphenate-text">
                {{ $t('group.role') }}
              </p>
              <div class="chip" align="center">
                <os-badge variant="primary">
                  {{ group && group.myRole ? $t('group.roles.' + group.myRole) : '' }}
                </os-badge>
              </div>
            </template>
            <!-- group type -->
            <p class="ds-text ds-text-soft ds-text-size-small centered-text hyphenate-text">
              {{ $t('group.type') }}
            </p>
            <div class="chip" align="center">
              <os-badge variant="primary">
                {{ group && group.groupType ? $t('group.types.' + group.groupType) : '' }}
              </os-badge>
            </div>
            <!-- group action radius -->
            <p class="ds-text ds-text-soft ds-text-size-small centered-text hyphenate-text">
              {{ $t('group.actionRadius') }}
            </p>
            <div class="chip" align="center">
              <os-badge variant="primary">
                {{
                  group && group.actionRadius ? $t('group.actionRadii.' + group.actionRadius) : ''
                }}
              </os-badge>
            </div>
            <div class="ds-my-x-small"></div>
          </div>
          <!-- group categories -->
          <template
            v-if="categoriesActive && group && group.categories && group.categories.length > 0"
          >
            <hr />
            <div class="ds-mt-small ds-mb-small">
              <p class="ds-text ds-text-soft ds-text-size-small centered-text hyphenate-text">
                {{
                  $t(
                    'group.categories',
                    {},
                    group && group.categories ? group.categories.length : 0,
                  )
                }}
              </p>
              <div class="ds-my-xx-small"></div>
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
                  <div v-if="index < group.categories.length - 1" class="ds-my-xxx-small"></div>
                </div>
              </div>
            </div>
          </template>
          <!-- group goal -->
          <template v-if="group && group.about">
            <hr />
            <div class="ds-mt-small ds-mb-small">
              <p class="ds-text ds-text-soft ds-text-size-small centered-text hyphenate-text">
                {{ $t('group.goal') }}
              </p>
              <div class="ds-my-xx-small"></div>
              <div class="chip" align="center">
                <os-badge>{{ group.about }}</os-badge>
              </div>
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
        <!-- Group members list -->
        <profile-list
          :uniqueName="'groupMembersFilter'"
          :title="$t('group.membersListTitle')"
          :titleNobody="
            !isAllowedSeeingGroupMembers
              ? $t('group.membersListTitleNotAllowedSeeingGroupMembers')
              : null
          "
          :allProfilesCount="
            isAllowedSeeingGroupMembers && group.membersCount ? group.membersCount : 0
          "
          :profiles="isAllowedSeeingGroupMembers ? groupMembers.map((d) => d.user) : []"
          :loading="$apollo.loading"
          @fetchAllProfiles="fetchAllMembers"
        />
        <!-- <social-media :user-name="groupName" :user="user" /> -->
      </div>

      <div class="group-layout__main">
        <!-- Group description -->
        <div class="ds-mb-large">
          <os-card class="group-description">
            <!-- TODO: replace editor content with tiptap render view -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-if="isDescriptionCollapsed"
              class="content hyphenate-text"
              v-html="groupDescriptionExcerpt"
            />
            <content-viewer v-else class="content hyphenate-text" :content="group.description" />
            <os-button
              class="collaps-button"
              variant="primary"
              appearance="ghost"
              size="sm"
              @click="isDescriptionCollapsed = !isDescriptionCollapsed"
            >
              {{ isDescriptionCollapsed ? $t('comment.show.more') : $t('comment.show.less') }}
            </os-button>
          </os-card>
        </div>
        <div v-if="isGroupMemberNonePending" class="ds-mb-large ds-space-centered">
          <os-button
            as="nuxt-link"
            :to="{
              name: 'post-create-type',
              query: { groupId: group.id },
            }"
            class="profile-post-add-button"
            variant="primary"
            appearance="filled"
            circle
            :aria-label="$t('contribution.newPost')"
            v-tooltip="{
              content: $t('contribution.newPost'),
              placement: 'left',
            }"
          >
            <template #icon>
              <os-icon :icon="icons.plus" />
            </template>
          </os-button>
        </div>
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
                :showGroupPinned="true"
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
              <empty margin="xx-large" icon="file" data-test="icon-empty" />
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
  </div>
</template>

<script>
import { OsBadge, OsButton, OsCard, OsIcon, OsNumber, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import uniqBy from 'lodash/uniqBy'
import { profilePagePosts } from '~/graphql/PostQuery'
import { updateGroupMutation, groupQuery, groupMembersQuery } from '~/graphql/groups'
import { muteGroup, unmuteGroup } from '~/graphql/settings/MutedGroups'
import UpdateQuery from '~/components/utils/UpdateQuery'
import postListActions from '~/mixins/postListActions'
import AvatarUploader from '~/components/Uploader/AvatarUploader'
import Category from '~/components/Category'
import ContentViewer from '~/components/Editor/ContentViewer'
import Empty from '~/components/Empty/Empty'
import GroupContentMenu from '~/components/ContentMenu/GroupContentMenu'
import JoinLeaveButton from '~/components/Button/JoinLeaveButton'
import LocationInfo from '~/components/LocationInfo/LocationInfo.vue'
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
    OsBadge,
    OsCard,
    OsButton,
    OsIcon,
    OsNumber,
    OsSpinner,
    AvatarUploader,
    Category,
    ContentViewer,
    Empty,
    GroupContentMenu,
    JoinLeaveButton,
    LocationInfo,
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
      membersCountToLoad: 25,
      updateGroupMutation,
      isDescriptionCollapsed: true,
      group: {},
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
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
  created() {
    this.icons = iconRegistry
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
          orderBy: ['groupPinned_asc', 'sortDate_desc'],
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
    updateJoinLeave() {
      this.$apollo.queries.Group.refetch()
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
          orderBy: ['groupPinned_asc', 'sortDate_desc'],
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
      update({ Group }) {
        this.group = Group && Group[0] ? Group[0] : {}
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
  .group-layout__sidebar .group-profile-content-menu {
    position: absolute;
    top: $space-x-small;
    right: $space-x-small;
  }
}
.group-layout__sidebar,
.group-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-small} {
  .group-layout__sidebar {
    flex: 2 0 0;
  }
  .group-layout__main {
    flex: 3 0 0;
  }
}
@media #{$media-query-medium} {
  .group-layout__sidebar {
    flex: 2 0 0;
  }
  .group-layout__main {
    flex: 5 0 0;
  }
}
@media #{$media-query-large} {
  .group-layout__sidebar {
    flex: 1 0 0;
  }
  .group-layout__main {
    flex: 3 0 0;
  }
}
.profile-post-add-button {
  box-shadow: $box-shadow-x-large;
}
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: $space-x-small;
  margin: $space-small 0;
}
.centered-text {
  text-align: center;
  margin-bottom: $space-xxx-small;
}
.chip {
  margin-bottom: $space-x-small;
}
.group-description.os-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: $space-base !important;

  .content {
    flex-grow: 1;
    margin-bottom: $space-small;
  }
}
.collaps-button {
  align-self: flex-end;
}
</style>

import { faker } from '@faker-js/faker'
import { storiesOf } from '@storybook/vue'
import { OsCard } from '@ocelot-social/ui'
import HcEmpty from '~/components/Empty/Empty'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem'
import PostTeaser from '~/components/PostTeaser/PostTeaser'
import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import GroupTeaser from '~/components/Group/GroupTeaser'
import HcHashtag from '~/components/Hashtag/Hashtag'
import helpers from '~/storybook/helpers'
import { post } from '~/components/PostTeaser/PostTeaser.story.js'
import { user, group } from '~/components/UserAvatar/UserAvatar.story.js'

helpers.init()

const postMock = (fields) => {
  return {
    ...post,
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    deleted: false,
    disabled: false,
    typename: 'Post',
    ...fields,
  }
}

const userMock = (fields) => {
  return {
    ...user,
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    deleted: false,
    disabled: false,
    typename: 'User',
    ...fields,
  }
}

const groupMock = (fields) => {
  return {
    ...group,
    id: faker.string.uuid(),
    disabled: false,
    typename: 'Group',
    ...fields,
  }
}

const posts = [
  postMock(),
  postMock({ author: user }),
  postMock({ title: faker.lorem.sentence() }),
  postMock({ contentExcerpt: faker.lorem.paragraph() }),
  postMock({ author: user }),
  postMock({ title: faker.lorem.sentence() }),
  postMock({ author: user }),
]

const users = [
  userMock(),
  userMock({ slug: 'louie-rider', name: 'Louie Rider' }),
  userMock({ slug: 'louicinda-johnson', name: 'Louicinda Jonhson' }),
  userMock({ slug: 'sam-louie', name: 'Sam Louie' }),
  userMock({ slug: 'loucette', name: 'Loucette Rider' }),
  userMock({ slug: 'louis', name: 'Louis' }),
  userMock({ slug: 'louanna', name: 'Louanna' }),
]

const groups = [
  groupMock(),
  groupMock({ slug: 'louie-book-club', name: 'Louie Book Club' }),
  groupMock({ slug: 'louicinda-choir', name: 'Louicinda Choir' }),
]

storiesOf('TabNavigator', module)
  .addDecorator(helpers.layout)
  .add('given search results of posts, users, groups, hashtags', () => ({
    components: {
      TabNavigation,
      HcEmpty,
      MasonryGrid,
      MasonryGridItem,
      PostTeaser,
      UserAvatar,
      GroupTeaser,
      HcHashtag,
      OsCard,
    },
    store: helpers.store,
    data: () => ({
      posts: posts,
      users: users,
      groups: groups,
      hashtags: [],

      postCount: posts.length,
      userCount: users.length,
      groupCount: groups.length,
      hashtagCount: 0,

      activeTab: 'Post',
    }),
    computed: {
      activeResources() {
        if (this.activeTab === 'Post') return this.posts
        if (this.activeTab === 'User') return this.users
        if (this.activeTab === 'Group') return this.groups
        if (this.activeTab === 'Hashtag') return this.hashtags
        return []
      },
      activeResourceCount() {
        if (this.activeTab === 'Post') return this.postCount
        if (this.activeTab === 'User') return this.userCount
        if (this.activeTab === 'Group') return this.groupCount
        if (this.activeTab === 'Hashtag') return this.hashtagCount
        return 0
      },
      // Mirrors ~/components/_new/features/SearchResults/SearchResults.vue's tabOptions/searchCount —
      // same tab set (Post/User/Group/Hashtag) so the story matches what search actually renders.
      tabOptions() {
        return [
          {
            type: 'Post',
            title: this.$t('search.heading.Post', {}, this.postCount),
            count: this.postCount,
            disabled: this.postCount === 0,
          },
          {
            type: 'User',
            title: this.$t('search.heading.User', {}, this.userCount),
            count: this.userCount,
            disabled: this.userCount === 0,
          },
          {
            type: 'Group',
            title: this.$t('search.heading.Group', {}, this.groupCount),
            count: this.groupCount,
            disabled: this.groupCount === 0,
          },
          {
            type: 'Hashtag',
            title: this.$t('search.heading.Tag', {}, this.hashtagCount),
            count: this.hashtagCount,
            disabled: this.hashtagCount === 0,
          },
        ]
      },
      searchCount() {
        return this.postCount + this.userCount + this.groupCount + this.hashtagCount
      },
    },
    methods: {
      switchTab(tabType) {
        if (this.activeTab !== tabType) {
          this.activeTab = tabType
        }
      },
    },
    template: `
      <div id="search-results" class="search-results">
        <!-- tabs — a sibling of the results grid, not an item inside it (it was previously placed
             inside masonry-grid, where the masonry algorithm treated it as just another brick) -->
        <tab-navigation :tabs="tabOptions" :activeTab="activeTab" @switch-tab="switchTab" />

        <!-- search results -->
        <template v-if="!(!activeResourceCount || searchCount === 0)">
          <!-- posts -->
          <masonry-grid v-if="activeTab === 'Post'">
            <masonry-grid-item
              v-for="post in activeResources"
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
          </masonry-grid>
          <!-- users -->
          <div
            v-if="activeTab === 'User'"
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: var(--space-small); padding-top: var(--space-small);"
          >
            <div v-for="user in activeResources" :key="user.id">
              <os-card>
                <user-avatar :user="user" />
              </os-card>
            </div>
          </div>
          <!-- groups -->
          <div
            v-if="activeTab === 'Group'"
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: var(--space-small); padding-top: var(--space-small);"
          >
            <div v-for="group in activeResources" :key="group.id">
              <group-teaser :group="group" />
            </div>
          </div>
          <!-- hashtags -->
          <div
            v-if="activeTab === 'Hashtag'"
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: var(--space-small); padding-top: var(--space-small);"
          >
            <div v-for="hashtag in activeResources" :key="hashtag.id">
              <os-card>
                <hc-hashtag :id="hashtag.id" />
              </os-card>
            </div>
          </div>
        </template>

        <!-- no results -->
        <div v-else>
          <div class="ds-mb-large ds-space-centered">
            <hc-empty icon="tasks" :message="$t('search.no-results', { search })" />
          </div>
        </div>
      </div>
    `,
  }))

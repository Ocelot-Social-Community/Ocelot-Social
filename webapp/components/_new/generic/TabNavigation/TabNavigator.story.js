import faker from '@faker-js/faker'
import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import Empty from '~/components/Empty/Empty'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem'
import PostTeaser from '~/components/PostTeaser/PostTeaser'
import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import HcHashtag from '~/components/Hashtag/Hashtag'
import helpers from '~/storybook/helpers'
import { post } from '~/components/PostTeaser/PostTeaser.story.js'
import { user } from '~/components/UserTeaser/UserTeaser.story.js'

helpers.init()

const postMock = (fields) => {
  return {
    ...post,
    id: faker.random.uuid(),
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
    id: faker.random.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    deleted: false,
    disabled: false,
    typename: 'User',
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

storiesOf('TabNavigator', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add('given search results of posts, users, hashtags', () => ({
    components: {
      TabNavigation,
      Empty,
      MasonryGrid,
      MasonryGridItem,
      PostTeaser,
      UserTeaser,
      HcHashtag,
    },
    store: helpers.store,
    data: () => ({
      posts: posts,
      users: users,
      hashtags: [],

      postCount: posts.length,
      userCount: users.length,
      hashtagCount: 0,

      activeTab: 'Post',
    }),
    computed: {
      activeResources() {
        if (this.activeTab === 'Post') return this.posts
        if (this.activeTab === 'User') return this.users
        if (this.activeTab === 'Hashtag') return this.hashtags
        return []
      },
      activeResourceCount() {
        if (this.activeTab === 'Post') return this.postCount
        if (this.activeTab === 'User') return this.userCount
        if (this.activeTab === 'Hashtag') return this.hashtagCount
        return 0
      },
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
            type: 'Hashtag',
            title: this.$t('search.heading.Tag', {}, this.hashtagCount),
            count: this.hashtagCount,
            disabled: this.hashtagCount === 0,
          },
        ]
      },
      searchCount() {
        return this.postCount + this.userCount + this.hashtagCount
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
        <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
          <masonry-grid>
            <!-- tabs -->
            <tab-navigation :tabs="tabOptions" :activeTab="activeTab" @switch-tab="switchTab" />

            <!-- search results -->

            <template v-if="!(!activeResourceCount || searchCount === 0)">
              <!-- posts -->
              <template v-if="activeTab === 'Post'">
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
              </template>
              <!-- users -->
              <template v-if="activeTab === 'User'">
                <ds-grid-item v-for="user in activeResources" :key="user.id" :row-span="2">
                  <base-card :wideContent="true">
                    <user-teaser :user="user" />
                  </base-card>
                </ds-grid-item>
              </template>
              <!-- hashtags -->
              <template v-if="activeTab === 'Hashtag'">
                <ds-grid-item v-for="hashtag in activeResources" :key="hashtag.id" :row-span="2">
                  <base-card :wideContent="true">
                    <hc-hashtag :id="hashtag.id" />
                  </base-card>
                </ds-grid-item>
              </template>
            </template>

            <!-- no results -->
            <ds-grid-item v-else :row-span="7" column-span="fullWidth">
              <ds-space centered>
                <empty icon="tasks" :message="$t('search.no-results', { search })" />
              </ds-space>
            </ds-grid-item>
          </masonry-grid>
        </ds-flex-item>
      </div>
    `,
  }))

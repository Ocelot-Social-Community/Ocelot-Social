import { storiesOf } from '@storybook/vue'
import PostTeaser from './PostTeaser.vue'
import helpers, { FIXTURE_AVATAR_URL, FIXTURE_POST_IMAGE_URL } from '~/storybook/helpers'

helpers.init()

export const post = {
  id: 'd23a4265-f5f7-4e17-9f86-85f714b4b9f8',
  title: 'Very nice Post Title',
  contentExcerpt: '<p>My post content</p>',
  createdAt: '2019-06-24T22:08:59.304Z',
  disabled: false,
  deleted: false,
  slug: 'very-nice-post-title',
  image: null,
  author: {
    id: 'u3',
    avatar: helpers.avatarImage(FIXTURE_AVATAR_URL),
    slug: 'jenny-rostock',
    name: 'Rainer Unsinn',
    disabled: false,
    deleted: false,
    contributionsCount: 25,
    shoutedCount: 5,
    commentedCount: 39,
    followedByCount: 2,
    clickedCount: 42,
    followedByCurrentUser: true,
    location: null,
    badges: [
      {
        id: 'b4',
        key: 'trophy_bear',
        icon: '/img/badges/trophy_blue_bear.svg',
        __typename: 'Badge',
      },
    ],
    __typename: 'User',
  },
  commentsCount: 12,
  categories: [],
  postType: ['Article'],
  shoutedCount: 421,
  viewedTeaserCount: 1584,
  __typename: 'Post',
}

storiesOf('PostTeaser', module)
  .addDecorator(helpers.layout)
  .add('without image', () => ({
    components: { PostTeaser },
    store: helpers.store,
    data: () => ({
      post,
    }),
    template: `
      <post-teaser
        :post="post"
        :width="{ base: '100%', xs: '100%', md: '50%', xl: '33%' }"
      />
    `,
  }))
  .add('with image', () => ({
    components: { PostTeaser },
    store: helpers.store,
    data: () => ({
      post: {
        ...post,
        // Same shape as a real Post.image (srcset breakpoints), but every breakpoint points at the
        // one committed local file — see helpers.avatarImage for why a remote url does not belong
        // in a story the visual regression suite screenshots.
        image: helpers.responsiveImage(FIXTURE_POST_IMAGE_URL),
      },
    }),
    template: `
      <post-teaser
        :post="post"
        :width="{ base: '100%', xs: '100%', md: '50%', xl: '33%' }"
      />
    `,
  }))
  .add('pinned by admin', () => ({
    components: { PostTeaser },
    store: helpers.store,
    data: () => ({
      post: {
        ...post,
        pinned: true,
      },
    }),
    template: `
      <post-teaser
        :post="post"
        :width="{ base: '100%', xs: '100%', md: '50%', xl: '33%' }"
      />
    `,
  }))

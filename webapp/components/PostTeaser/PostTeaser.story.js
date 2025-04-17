import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import PostTeaser from './PostTeaser.vue'
import helpers from '~/storybook/helpers'

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
    avatar: {
      url: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/db/dbc9e03ebcc384b920c31542af2d27dd8eea9dc2_full.jpg',
    },
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
        key: 'badge_bear',
        icon: '/img/badges/indiegogo_en_bear.svg',
        __typename: 'Badge',
      },
    ],
    __typename: 'User',
  },
  commentsCount: 12,
  categories: [],
  shoutedCount: 421,
  viewedTeaserCount: 1584,
  __typename: 'Post',
}

storiesOf('PostTeaser', module)
  .addDecorator(withA11y)
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
        image: 'https://unsplash.com/photos/R4y_E5ZQDPg/download',
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

import { storiesOf } from '@storybook/vue'
import UserAvatar from '~/components/UserAvatar/UserAvatar.vue'
import helpers from '~/storybook/helpers'

helpers.init()

export const user = {
  id: 'u6',
  slug: 'louie',
  name: 'Louie',
  avatar: helpers.avatarImage('https://s3.amazonaws.com/uifaces/faces/twitter/designervzm/128.jpg'),
  about:
    'Illum in et velit soluta voluptatem architecto consequuntur enim placeat. Eum excepturi est ratione rerum in voluptatum corporis. Illum consequatur minus. Modi incidunt velit.',
  disabled: false,
  deleted: false,
  locationName: null,
  location: null,
  createdAt: '2019-09-18T14:16:01.695Z',
  badges: [],
  badgesCount: 0,
  shoutedCount: 1,
  commentedCount: 2,
  contributionsCount: 5,
  followingCount: 1,
  following: [
    {
      id: 'u3',
      slug: 'jenny-rostock',
      name: 'Jenny Rostock',
      avatar: helpers.avatarImage(
        'https://s3.amazonaws.com/uifaces/faces/twitter/bowbrick/128.jpg',
      ),
      disabled: false,
      deleted: false,
      followedByCount: 2,
      followedByCurrentUser: false,
      contributionsCount: 1,
      commentedCount: 3,
      badges: [
        {
          id: 'trophy_bear',
          icon: '/img/badges/trophy_blue_bear.svg',
        },
      ],
      location: {
        name: 'Paris',
      },
    },
  ],
  followedByCount: 0,
  followedByCurrentUser: false,
  isMuted: false,
  followedBy: [],
  socialMedia: [],
}
export const group = {
  id: 'g2',
  name: 'Yoga Practice',
  slug: 'yoga-practice',
  about: null,
  description: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p class="">And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p class="">The important thing is:</p><ul><li><p>Use the exercises (consciously) for your personal development.</p></li></ul>`,
  descriptionExcerpt: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p>And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p>The important thing is:</p><ul><li><p>Use the exercises …</p></li></ul>`,
  groupType: 'public',
  actionRadius: 'interplanetary',
  categories: [
    {
      id: 'cat4',
      icon: 'psyche',
      name: 'psyche',
      slug: 'psyche',
      description: 'Seele, Gefühle, Glück',
    },
    {
      id: 'cat5',
      icon: 'movement',
      name: 'body-and-excercise',
      slug: 'body-and-excercise',
      description: 'Sport, Yoga, Massage, Tanzen, Entspannung',
    },
    {
      id: 'cat17',
      icon: 'spirituality',
      name: 'spirituality',
      slug: 'spirituality',
      description: 'Religion, Werte, Ethik',
    },
  ],
  locationName: null,
  location: null,
}

storiesOf('UserAvatar', module)
  .addDecorator(helpers.layout)
  .add('user only', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user,
    }),
    template: '<user-avatar :user="user" :show-slug="true" />',
  }))
  .add('with date', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user,
    }),
    template: '<user-avatar :user="user" :show-slug="true" :date-time="new Date()" />',
  }))
  .add('has edited something', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user,
    }),
    template: `
    <user-avatar :user="user" :show-slug="true" :date-time="new Date()">
      <template #dateTime>
        - HEY! I'm edited
      </template>
    </user-avatar>
    `,
  }))
  .add('anonymous', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user: null,
    }),
    template: '<user-avatar :user="user" :show-slug="true" :date-time="new Date()" />',
  }))
  .add('with group and date', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user,
      group,
    }),
    template:
      '<user-avatar :user="user" :show-slug="true" :group="group" :date-time="new Date()" />',
  }))
  .add('with group and date – wide', () => ({
    components: { UserAvatar },
    store: helpers.store,
    data: () => ({
      user,
      group,
    }),
    template:
      '<user-avatar :user="user" :show-slug="true" :group="group" wide :date-time="new Date()" />',
  }))

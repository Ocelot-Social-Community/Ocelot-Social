import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import StoryRouter from 'storybook-vue-router'
import UserAvatar from '~/components/_new/generic/UserAvatar/UserAvatar'
import helpers from '~/storybook/helpers'
import { user } from '~/components/UserTeaser/UserTeaser.story.js'
import imageFile from './storybook/critical-avatar-white-background.png'

helpers.init()
const anonymousUser = {
  ...user,
  name: 'Anonymous',
  avatar: null,
}
const userWithoutAvatar = {
  ...user,
  name: 'Ana Paula Nunes Marques',
  avatar: null,
}
const userWithAvatar = {
  ...user,
  name: 'Jochen Image',
  avatar: { url: imageFile },
}
storiesOf('UserAvatar', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .addDecorator(StoryRouter())
  .add('normal, with image', () => ({
    components: { UserAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<user-avatar :user="user" />',
  }))
  .add('normal without image, anonymous user', () => ({
    components: { UserAvatar },
    data: () => ({
      user: anonymousUser,
    }),
    template: '<user-avatar :user="user" />',
  }))
  .add('normal without image, user initials', () => ({
    components: { UserAvatar },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<user-avatar :user="user" />',
  }))
  .add('small, with image', () => ({
    components: { UserAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<user-avatar :user="user" size="small"/>',
  }))
  .add('small', () => ({
    components: { UserAvatar },
    data: () => ({
      user,
    }),
    template: '<user-avatar :user="user" size="small"/>',
  }))
  .add('large, with image', () => ({
    components: { UserAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<user-avatar :user="user" size="large"/>',
  }))
  .add('large', () => ({
    components: { UserAvatar },
    data: () => ({
      user,
    }),
    template: '<user-avatar :user="user" size="large"/>',
  }))

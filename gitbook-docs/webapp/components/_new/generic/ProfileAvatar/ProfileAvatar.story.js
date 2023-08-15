import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import StoryRouter from 'storybook-vue-router'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
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
storiesOf('ProfileAvatar', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .addDecorator(StoryRouter())
  .add('normal, with image', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('normal without image, anonymous user', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: anonymousUser,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('normal without image, user initials', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('small, with image', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" size="small"/>',
  }))
  .add('small', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" size="small"/>',
  }))
  .add('large, with image', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" size="large"/>',
  }))
  .add('large', () => ({
    components: { ProfileAvatar },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" size="large"/>',
  }))

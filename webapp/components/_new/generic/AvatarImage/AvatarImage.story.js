import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import StoryRouter from 'storybook-vue-router'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import helpers from '~/storybook/helpers'
import { user } from '~/components/UserAvatar/UserAvatar.story.js'
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
storiesOf('AvatarImage', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .addDecorator(StoryRouter())
  .add('normal, with image', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('normal without image, anonymous user', () => ({
    components: { AvatarImage },
    data: () => ({
      user: anonymousUser,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('normal without image, user initials', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" />',
  }))
  .add('small, with image', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" size="small"/>',
  }))
  .add('small', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" size="small"/>',
  }))
  .add('large, with image', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithAvatar,
    }),
    template: '<profile-avatar :profile="user" size="large"/>',
  }))
  .add('large', () => ({
    components: { AvatarImage },
    data: () => ({
      user: userWithoutAvatar,
    }),
    template: '<profile-avatar :profile="user" size="large"/>',
  }))

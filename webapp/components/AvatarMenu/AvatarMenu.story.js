import { storiesOf } from '@storybook/vue'
import StoryRouter from '~/storybook/storyRouter'
import AvatarMenu from '~/components/AvatarMenu/AvatarMenu'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('AvatarMenu', module)
  .addDecorator(helpers.layout)
  .addDecorator(StoryRouter())
  .add('dropdown', () => ({
    components: { AvatarMenu },
    store: helpers.store,
    template: '<avatar-menu placement="top" />',
  }))

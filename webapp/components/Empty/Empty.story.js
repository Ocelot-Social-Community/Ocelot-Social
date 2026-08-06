import { storiesOf } from '@storybook/vue'
import HcEmpty from '~/components/Empty/Empty'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('Empty', module)
  .addDecorator(helpers.layout)
  // Possible icons include 'messages', 'events', 'alert', 'tasks', 'docs', and 'file'
  .add('tasks icon with message', () => ({
    components: { HcEmpty },
    template: '<hc-empty icon="tasks" message="Sorry, there are no ... available." />',
  }))
  .add('default icon, no message', () => ({
    components: { HcEmpty },
    template: '<hc-empty />',
  }))

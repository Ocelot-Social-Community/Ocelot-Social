import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import Empty from '~/components/Empty/Empty'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('Empty', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add(
    'tasks icon with message',
    () => ({
      components: { Empty },
      template: '<empty icon="tasks" message="Sorry, there are no ... available." />',
    }),
    {
      notes: "Possible icons include 'messages', 'events', 'alert', 'tasks', 'docs', and 'file'",
    },
  )
  .add('default icon, no message', () => ({
    components: { Empty },
    template: '<empty />',
  }))

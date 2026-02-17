import { storiesOf } from '@storybook/vue'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import helpers from '~/storybook/helpers'
import LabeledButton from './LabeledButton.vue'

helpers.init()

storiesOf('Generic/LabeledButton', module)
  .addDecorator(helpers.layout)
  .add('default', () => ({
    components: { LabeledButton },
    data: () => ({
      filled: false,
      icons: ocelotIcons,
    }),
    template: `
      <labeled-button
        :icon="icons.check"
        :filled="filled"
        label="Toggle Me!!"
        @click="filled = !filled"
      />
    `,
  }))

import { storiesOf } from '@storybook/vue'
import { iconRegistry } from '~/utils/iconRegistry'
import helpers from '~/storybook/helpers'
import LabeledButton from './LabeledButton.vue'

helpers.init()

storiesOf('Generic/LabeledButton', module)
  .addDecorator(helpers.layout)
  .add('default', () => ({
    components: { LabeledButton },
    data: () => ({
      filled: false,
      icons: iconRegistry,
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

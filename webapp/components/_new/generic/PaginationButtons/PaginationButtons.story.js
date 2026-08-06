import { storiesOf } from '@storybook/vue'
import { action } from '@storybook/addon-actions'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('PaginationButtons', module)
  .addDecorator(helpers.layout)
  .add('basic pagination', () => ({
    components: { PaginationButtons },
    data: () => ({
      hasNext: true,
      hasPrevious: false,
    }),
    methods: {
      back: action('back'),
      next: action('next'),
    },
    template: `<pagination-buttons
                :hasNext="hasNext"
                :hasPrevious="hasPrevious"
                @back="back"
                @next="next"
              />`,
  }))

import { storiesOf } from '@storybook/vue'
import Hashtag from './Hashtag.vue'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('Hashtag', module)
  .addDecorator(helpers.layout)
  .add('clickable', () => ({
    components: { Hashtag },
    store: helpers.store,
    data: () => ({
      hashtag: 'SomeHashtag',
    }),
    template: '<hashtag :id="hashtag" />',
  }))

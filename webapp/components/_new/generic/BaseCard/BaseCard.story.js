import { storiesOf } from '@storybook/vue'
import helpers from '~/storybook/helpers'
import logos from '~/constants/logos.js'
import BaseCard from './BaseCard.vue'

storiesOf('Generic/BaseCard', module)
  .addDecorator(helpers.layout)

  .add('default', () => ({
    components: { BaseCard },
    template: `
      <base-card>
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
      </base-card>
    `,
  }))

  .add('with slot: hero image', () => ({
    components: { BaseCard },
    template: `
      <base-card style="width: 400px;">
        <template #heroImage>
          <img class="image" src="https://unsplash.com/photos/R4y_E5ZQDPg/download" />
        </template>
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
      </base-card>
    `,
  }))

  .add('with slot: image column', () => ({
    components: { BaseCard },
    template: `
      <base-card style="width: 600px;">
        <template #imageColumn>
          <img class="image" alt="Example image" src="${logos.LOGO_WELCOME_PATH}" />
        </template>
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
      </base-card>
    `,
  }))

  .add('with slot: topMenu', () => ({
    components: { BaseCard },
    template: `
      <base-card style="width: 600px;">
        <template #imageColumn>
          <img class="image" alt="Example image" src="${logos.LOGO_WELCOME_PATH}" />
        </template>
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
        <template #topMenu>
          <base-button size="small">Menu</base-button>
        </template>
      </base-card>
    `,
  }))

  .add('with highlight prop', () => ({
    components: { BaseCard },
    template: `
      <base-card highlight style="width: 400px;">
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
      </base-card>
    `,
  }))

  .add('with wideContent prop', () => ({
    components: { BaseCard },
    template: `
      <base-card wideContent style="width: 400px;">
        <h2 class="title">I am a card heading</h2>
        <p>And I am a paragraph.</p>
      </base-card>
    `,
  }))

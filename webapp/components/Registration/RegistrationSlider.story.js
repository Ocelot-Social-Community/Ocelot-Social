import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import RegistrationSlider from './RegistrationSlider.vue'
import helpers from '~/storybook/helpers'

helpers.init()

storiesOf('RegistrationSlider', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add('invite-code empty', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      // Wolle searchResults,
    }),
    template: `
      <registration-slider registrationType="invite-code" />
    `,
  }))
  .add('invite-code with data', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: 'IN1T6Y',
          email: 'wolle.huss@pjannto.com',
          nonce: 'NTRSCZ',
          name: 'Wolle',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          about: `Hey`,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: true,
          dataPrivacy: true,
          minimumAge: true,
          noCommercial: true,
          noPolitical: true,
          locale: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-code" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('public-registration', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      // Wolle searchResults,
    }),
    template: `
      <registration-slider registrationType="public-registration" />
    `,
  }))
  .add('invite-mail', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      // Wolle searchResults,
    }),
    template: `
      <registration-slider registrationType="invite-mail" />
    `,
  }))

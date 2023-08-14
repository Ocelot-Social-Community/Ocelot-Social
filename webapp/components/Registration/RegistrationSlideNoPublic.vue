<template>
  <ds-space centered>
    <empty icon="events" :message="$t('components.registration.signup.unavailable')" />
    <slot></slot>
    <ds-space margin="xxx-small" />
  </ds-space>
</template>

<script>
import Empty from '~/components/Empty/Empty'

export default {
  name: 'RegistrationSlideNoPublic',
  components: {
    Empty,
  },
  props: {
    sliderData: { type: Object, required: true },
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered

      this.sliderData.setSliderValuesCallback(true, {
        sliderSettings: { buttonSliderCallback: this.onNextClick },
      })
    })
  },
  methods: {
    onNextClick() {
      this.$router.history.push('/login')
      return true
    },
  },
}
</script>

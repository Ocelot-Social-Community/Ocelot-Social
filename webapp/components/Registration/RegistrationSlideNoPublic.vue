<template>
  <ds-space centered>
    <hc-empty icon="events" :message="$t('components.registration.signup.unavailable')" />
    <slot></slot>
    <ds-space margin="xxx-small" />
  </ds-space>
</template>

<script>
import HcEmpty from '~/components/Empty/Empty'

export default {
  name: 'RegistrationSlideNoPublic',
  components: {
    HcEmpty,
  },
  props: {
    sliderData: { type: Object, required: true },
  },
  mounted: function () {
    this.sliderData.setSliderValuesCallback(true, {
      sliderSettings: { buttonSliderCallback: this.onNextClick },
    })
  },
  methods: {
    onNextClick() {
      this.$router.push('/login')
      return true
    },
  },
}
</script>

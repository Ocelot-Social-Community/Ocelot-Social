<template>
  <div class="Slider">
    <!-- <h2 class="subTitle">{{ $t('login.login') + ' XXX' }}</h2> -->
    <slot :name="sliderData.activeSliderName" />
    <base-button
      style="float: right"
      icon="check"
      type="submit"
      filled
      :loading="false"
      :disabled="sliderData.button.disabled"
      @click="sliderData.button.callback"
    >
      {{ sliderData.button.title }}
    </base-button>
  </div>
</template>

<script>
export default {
  name: 'ComponentSlider',
  props: {
    sliderData: { type: Object, required: true },
  },
}
</script>

<style lang="scss">
// Wolle .pointer {
//    cursor: pointer;
//  }
</style>

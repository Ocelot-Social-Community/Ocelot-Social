<template>
  <div class="Slider">
    <!-- <h2 class="subTitle">{{ $t('login.login') + ' XXX' }}</h2> -->
    <slot :name="sliderData.activeSliderName" />
    <ds-flex>
      <ds-flex-item>
        <div
          v-for="componentName in sliderData.sliders"
          :key="componentName"
          class="selection-button"
        >
          <base-button
            style="float: left"
            :circle="true"
            size="small"
            type="submit"
            filled
            :loading="false"
            :disabled="false"
            @click="sliderData.button.callback"
          />
        </div>
      </ds-flex-item>
      <ds-flex-item>
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
      </ds-flex-item>
    </ds-flex>
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

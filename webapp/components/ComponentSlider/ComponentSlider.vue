<template>
  <div class="Slider">
    <!-- <h2 class="subTitle">{{ $t('login.login') + ' XXX' }}</h2> -->
    <div
      v-for="sliderName in sliders"
      :key="sliderName"
      :class="[
        'Slider__component',
        activeSliderName === sliderName && '--visible',
        activeSliderName !== sliderName && '--hidden',
      ]"
      :data-test="sliderName + '-component'"
      @validation="validation(sliderName)"
    >
      <slot :name="sliderName" />
    </div>
    <base-button
      style="float: right"
      icon="check"
      type="submit"
      filled
      :loading="false"
      :disabled="disabled"
      @click="nextComponent"
    >
      <!-- {{ $t('actions.save') }} -->
      <!-- Wolle {{ $t('components.enter-nonce.form.next') }} -->
      Next
    </base-button>
  </div>
</template>

<script>
export default {
  name: 'ComponentSlider',
  components: {
    // Wolle LocaleSwitch,
  },
  props: {
    sliders: { type: Array, required: true },
  },
  data() {
    return {
      sliderIndex: 0,
      activeSliderName: this.sliders[0],
      disabled: true,
    }
  },
  computed: {
    // Wolle isActive() {
    //   return !isEmpty(this.previousSearchTerm)
    // },
  },
  methods: {
    validation(sliderName) {
      console.log('validation !!!')
      disabled = false
    },
    nextComponent() {
      if (this.sliderIndex < this.sliders.length - 1) {
        this.sliderIndex++
        this.activeSliderName = this.sliders[this.sliderIndex]
      }
    },
  },
}
</script>

<style lang="scss">
// Wolle .pointer {
//    cursor: pointer;
//  }

.Slider {
  &__component {
    // Wolle &:hover {
    //   border-bottom: 2px solid #c9c6ce;
    // }

    // Wolle &.--visible {
    // }
    &.--hidden {
      display: none;
    }
  }
}
</style>

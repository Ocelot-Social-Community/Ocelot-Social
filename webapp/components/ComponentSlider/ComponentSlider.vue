<template>
  <div class="Sliders">
    <slot :name="'header'" />

    <ds-heading v-if="sliderData.sliders[sliderIndex].title" size="h3">
      {{ sliderData.sliders[sliderIndex].title }}
    </ds-heading>

    <slot :name="sliderData.sliders[sliderIndex].name" />

    <ds-flex>
      <ds-flex-item :centered="true">
        <div
          v-for="(slider, index) in sliderData.sliders"
          :key="slider.name"
          :class="['Sliders__slider-selection', index < sliderIndex && '--confirmed']"
        >
          <base-button
            :class="['selection-dot']"
            style="float: left"
            :circle="true"
            size="small"
            type="submit"
            filled
            :loading="false"
            :disabled="index > sliderIndex"
            @click="sliderData.sliderSelectorCallback(index)"
          />
        </div>
      </ds-flex-item>
      <ds-flex-item>
        <base-button
          style="float: right"
          :icon="sliderData.sliders[sliderIndex].button.icon"
          type="submit"
          filled
          :loading="false"
          :disabled="!sliderData.sliders[sliderIndex].validated"
          @click="onClick"
        >
          {{ sliderData.sliders[sliderIndex].button.title }}
        </base-button>
      </ds-flex-item>
    </ds-flex>

    <slot :name="'footer'" />
  </div>
</template>

<script>
export default {
  name: 'ComponentSlider',
  props: {
    sliderData: { type: Object, required: true },
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex // have a shorter notation
    },
  },
  methods: {
    async onClick() {
      let success = true
      if (this.sliderData.sliders[this.sliderIndex].button.slotOnNextClick) {
        success = await this.sliderData.sliders[this.sliderIndex].button.slotOnNextClick()
      }
      // this.sliderData.sliders[this.sliderIndex].button.callback()
      if (success && this.sliderIndex < this.sliderData.sliders.length - 1) {
        this.sliderData.sliderSelectorCallback(this.sliderIndex + 1)
      }
    },
  },
}
</script>

<style lang="scss">
.Sliders {
  &__slider-selection {
    .selection-dot {
      margin-right: 2px;
    }
    &.--confirmed {
      opacity: $opacity-disabled;
    }
  }
}
</style>

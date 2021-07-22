<template>
  <div class="Sliders">
    <slot :name="'header'" />

    <ds-heading
      v-if="
        sliderData.sliders[sliderIndex].titleIdent &&
        ((typeof sliderData.sliders[sliderIndex].titleIdent === 'string' &&
          $t(sliderData.sliders[sliderIndex].titleIdent).length > 0) ||
          (typeof sliderData.sliders[sliderIndex].titleIdent === 'object' &&
            $t(
              sliderData.sliders[sliderIndex].titleIdent.id,
              sliderData.sliders[sliderIndex].titleIdent.data,
            ).length > 0))
      "
      size="h3"
    >
      {{
        (typeof sliderData.sliders[sliderIndex].titleIdent === 'string' &&
          $t(sliderData.sliders[sliderIndex].titleIdent)) ||
        (typeof sliderData.sliders[sliderIndex].titleIdent === 'object' &&
          $t(
            sliderData.sliders[sliderIndex].titleIdent.id,
            sliderData.sliders[sliderIndex].titleIdent.data,
          ))
      }}
    </ds-heading>

    <slot :name="sliderData.sliders[sliderIndex].name" />

    <ds-flex>
      <ds-flex-item v-if="multipleSliders" :centered="true">
        <div
          v-for="(slider, index) in sliderData.sliders"
          :key="slider.name"
          :class="['Sliders__slider-selection', index === sliderIndex && '--unconfirmed']"
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
          :style="multipleSliders && 'float: right'"
          :icon="sliderData.sliders[sliderIndex].button.icon"
          type="submit"
          filled
          :loading="
            sliderData.sliders[sliderIndex].button.loading !== undefined
              ? sliderData.sliders[sliderIndex].button.loading
              : false
          "
          :disabled="!sliderData.sliders[sliderIndex].validated"
          @click="onNextClick"
          data-test="next-button"
        >
          {{ $t(sliderData.sliders[sliderIndex].button.titleIdent) }}
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
      return this.sliderData.sliderIndex // to have a shorter notation
    },
    multipleSliders() {
      return this.sliderData.sliders.length > 1
    },
  },
  methods: {
    async onNextClick() {
      let success = true
      if (this.sliderData.sliders[this.sliderIndex].button.sliderCallback) {
        success = await this.sliderData.sliders[this.sliderIndex].button.sliderCallback()
      }
      success = success && this.sliderData.sliders[this.sliderIndex].button.callback(success)
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
    &.--unconfirmed {
      opacity: $opacity-disabled;
    }
  }
}
</style>

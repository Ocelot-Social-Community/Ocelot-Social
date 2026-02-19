<template>
  <div class="Sliders">
    <slot :name="'header'" />

    <h1
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
      class="ds-heading ds-heading-h3"
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
    </h1>

    <slot :name="sliderData.sliders[sliderIndex].name" />

    <div class="ds-flex">
      <div v-if="multipleSliders" class="ds-flex-item" style="align-self: center">
        <div
          v-for="(slider, index) in sliderData.sliders"
          :key="slider.name"
          :class="['Sliders__slider-selection', index === sliderIndex && '--unconfirmed']"
        >
          <os-button
            :class="['selection-dot']"
            style="float: left"
            variant="primary"
            :appearance="index <= sliderIndex ? 'filled' : 'outline'"
            circle
            size="sm"
            :disabled="index > sliderIndex"
            :aria-label="
              $t('component-slider.step', { current: index + 1, total: sliderData.sliders.length })
            "
            @click="sliderData.sliderSelectorCallback(index)"
          />
        </div>
      </div>
      <div class="ds-flex-item">
        <os-button
          :style="multipleSliders && 'float: right'"
          variant="primary"
          appearance="filled"
          :loading="
            sliderData.sliders[sliderIndex].button.loading !== undefined
              ? sliderData.sliders[sliderIndex].button.loading
              : false
          "
          :disabled="!sliderData.sliders[sliderIndex].validated"
          @click="onNextClick"
          data-test="next-button"
        >
          <template v-if="sliderData.sliders[sliderIndex].button.icon" #icon>
            <os-icon :icon="sliderData.sliders[sliderIndex].button.icon" />
          </template>
          {{ $t(sliderData.sliders[sliderIndex].button.titleIdent) }}
        </os-button>
      </div>
    </div>

    <slot :name="'footer'" />
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'

export default {
  components: { OsButton, OsIcon },
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
      height: 18px !important;
      width: 18px !important;
      min-height: 18px !important;
      min-width: 18px !important;
    }
    &.--unconfirmed {
      opacity: $opacity-disabled;
    }
  }
}
</style>

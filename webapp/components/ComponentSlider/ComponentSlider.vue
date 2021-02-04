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
          @click="sliderData.sliders[sliderIndex].button.callback"
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
    // Wolle sliderIndexByName(name) {
    //   return this.sliderData.sliders.findIndex((slider) => slider.name === name)
    // },
  },
}
</script>

<style lang="scss">
.Sliders {
  // Wolle position: relative;
  // background-color: #fff;
  // height: 100%;
  // display: flex;
  // margin: 0;
  // padding: 0;
  // list-style: none;
  // .selection-dot {
  //   margin-right: 5px;
  //   // &:hover {
  //   //   border-bottom: none;
  //   // }
  // }

  &__slider-selection {
    // padding-top: 5px;
    // margin-right: 5px;

    // text-align: center;
    // height: 100%;
    // flex-grow: 1;

    // &:hover {
    //   border-bottom: 2px solid #c9c6ce;
    // }

    .selection-dot {
      margin-right: 2px;
    }
    // &.--active {
    //   border-bottom: 2px solid #17b53f;
    // }
    &.--confirmed {
      opacity: $opacity-disabled;
      // &:hover {
      //   border-bottom: none;
      // }
    }
  }
}
</style>

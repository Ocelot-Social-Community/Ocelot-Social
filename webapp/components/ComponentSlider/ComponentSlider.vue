<template>
  <div class="Sliders">
    <!-- <h2 class="subTitle">{{ $t('login.login') + ' XXX' }}</h2> -->
    <slot :name="sliderData.activeSliderName" />
    <ds-flex>
      <ds-flex-item>
        <div
          v-for="componentName in sliderData.sliders"
          :key="componentName"
          class="selection-button"
          :class="[
            'Sliders__component-selection',
          ]"
        >
          <base-button
            style="float: left"
            :circle="true"
            size="small"
            type="submit"
            filled
            :loading="false"
            :disabled="sliderIndexByName(componentName) >= sliderIndex"
            @click="sliderData.sliderSelectorCallback(componentName)"
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
  computed: {
    sliderIndex() {
      return this.sliderIndexByName(this.sliderData.activeSliderName)
    },
  },
  methods: {
    sliderIndexByName(name) {
      return this.sliderData.sliders.findIndex((sliderName) => sliderName === name)
    },
  },
}
</script>

<style lang="scss">
// Wolle .pointer {
//    cursor: pointer;
//  }

.Sliders {
  // Wolle position: relative;
  // background-color: #fff;
  // height: 100%;
  // display: flex;
  // margin: 0;
  // padding: 0;
  // list-style: none;

  &__component-selection {
    padding-right: 10px;

    // text-align: center;
    // height: 100%;
    // flex-grow: 1;

    // &:hover {
    //   border-bottom: 2px solid #c9c6ce;
    // }

    // &.--active {
    //   border-bottom: 2px solid #17b53f;
    // }
    // &.--disabled {
    //   opacity: $opacity-disabled;
    //   &:hover {
    //     border-bottom: none;
    //   }
    // }
  }
}
</style>

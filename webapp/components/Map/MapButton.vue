<template>
  <div>
    <nuxt-link to="/map">
      <base-button class="map-button" circle ghost>
        <base-icon name="globe-detailed" size="large" />
      </base-button>
      <!-- <img
        class="map-icon"
        src="/img/svg/map/map-globe.svg"
        :style="'width: 34px;'"
        v-tooltip="{
          content: $t('map.button.tooltip'),
          placement: 'bottom-start',
        }"
      /> -->
      <!-- <mapGlobeSVG
        class="map-icon"
        aria-hidden="true"
        focusable="false"
        v-tooltip="{
          content: $t('map.button.tooltip'),
          placement: 'bottom-start',
        }"
      /> -->
    </nuxt-link>
  </div>
</template>

<script>
// import mapGlobeSVG from '/img/svg/map/map-globe.svg'

export default {
  // components: {
  //   mapGlobeSVG,
  // },
  // data() {
  //   return {
  //     globe,
  //   }
  // },
}
</script>

<style lang="scss">
// Wolle: .map-button {
//   // position: relative;
//   // height: $size-avatar-large;
//   // width: $size-avatar-large;
//   // overflow: hidden;
//   display: inline-flex;
//   justify-content: center;
//   align-items: center;

//   // &.--small {
//   //   width: $size-avatar-small;
//   //   height: $size-avatar-small;
//   // }

//   // &.--large {
//   //   width: $size-avatar-large;
//   //   height: $size-avatar-large;
//   // }

//   >.base-icon {
//     // position: absolute;
//     // top: 50%;
//     // left: 50%;
//     // top: 150%;
//     // left: 150%;
//     // width: 90px;
//     // height: 90px;
//     // transform: translate(-50%, -50%);
//     height: auto;
//   }
// }
// .base-icon {
//   // display: inline-flex;
//   // vertical-align: bottom;

//   > .svg {
//     height: 2.2em;
//     // fill: currentColor;
//   }
// }
// .map-icon {
//   margin-left: 4px;
//   margin-right: 4px;
//   margin-top: 2px;
//   color: red !important;
//   // color: $color-locale-menu;
//   // fill: $color-locale-menu;
//   // fill: currentColor !important;
//   // stroke: currentColor !important;
//   // fill: currentColor;
//   // stroke: currentColor;
//   fill: red !important;
//   stroke: red !important;
// }
// svg path {
//   fill: red !important;
//   stroke: red !important;
// }

.map-button {
  margin-left: 4px;
  margin-right: 4px;
}
</style>

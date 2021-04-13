<template>
  <div class="progress-bar-component">
    <!-- <h4 v-if="title" class="progress-bar__title">{{ title }}</h4> -->
    <!-- <ds-flex :width="{ base: '300px' }"> -->
    <!-- <ds-flex > -->
    <!-- <ds-flex-item :width="{ base: '152px' }"> -->
    <!-- <ds-flex-item> -->
    <div class="progress-bar">
      <div class="progress-bar__goal"></div>
      <div class="progress-bar__progress" :style="progressBarWidth"></div>
    </div>
    <!-- </ds-flex-item> -->
    <!-- <ds-flex-item :width="{ base: '100px' }"> -->
    <!-- <ds-flex-item> -->
    <div class="progress-bar-button">
      <slot />
    </div>
    <!-- </ds-flex-item> -->
    <!-- </ds-flex> -->
    <!-- <span v-if="label" class="progress-bar__label">{{ label }}</span> -->
  </div>
</template>

<script>
export default {
  props: {
    goal: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
    },
    progress: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
  },
  computed: {
    progressBarWidth() {
      return `width: ${(this.progress / this.goal) * 100}%;`
    },
  },
}
</script>

<style lang="scss">
.progress-bar-component {
  height: 100%;
  // width: 150px;
  // width: 100%;
  // flex: 0 0 100%;
  // align-self: stretch;
  flex: 1;
  display: flex;
  // margin-right: $space-x-small;

  // @media (max-width: 680px) {
  //   width: 180px;
  // }

  // @media (max-width: 546px) {
  //   flex-basis: 50%;
  //   flex-grow: 1;
  // }
}

.progress-bar {
  position: relative;
  height: 100%;
  // width: 150px;
  // width: 100%;
  // flex: 0 0 100%;
  // align-self: stretch;
  flex: 1;
  margin-right: $space-x-small;

  // @media (max-width: 680px) {
  //   width: 180px;
  // }

  // @media (max-width: 546px) {
  //   flex-basis: 50%;
  //   flex-grow: 1;
  // }
}

.progress-bar__title {
  // Wolle
  // position: absolute;
  // top: -2px;
  margin-left: $space-xxx-small;
  // margin: 0;

  @media (max-width: 546px) {
    top: $space-xx-small;
  }

  @media (max-width: 350px) {
    font-size: $font-size-small;
  }
}

.progress-bar__goal {
  position: relative;
  bottom: 0;
  left: 0;
  height: 36px; // styleguide-button-size
  // width: 100%;
  background-color: $color-neutral-100;
  border-radius: $border-radius-base;
}

.progress-bar__progress {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 36px; // styleguide-button-size
  max-width: 100%;
  background-color: $color-yellow;
  border-radius: $border-radius-base;
}

.progress-bar__label {
  // Wolle
  // position: absolute;
  // top: 50px;
  margin-left: $space-xxx-small;

  @media (max-width: 350px) {
    font-size: $font-size-small;
  }
}

.progress-bar-button {
  // justify-content: flex-end;
  float: right;
}
</style>

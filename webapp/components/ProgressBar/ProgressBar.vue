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
      <div class="progress-bar__border" style="width: 100%">
        <span v-if="label" class="progress-bar__label">{{ label }}</span>
      </div>
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
    progress: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
    label: {
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
  position: relative;
  // width: 150px;
  // width: 100%;
  // flex: 0 0 100%;
  // align-self: stretch;
  flex: 1;
  display: flex;
  top: $space-xx-small;
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
  height: 26px; // styleguide-button-size
  // Wolle width: 100%;
  border: 1px solid $color-primary;
  // Wolle background-color: $color-neutral-100;
  // background-color: $color-neutral-70;
  background: repeating-linear-gradient(120deg, $color-neutral-80, $color-neutral-70);
  border-radius: $border-radius-base;
}

.progress-bar__progress {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 26px; // styleguide-button-size
  max-width: 100%;
  // Wolle background-color: $color-yellow;
  // background: repeating-linear-gradient(60deg, $color-primary-light, $color-primary-light 35px, $color-primary 35px, $color-primary 70px);
  // background: repeating-linear-gradient(60deg, $color-primary-light, $color-primary-light 35px, $color-primary 35px, $color-primary 50px);
  // background: repeating-linear-gradient(60deg, $color-primary-light, $color-primary-light 25px, $color-primary 35px, $color-primary 50px, $color-primary-light, $color-primary, $color-primary);
  // background: repeating-linear-gradient(120deg, $color-primary 0px, $color-primary 35px, $color-primary-light 45px, $color-primary-light 80px, $color-primary 90px);
  background: repeating-linear-gradient(
    120deg,
    $color-primary 0px,
    $color-primary 30px,
    $color-primary-light 50px,
    $color-primary-light 75px,
    $color-primary 95px
  );
  border-radius: $border-radius-base;
}

.progress-bar__border {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 26px; // styleguide-button-size
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  // Wolle border: 1px solid $color-primary;
  border-radius: $border-radius-base;
}

.progress-bar__label {
  // Wolle
  position: relative;
  // top: 8px;
  // right: 8px;
  // text-align: right;
  float: right;
  // margin-left: $space-xxx-small;

  @media (max-width: 350px) {
    font-size: $font-size-small;
    // top: 10px;
  }
}

.progress-bar-button {
  position: relative;
  float: right;
}
</style>

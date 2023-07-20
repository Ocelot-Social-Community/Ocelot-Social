<template>
  <section class="filter-menu-section">
    <h3 v-if="title" class="title">{{ title }}</h3>

    <ul class="filter-list">
      <slot name="filter-follower" />
    </ul>
    <ul class="filter-list">
      <slot name="filter-topics" />
    </ul>
    <!-- <aside class="sidebar">
      <slot name="sidebar" />
    </aside> -->
    <!-- <div v-if="divider" class="divider" /> -->
    <ul class="filter-list">
      <slot name="filter-list" />
    </ul>
  </section>
</template>

<script>
export default {
  props: {
    // divider: {
    //   type: Boolean,
    //   default: true,
    // },
    title: {
      type: String,
    },
  },
}
</script>

<style lang="scss">
.filter-menu-section {
  display: flex;
  flex-wrap: wrap;
  margin-top: $space-small;

  > .title {
    width: 100%;
    margin-bottom: $space-small;
    font-size: $font-size-base;
  }

  // > .sidebar {
  //   display: flex;
  //   flex-wrap: wrap;
  //   flex-basis: 80%;
  //   flex-grow: 1;
  //   max-width: $size-width-filter-sidebar;
  // }

  // > .divider {
  //   // border-left: $border-size-base solid $border-color-soft;
  //   margin: $space-small;
  //   margin-left: 0;
  //   border-top: $border-size-base solid $border-color-soft;
  // }

  > .filter-list {
    display: flex;
    flex-basis: 100%;
    flex-grow: 1;

    > .item {
      // width: 30%;
      padding: 0 $space-xx-small;
      margin-bottom: $space-small;
      text-align: center;

      @media only screen and (min-width: 800px) {
        // width: 15%;
      }
    }
  }

  @media only screen and (max-width: 630px) {
    flex-direction: column;

    > .title {
      text-align: center;
    }

    // > .sidebar {
    //   max-width: none;
    // }

    // > .divider {
    //   border-top: $border-size-base solid $border-color-soft;
    //   margin: $space-small;
    // }
  }
}
</style>

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

<style>
.filter-menu-section {
  display: flex;
  flex-wrap: wrap;
  margin-top: var(--space-small);

  > .title {
    width: 100%;
    margin-bottom: var(--space-small);
    font-size: var(--font-size-base);
  }

  /*  > .sidebar { */
  /*    display: flex; */
  /*    flex-wrap: wrap; */
  /*    flex-basis: 80%; */
  /*    flex-grow: 1; */
  /*    max-width: var(--size-width-filter-sidebar); */
  /*  } */

  /*  > .divider { */
  /*    // border-left: var(--border-size-base) solid var(--border-color-soft); */
  /*    margin: var(--space-small); */
  /*    margin-left: 0; */
  /*    border-top: var(--border-size-base) solid var(--border-color-soft); */
  /*  } */

  > .filter-list {
    display: flex;
    flex-wrap: wrap;
    flex-basis: 100%;
    flex-grow: 1;
    padding-left: var(--space-base);

    > .item {
      /*  width: 30%; */
      padding: 0 var(--space-xx-small);
      margin-bottom: var(--space-small);
      text-align: center;

      @media only screen and (min-width: 800px) {
        /*  width: 15%; */
      }
    }
  }

  @media only screen and (max-width: 630px) {
    flex-direction: column;

    /*  > .sidebar { */
    /*    max-width: none; */
    /*  } */

    /*  > .divider { */
    /*    border-top: var(--border-size-base) solid var(--border-color-soft); */
    /*    margin: var(--space-small); */
    /*  } */
  }
}
</style>

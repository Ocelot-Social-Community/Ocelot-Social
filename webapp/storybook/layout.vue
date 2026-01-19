<template>
  <div class="container">
    <slot />
  </div>
</template>

<style lang="scss">
@import '../styleguide/src/system/styles/main.scss';
@import '../styleguide/src/system/styles/shared.scss';
@import '~/assets/styles/main.scss';

.container {
  padding: 5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>

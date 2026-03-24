<template>
  <div class="container">
    <slot />
  </div>
</template>

<style lang="scss">
@import '~/assets/_new/styles/_styleguide-tokens.scss';
@import '~/assets/styles/main.scss';

.container {
  padding: 5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>

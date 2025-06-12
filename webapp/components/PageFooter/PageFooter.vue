<template>
  <div id="footer" class="ds-footer" :class="{ 'is-sticky': isSticky }">
    <!-- links to internal or external pages -->
    <span v-for="pageParams in links.FOOTER_LINK_LIST" :key="pageParams.name">
      <page-params-link :pageParams="pageParams">
        {{ $t(pageParams.internalPage.footerIdent) }}
      </page-params-link>
      <span class="division-space">&nbsp;</span>
    </span>
    <!-- version -->
    <a
      href="https://github.com/Ocelot-Social-Community/Ocelot-Social/releases"
      target="_blank"
      data-test="version-link"
    >
      {{ version }}
    </a>
  </div>
</template>

<script>
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'

export default {
  components: {
    PageParamsLink,
  },
  props: {
    isSticky: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return { links, version: `v${this.$env.VERSION}` }
  },
}
</script>

<style lang="scss" scoped>
.ds-footer {
  text-align: center;
  z-index: 10;
  background-color: $color-footer-background;
  width: 100%;
  padding: 10px 10px;
  box-shadow: 0px -6px 12px -4px rgba(0, 0, 0, 0.1);

  &.is-sticky {
    position: fixed;
    bottom: 0px;
  }
}
.ds-footer a {
  color: $color-footer-link;
}
.division-space {
  margin-left: 0.4rem;
  margin-right: 0.4rem;
}
</style>

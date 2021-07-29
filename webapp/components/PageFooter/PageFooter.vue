<template>
  <div id="footer" class="ds-footer">
    <!-- links to internal or external pages -->
    <span v-for="pageParams in links.FOOTER_LINK_LIST" :key="pageParams.name">
      <nuxt-link
        v-if="isInternalPage(pageParams)"
        :to="pageParams.internalLink"
        :data-test="pageParams.name + '-nuxt-link'"
      >
        {{ $t(pageParams.internalPage.footerIdent) }}
      </nuxt-link>
      <a v-else :href="pageParams.externalLink" target="_blank" :data-test="pageParams.name + '-link'">
        {{ $t(pageParams.internalPage.footerIdent) }}
      </a>
      <span class="division-line">-</span>
    </span>
    <!-- version -->
    <a
      href="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/CHANGELOG.md"
      target="_blank"
      data-test="version-link"
    >
      {{ version }}
    </a>
  </div>
</template>

<script>
import { isInternalPage } from '~/components/utils/InternalPages.js'
import links from '~/constants/links.js'

export default {
  data() {
    return { isInternalPage, links, version: `v${this.$env.VERSION}` }
  },
}
</script>

<style lang="scss" scoped>
.ds-footer {
  text-align: center;
  position: fixed;
  bottom: 0px;
  z-index: 10;
  background-color: white;
  width: 100%;
  padding: 10px 10px;
  box-shadow: 0px -6px 12px -4px rgba(0, 0, 0, 0.1);
}
.division-line {
  margin-left: 0.2rem;
  margin-right: 0.2rem;
}
</style>

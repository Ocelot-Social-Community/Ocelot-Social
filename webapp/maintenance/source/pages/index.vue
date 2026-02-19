<template>
  <transition name="fade" appear>
    <div class="ds-container ds-container-medium">
      <os-card>
        <div class="ds-mb-large">
          <locale-switch class="login-locale-switch" offset="5" />
        </div>
        <div class="ds-flex maintenance-layout">
          <div class="maintenance-layout__image">
            <div class="ds-mb-large">
              <!-- QUESTION: could we have internal page or even all internal pages here as well with PageParamsLink by having the footer underneath? -->
              <!--   I tried this out, but only could get the nginx page displayed. I guees the there were nuxt errors, because the nuxt config file 'webapp/maintenance/source/nuxt.config.maintenance.js' would have to be refactored for that as well and may be the missing folder `components/_new/generic/` plays a role, see https://github.com/Ocelot-Social-Community/Ocelot-Social/pull/4619 -->
              <!-- <page-params-link :pageParams="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)">
                <logo type="maintenance" />
              </page-params-link> -->
              <!-- BUT: not the logo and not even the a-tag is working at the moment -->
              <!-- <a
                :href="emails.ORGANIZATION_LINK"
                :title="$t('login.moreInfo', metadata)"
                target="_blank"
              > -->
              <img
                class="image"
                :alt="$t('maintenance.title', metadata)"
                src="/img/custom/logo-squared.svg"
              />
              <!-- </a> -->
            </div>
          </div>
          <div class="maintenance-layout__content">
            <div>
              <h3 class="ds-heading ds-heading-h3">{{ $t('maintenance.title', metadata) }}</h3>
            </div>
            <div>
              <div class="ds-my-small">
                <p class="ds-text">{{ $t('maintenance.explanation') }}</p>
                <p class="ds-text">
                  {{ $t('maintenance.questions') }}
                  <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </os-card>
    </div>
  </transition>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import emails from '~/constants/emails.js'
// import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
// import Logo from '~/components/Logo/Logo'

export default {
  layout: 'blank',
  components: {
    OsCard,
    LocaleSwitch,
    // Logo,
  },
  data() {
    // return { links, metadata, supportEmail: emails.SUPPORT_EMAIL }
    return { metadata, supportEmail: emails.SUPPORT_EMAIL }
  },
}
</script>

<style lang="scss" scoped>
.image {
  width: 75%;
  height: auto;
}
.maintenance-layout__image,
.maintenance-layout__content {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-small} {
  .maintenance-layout__image {
    flex: 1 0 0;
  }
  .maintenance-layout__content {
    flex: 1 0 0;
  }
}
</style>

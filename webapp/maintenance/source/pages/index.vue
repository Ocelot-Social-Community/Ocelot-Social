<template>
  <transition name="fade" appear>
    <ds-container width="medium">
      <base-card>
        <ds-space>
          <locale-switch class="login-locale-switch" offset="5" />
        </ds-space>
        <ds-flex>
          <ds-flex-item :width="{ base: '100%', sm: 1, md: 1 }">
            <ds-space>
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
              <img class="image" alt="Under maintenance" src="/img/custom/logo-squared.svg" />
              <!-- </a> -->
            </ds-space>
          </ds-flex-item>
          <ds-flex-item :width="{ base: '100%', sm: 1, md: 1 }">
            <ds-flex-item>
              <ds-heading tag="h3">{{ $t('maintenance.title', metadata) }}</ds-heading>
            </ds-flex-item>
            <ds-flex-item>
              <ds-space margin="small">
                <ds-text>{{ $t('maintenance.explanation') }}</ds-text>
                <ds-text>
                  {{ $t('maintenance.questions') }}
                  <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
                </ds-text>
              </ds-space>
            </ds-flex-item>
          </ds-flex-item>
        </ds-flex>
      </base-card>
    </ds-container>
  </transition>
</template>

<script>
import emails from '~/constants/emails.js'
// import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
// import Logo from '~/components/Logo/Logo'

export default {
  layout: 'blank',
  components: {
    LocaleSwitch,
    // Logo,
  },
  data() {
    // return { links, metadata, supportEmail: emails.SUPPORT_EMAIL }
    return { metadata, supportEmail: emails.SUPPORT_EMAIL }
  },
}
</script>

<style lang="scss">
.image {
  width: 75%;
  height: auto;
}
</style>

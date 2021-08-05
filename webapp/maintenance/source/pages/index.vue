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
              <!-- Wolle -->
              <a v-if="!links.ORGANIZATION.isInternalPage" :href="links.ORGANIZATION.link" :title="$t('login.moreInfo', metadata)" target="_blank">
                <img class="image" alt="Under maintenance" src="/img/custom/logo-squared.svg" />
              </a>
              <img v-else class="image" alt="Under maintenance" src="/img/custom/logo-squared.svg" :title="$t('login.moreInfo', metadata)" />
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
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'

export default {
  layout: 'blank',
  components: {
    LocaleSwitch,
  },
  data() {
    return { links, metadata, supportEmail: emails.SUPPORT_EMAIL }
  },
}
</script>

<style lang="scss">
.image {
  width: 75%;
  height: auto;
}
</style>

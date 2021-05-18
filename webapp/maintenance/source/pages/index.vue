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
              <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
                <logo type="maintenance" />
              </a>
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
import Logo from '~/components/Logo/Logo'

export default {
  layout: 'blank',
  components: {
    LocaleSwitch,
    Logo,
  },
  data() {
    return { links, metadata, supportEmail: emails.SUPPORT }
  },
}
</script>

<style lang="scss"></style>

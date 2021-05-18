<template>
  <transition name="fade" appear>
    <section class="maintenance">
      <base-card>
        <template #imageColumn>
          <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
            <logo type="maintenance" />
          </a>
        </template>
        <ds-heading tag="h3">{{ $t('maintenance.title', metadata) }}</ds-heading>
        <ds-space margin="small">
          <ds-text>{{ $t('maintenance.explanation') }}</ds-text>
          <ds-text>
            {{ $t('maintenance.questions') }}
            <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
          </ds-text>
        </ds-space>
        <template #topMenu>
          <locale-switch offset="5" />
        </template>
      </base-card>
    </section>
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

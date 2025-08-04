<template>
    <transition name="fade" appear>
      <div class="container">
        <base-card>
          <div class="flex-container">
            <div class="item">
                <a
                  :href="emails.ORGANIZATION_LINK"
                  :title="$t('login.moreInfo', metadata)"
                  target="_blank"
                >
                <img class="image" alt="Under maintenance" src="/img/custom/logo-squared.svg" >
                </a>
              </div>
              <div class="item">
                <h3>{{ $t('maintenance.title', metadata) }}</h3>
              </div>
              <div class="explanation">
                  <p>{{ $t('maintenance.explanation') }}</p>
                  <p>
                    {{ $t('maintenance.questions') }}
                    <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
                  </p>
              </div>
            </div>
            </base-card>
          </div>
    </transition>
  </template>

  <script setup lang="ts">
  // TODO add blank layout
  // TODO refactor back to maintenance.vue
  import emails from '~/constants/emails'
  import metadata from '~/constants/metadata'

  import BaseCard from '~/components/BaseCard/BaseCard.vue'

  const supportEmail = emails.supportEmail
</script>

<style src="./style.css" lang="scss" />

<style scoped lang="scss">
@use './media-queries.scss' as media-queries;

  .image {
    width: 75%;
    height: auto;
  }

  .flex-container {
    display: flex;
    gap: var(--space-small);
  }

  .item {
    margin-top: var(--space-small);
  }

  .container {
    padding: 0 var(--space-small);
    margin: 0 auto;

    max-width: var(--md);

    @media #{media-queries.$medium} {
      padding: 0 var(--space-base);
    }

    @media #{media-queries.$large} {
      padding: 0 var(--space-large);
    }
  }
</style>

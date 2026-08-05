<template>
  <os-card>
    <h2 class="title">{{ $t('settings.embeds.name') }}</h2>
    <section class="ds-section">
      <p class="ds-text">
        {{ $t('settings.embeds.status.description') }}
        <span class="ds-text-bold">
          <template v-if="disabled">
            {{ $t(`settings.embeds.status.disabled.on`) }}
          </template>
          <template v-else>
            {{ $t(`settings.embeds.status.disabled.off`) }}
          </template>
        </span>
        .
      </p>
      <p class="ds-text">
        {{ $t('settings.embeds.status.change.question') }}
      </p>
      <div class="ds-mt-small ds-mb-base">
        <os-button
          @click="submit"
          :appearance="!disabled ? 'filled' : 'outline'"
          variant="primary"
          :disabled="!disabled"
        >
          {{ $t('settings.embeds.status.change.deny') }}
        </os-button>
        <os-button
          @click="submit"
          :appearance="disabled ? 'filled' : 'outline'"
          variant="primary"
          :disabled="disabled"
        >
          {{ $t('settings.embeds.status.change.allow') }}
        </os-button>
      </div>
      <h3>{{ $t('settings.embeds.info-description') }}</h3>
      <div class="ds-my-small">
        <ul>
          <li v-for="provider in providers" :key="provider.name" class="provider-list-item">
            <p class="ds-text">
              {{ provider.name }},
              <small>{{ provider.url }}</small>
            </p>
          </li>
        </ul>
      </div>
    </section>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import embedProvidersQuery from '~/graphql/EmbedProvidersQuery.js'
import { updateUserMutation } from '~/graphql/User.js'
import scrollToContent from './scroll-to-content.js'

export default {
  components: { OsButton, OsCard },
  mixins: [scrollToContent],
  head() {
    return {
      title: this.$t('settings.embeds.name'),
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
  },
  data() {
    return {
      disabled: null,
      providers: [],
    }
  },
  apollo: {
    embedProviders: {
      query() {
        return embedProvidersQuery()
      },
      update({ embedProviders }) {
        this.providers = embedProviders
      },
    },
  },
  mounted() {
    if (this.currentUser.allowEmbedIframes) this.disabled = this.currentUser.allowEmbedIframes
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    async submit() {
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            allowEmbedIframes: !this.disabled,
          },
          update: (store, { data: { UpdateUser } }) => {
            const { allowEmbedIframes } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              allowEmbedIframes,
            })
          },
        })
        this.disabled = !this.disabled
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
}
</script>

<style scoped>
button + button {
  margin-left: var(--space-x-small);
}
.provider-list-item {
  margin-top: var(--space-xx-small);
  margin-bottom: var(--space-xx-small);
}
</style>

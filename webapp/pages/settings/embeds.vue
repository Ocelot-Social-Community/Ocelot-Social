<template>
  <base-card>
    <h2 class="title">{{ $t('settings.embeds.name') }}</h2>
    <ds-section>
      <ds-text>
        {{ $t('settings.embeds.status.description') }}
        <ds-text bold>
          <template v-if="disabled">
            {{ $t(`settings.embeds.status.disabled.on`) }}
          </template>
          <template v-else>
            {{ $t(`settings.embeds.status.disabled.off`) }}
          </template>
        </ds-text>
        .
      </ds-text>
      <ds-text>
        {{ $t('settings.embeds.status.change.question') }}
      </ds-text>
      <ds-space margin="small">
        <base-button @click="submit" :filled="!disabled" :disabled="!disabled">
          {{ $t('settings.embeds.status.change.deny') }}
        </base-button>
        <base-button @click="submit" :filled="disabled" :disabled="disabled">
          {{ $t('settings.embeds.status.change.allow') }}
        </base-button>
      </ds-space>
      <h3>{{ $t('settings.embeds.info-description') }}</h3>
      <ds-space margin="small">
        <ul>
          <li
            v-for="provider in providers"
            :key="provider.provider_name"
            class="provider-list-item"
          >
            <ds-text>
              {{ provider.provider_name }},
              <small>{{ provider.provider_url }}</small>
            </ds-text>
          </li>
        </ul>
      </ds-space>
    </ds-section>
  </base-card>
</template>

<script>
import axios from 'axios'
import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User.js'

export default {
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
  mounted() {
    axios.get('/api/providers.json').then((response) => {
      this.providers = response.data
    })
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

<style lang="scss" scoped>
button + button {
  margin-left: $space-x-small;
}
.provider-list-item {
  margin-top: $space-xx-small;
  margin-bottom: $space-xx-small;
}
</style>

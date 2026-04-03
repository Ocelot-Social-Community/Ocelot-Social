<template>
  <div>
    <!-- Create new key -->
    <os-card class="ds-mb-large">
      <h2 class="title">{{ $t('settings.api-keys.create.title') }}</h2>
      <form @submit.prevent="createKey">
        <div class="ds-mb-small">
          <ocelot-input
            id="api-key-name"
            model="name"
            :value="name"
            :label="$t('settings.api-keys.create.name-label')"
            @input="name = $event"
          />
        </div>
        <div class="ds-mb-small">
          <label class="ds-label" for="api-key-expiry">
            {{ $t('settings.api-keys.create.expiry-label') }}
          </label>
          <select id="api-key-expiry" v-model="expiresInDays" class="settings-select">
            <option :value="null">{{ $t('settings.api-keys.create.expiry-never') }}</option>
            <option :value="30">{{ $t('settings.api-keys.create.expiry-days', { days: 30 }) }}</option>
            <option :value="90">{{ $t('settings.api-keys.create.expiry-days', { days: 90 }) }}</option>
            <option :value="180">{{ $t('settings.api-keys.create.expiry-days', { days: 180 }) }}</option>
            <option :value="365">{{ $t('settings.api-keys.create.expiry-days', { days: 365 }) }}</option>
          </select>
        </div>
        <p v-if="activeKeys.length >= maxKeys" class="ds-text ds-text-small limit-warning">
          {{ $t('settings.api-keys.create.limit-reached', { max: maxKeys }) }}
        </p>
        <os-button
          variant="primary"
          type="submit"
          :disabled="!name.trim() || activeKeys.length >= maxKeys"
          :loading="creating"
        >
          {{ $t('settings.api-keys.create.submit') }}
        </os-button>
      </form>
    </os-card>

    <!-- Secret banner (shown once after creation) -->
    <os-card v-if="newSecret" class="ds-mb-large secret-banner">
      <h3 class="title">{{ $t('settings.api-keys.secret.title') }}</h3>
      <div class="secret-display">
        <code class="secret-code">{{ newSecret }}</code>
        <os-button
          v-if="canCopy"
          variant="primary"
          appearance="outline"
          size="sm"
          @click="copySecret"
        >
          <template #icon><os-icon :icon="icons.copy" /></template>
          {{ $t('settings.api-keys.secret.copy') }}
        </os-button>
      </div>
      <p class="ds-text ds-text-small secret-warning">
        {{ $t('settings.api-keys.secret.warning') }}
      </p>
    </os-card>

    <!-- Active keys -->
    <os-card class="ds-mb-large">
      <h2 class="title">
        {{ $t('settings.api-keys.list.title') }}
        <span class="key-counter">({{ activeKeys.length }}/{{ maxKeys }})</span>
      </h2>
      <div v-if="activeKeys.length" class="ds-table-wrap">
        <table class="ds-table ds-table-condensed ds-table-bordered">
          <thead>
            <tr>
              <th scope="col" class="ds-table-head-col">
                {{ $t('settings.api-keys.list.name') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('settings.api-keys.list.prefix') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('settings.api-keys.list.expires') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('settings.api-keys.list.last-used') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('settings.api-keys.list.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in activeKeys" :key="key.id">
              <td class="ds-table-col" :title="$t('settings.api-keys.list.created-at') + ': ' + $options.filters.dateTime(key.createdAt)">
                {{ key.name }}
              </td>
              <td class="ds-table-col" :title="$t('settings.api-keys.list.created-at') + ': ' + $options.filters.dateTime(key.createdAt)">
                <code>{{ key.keyPrefix }}...</code>
              </td>
              <td class="ds-table-col">
                <template v-if="isExpired(key)">
                  <span class="status-label">{{ $t('settings.api-keys.list.expired') }}</span>
                </template>
                <template v-else-if="key.expiresAt">
                  {{ key.expiresAt | dateTime }}
                </template>
                <template v-else>
                  {{ $t('settings.api-keys.list.never-expires') }}
                </template>
              </td>
              <td class="ds-table-col">
                {{ key.lastUsedAt ? $options.filters.dateTime(key.lastUsedAt) : $t('settings.api-keys.list.never') }}
              </td>
              <td class="ds-table-col">
                <os-button
                  variant="danger"
                  appearance="outline"
                  circle
                  size="sm"
                  :loading="revokingKeyId === key.id"
                  :aria-label="$t('settings.api-keys.list.revoke')"
                  @click="confirmRevoke(key)"
                >
                  <template #icon><os-icon :icon="icons.trash" /></template>
                </os-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="ds-placeholder">
        {{ $t('settings.api-keys.list.empty') }}
      </div>

      <!-- Revoked keys (collapsible) -->
      <div v-if="revokedKeys.length" class="revoked-section">
        <button
          class="revoked-toggle"
          :aria-expanded="String(showRevoked)"
          aria-controls="revoked-keys-list"
          @click="showRevoked = !showRevoked"
        >
          <span>
            {{ $t('settings.api-keys.revoked-list.title', { count: revokedKeys.length }) }}
          </span>
          <span class="revoked-chevron" :class="{ open: showRevoked }">&#9660;</span>
        </button>
        <div v-if="showRevoked" id="revoked-keys-list" class="ds-table-wrap">
          <table class="ds-table ds-table-condensed ds-table-bordered revoked-table">
            <thead>
              <tr>
                <th scope="col" class="ds-table-head-col">
                  {{ $t('settings.api-keys.list.name') }}
                </th>
                <th scope="col" class="ds-table-head-col">
                  {{ $t('settings.api-keys.list.prefix') }}
                </th>
                <th scope="col" class="ds-table-head-col">
                  {{ $t('settings.api-keys.revoked-list.revoked-at') }}
                </th>
                <th scope="col" class="ds-table-head-col">
                  {{ $t('settings.api-keys.list.last-used') }}
                </th>
                <th scope="col" class="ds-table-head-col">
                  {{ $t('settings.api-keys.list.actions') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in revokedKeys" :key="key.id">
                <td class="ds-table-col" :title="$t('settings.api-keys.list.created-at') + ': ' + $options.filters.dateTime(key.createdAt)">
                  {{ key.name }}
                </td>
                <td class="ds-table-col" :title="$t('settings.api-keys.list.created-at') + ': ' + $options.filters.dateTime(key.createdAt)">
                  <code>{{ key.keyPrefix }}...</code>
                </td>
                <td class="ds-table-col">
                  {{ key.disabledAt ? $options.filters.dateTime(key.disabledAt) : '–' }}
                </td>
                <td class="ds-table-col">
                  {{ key.lastUsedAt ? $options.filters.dateTime(key.lastUsedAt) : $t('settings.api-keys.list.never') }}
                </td>
                <td class="ds-table-col">
                  <span class="status-label">{{ $t('settings.api-keys.list.revoked') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </os-card>

    <!-- Confirm revoke modal -->
    <confirm-modal
      v-if="showRevokeModal"
      :modalData="revokeModalData"
      @close="showRevokeModal = false"
    />
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import OcelotInput from '~/components/OcelotInput/OcelotInput'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import { myApiKeysQuery, createApiKeyMutation, revokeApiKeyMutation } from '~/graphql/settings/ApiKeys'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsButton,
    OsCard,
    OsIcon,
    OcelotInput,
    ConfirmModal,
  },
  created() {
    this.icons = iconRegistry
    this.canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard
  },
  data() {
    return {
      myApiKeys: [],
      name: '',
      expiresInDays: null,
      creating: false,
      newSecret: null,
      canCopy: false,
      revokingKeyId: null,
      showRevokeModal: false,
      revokeModalData: null,
      showRevoked: false,
    }
  },
  computed: {
    maxKeys() {
      return this.$env.API_KEYS_MAX_PER_USER || 5
    },
    activeKeys() {
      return (this.myApiKeys || []).filter((k) => !k.disabled)
    },
    revokedKeys() {
      return (this.myApiKeys || []).filter((k) => k.disabled)
    },
  },
  apollo: {
    myApiKeys: { query: myApiKeysQuery(), fetchPolicy: 'cache-and-network' },
  },
  methods: {
    async createKey() {
      if (!this.name.trim()) return
      this.creating = true
      try {
        const variables = { name: this.name.trim() }
        if (this.expiresInDays) {
          variables.expiresInDays = Number(this.expiresInDays)
        }
        const result = await this.$apollo.mutate({
          mutation: createApiKeyMutation(),
          variables,
        })
        this.newSecret = result.data.createApiKey.secret
        this.name = ''
        this.expiresInDays = null
        this.$apollo.queries.myApiKeys.refetch()
        this.$toast.success(this.$t('settings.api-keys.create.success'))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.creating = false
      }
    },
    async copySecret() {
      try {
        await navigator.clipboard.writeText(this.newSecret)
        this.$toast.success(this.$t('settings.api-keys.secret.copied'))
      } catch {
        this.$toast.error(this.$t('settings.api-keys.secret.copy-failed'))
      }
    },
    confirmRevoke(key) {
      this.revokeModalData = {
        titleIdent: 'settings.api-keys.revoke.title',
        messageIdent: 'settings.api-keys.revoke.message',
        messageParams: { name: key.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'settings.api-keys.revoke.confirm',
            callback: () => this.revokeKey(key),
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
      this.showRevokeModal = true
    },
    async revokeKey(key) {
      this.revokingKeyId = key.id
      try {
        await this.$apollo.mutate({
          mutation: revokeApiKeyMutation(),
          variables: { id: key.id },
        })
        this.$apollo.queries.myApiKeys.refetch()
        this.$toast.success(this.$t('settings.api-keys.revoke.success', { name: key.name }))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.revokingKeyId = null
      }
    },
    isExpired(key) {
      return key.expiresAt && new Date(key.expiresAt) < new Date()
    },
  },
}
</script>

<style scoped lang="scss">
.secret-banner {
  background-color: $color-warning-inverse;
  border: 1px solid $color-warning;
}

.secret-display {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  margin: $space-x-small 0;
}

.secret-code {
  flex: 1;
  padding: $space-x-small;
  background: $background-color-base;
  border: 1px solid $color-neutral-80;
  border-radius: $border-radius-base;
  word-break: break-all;
  font-size: $font-size-small;
}

.secret-warning {
  color: $color-warning;
  font-style: italic;
}

.key-counter {
  font-weight: normal;
  font-size: $font-size-base;
  color: $color-neutral-50;
}

.limit-warning {
  color: $color-warning;
  margin-bottom: $space-x-small;
}

.status-label {
  font-size: $font-size-small;
  color: $text-color-soft;
  font-style: italic;
}

.revoked-section {
  margin-top: $space-large;
}

.revoked-toggle {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  background: none;
  border: none;
  cursor: pointer;
  color: $text-color-soft;
  padding: $space-x-small 0;
  font-size: $font-size-base;

  &:hover {
    color: $text-color-base;
  }
}

.revoked-chevron {
  font-size: $font-size-small;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.ds-table-wrap {
  overflow-x: auto;
}

tr > th:last-child,
tr > td:last-child {
  position: sticky;
  right: 0;
  background-color: $background-color-base;
  text-align: center;
}

.revoked-table {
  opacity: 0.6;
}

.settings-select {
  width: 100%;
  padding: $space-x-small;
  font-size: $font-size-base;
  border: 1px solid $color-neutral-80;
  border-radius: $border-radius-base;
  background-color: $background-color-base;
}
</style>

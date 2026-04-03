<template>
  <div class="admin-api-keys">
    <os-card>
      <h2 class="title">{{ $t('admin.api-keys.name') }}</h2>
      <div class="ds-mb-small">
        <label class="ds-label" for="api-key-order">
          {{ $t('admin.api-keys.sort-by') }}
        </label>
        <select id="api-key-order" v-model="orderBy" class="admin-select" @change="resetPagination">
          <option value="LAST_ACTIVITY">{{ $t('admin.api-keys.order.last-used') }}</option>
          <option value="ACTIVE_KEYS">{{ $t('admin.api-keys.order.active-keys') }}</option>
          <option value="POSTS_COUNT">{{ $t('admin.api-keys.order.posts') }}</option>
          <option value="COMMENTS_COUNT">{{ $t('admin.api-keys.order.comments') }}</option>
        </select>
      </div>
    </os-card>

    <os-card v-if="apiKeyUsers && apiKeyUsers.length">
      <div class="ds-table-wrap table-no-clip">
        <table class="ds-table ds-table-condensed ds-table-bordered">
          <thead>
            <tr>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.user') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.active') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.revoked-count') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.posts') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.comments') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.last-activity') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="entry in apiKeyUsers">
              <tr :key="entry.user.id">
                <td class="ds-table-col">
                  <user-teaser :user="entry.user" :show-slug="true" />
                </td>
                <td class="ds-table-col ds-table-col-right">{{ entry.activeCount }}</td>
                <td class="ds-table-col ds-table-col-right">{{ entry.revokedCount }}</td>
                <td class="ds-table-col ds-table-col-right">{{ entry.postsCount }}</td>
                <td class="ds-table-col ds-table-col-right">{{ entry.commentsCount }}</td>
                <td class="ds-table-col">
                  {{ entry.lastActivity ? $options.filters.dateTime(entry.lastActivity) : $t('admin.api-keys.never') }}
                </td>
                <td class="ds-table-col actions-cell">
                  <div class="action-buttons">
                    <os-button
                      v-if="entry.activeCount > 0"
                      variant="danger"
                      appearance="outline"
                      size="sm"
                      :aria-label="$t('admin.api-keys.revoke-all')"
                      @click="confirmRevokeAll(entry)"
                    >
                      {{ $t('admin.api-keys.revoke-all-short') }}
                    </os-button>
                    <os-button
                      variant="primary"
                      appearance="outline"
                      circle
                      size="sm"
                      :aria-label="$t('admin.api-keys.show-keys')"
                      @click="toggleUser(entry.user.id)"
                    >
                      <template #icon>
                        <os-icon :icon="expandedUserId === entry.user.id ? icons.angleUp : icons.angleDown" />
                      </template>
                    </os-button>
                  </div>
                </td>
              </tr>
              <!-- Expanded: keys for this user -->
              <tr v-if="expandedUserId === entry.user.id" :key="entry.user.id + '-detail'">
                <td :colspan="7" class="detail-cell">
                  <div v-if="detailLoading" class="ds-placeholder">
                    <os-spinner />
                  </div>
                  <template v-else-if="userKeys">
                    <!-- Active keys -->
                    <div v-if="activeUserKeys.length" class="ds-mb-small">
                      <h4 class="ds-mb-small">
                        {{ $t('admin.api-keys.detail.active', { count: activeUserKeys.length }) }}
                      </h4>
                      <table class="ds-table ds-table-condensed">
                        <thead>
                          <tr>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.name') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.prefix') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.last-activity') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.actions') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in activeUserKeys" :key="key.id">
                            <td class="ds-table-col" :title="$t('settings.api-keys.list.created-at') + ': ' + $options.filters.dateTime(key.createdAt)">
                              {{ key.name }}
                            </td>
                            <td class="ds-table-col"><code>{{ key.keyPrefix }}...</code></td>
                            <td class="ds-table-col">
                              {{ key.lastUsedAt ? $options.filters.dateTime(key.lastUsedAt) : $t('admin.api-keys.never') }}
                            </td>
                            <td class="ds-table-col">
                              <os-button
                                variant="danger"
                                appearance="outline"
                                circle
                                size="sm"
                                :aria-label="$t('admin.api-keys.revoke-key')"
                                @click="confirmRevokeKey(key, entry)"
                              >
                                <template #icon><os-icon :icon="icons.trash" /></template>
                              </os-button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <!-- Revoked keys -->
                    <div v-if="revokedUserKeys.length">
                      <h4 class="ds-mb-small revoked-heading">
                        {{ $t('admin.api-keys.detail.revoked', { count: revokedUserKeys.length }) }}
                      </h4>
                      <table class="ds-table ds-table-condensed revoked-table">
                        <thead>
                          <tr>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.name') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.prefix') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.revoked-at') }}</th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.table.last-activity') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in revokedUserKeys" :key="key.id">
                            <td class="ds-table-col">{{ key.name }}</td>
                            <td class="ds-table-col"><code>{{ key.keyPrefix }}...</code></td>
                            <td class="ds-table-col">
                              {{ key.disabledAt ? $options.filters.dateTime(key.disabledAt) : '–' }}
                            </td>
                            <td class="ds-table-col">
                              {{ key.lastUsedAt ? $options.filters.dateTime(key.lastUsedAt) : $t('admin.api-keys.never') }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <pagination-buttons :hasNext="hasNext" :hasPrevious="hasPrevious" @next="next" @back="back" />
    </os-card>
    <os-card v-else>
      <div class="ds-placeholder">{{ $t('admin.api-keys.empty') }}</div>
    </os-card>

    <confirm-modal
      v-if="showModal"
      :modalData="modalData"
      @close="showModal = false"
    />
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import {
  apiKeyUsersQuery,
  apiKeysForUserQuery,
  adminRevokeApiKeyMutation,
  adminRevokeUserApiKeysMutation,
} from '~/graphql/admin/ApiKeys'

export default {
  components: {
    OsButton,
    OsCard,
    OsIcon,
    OsSpinner,
    PaginationButtons,
    ConfirmModal,
    UserTeaser,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const pageSize = 20
    return {
      apiKeyUsers: [],
      orderBy: 'LAST_ACTIVITY',
      offset: 0,
      pageSize,
      first: pageSize,
      hasNext: false,
      expandedUserId: null,
      userKeys: null,
      detailLoading: false,
      showModal: false,
      modalData: null,
    }
  },
  apollo: {
    apiKeyUsers: {
      query: apiKeyUsersQuery(),
      variables() {
        return {
          orderBy: this.orderBy,
          first: this.first + 1,
          offset: this.offset,
        }
      },
      update({ apiKeyUsers }) {
        this.hasNext = apiKeyUsers.length > this.pageSize
        return apiKeyUsers.slice(0, this.pageSize)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
  computed: {
    hasPrevious() {
      return this.offset > 0
    },
    activeUserKeys() {
      return (this.userKeys || []).filter((k) => !k.disabled)
    },
    revokedUserKeys() {
      return (this.userKeys || []).filter((k) => k.disabled)
    },
  },
  methods: {
    resetPagination() {
      this.offset = 0
    },
    next() {
      this.offset += this.pageSize
    },
    back() {
      this.offset = Math.max(0, this.offset - this.pageSize)
    },
    async toggleUser(userId) {
      if (this.expandedUserId === userId) {
        this.expandedUserId = null
        this.userKeys = null
        return
      }
      this.expandedUserId = userId
      this.detailLoading = true
      this.userKeys = null
      try {
        const result = await this.$apollo.query({
          query: apiKeysForUserQuery(),
          variables: { userId },
          fetchPolicy: 'network-only',
        })
        this.userKeys = result.data.apiKeysForUser
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.detailLoading = false
      }
    },
    confirmRevokeKey(key, entry) {
      this.modalData = {
        titleIdent: 'admin.api-keys.revoke.title',
        messageIdent: 'admin.api-keys.revoke.message',
        messageParams: { name: key.name, user: entry.user.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'admin.api-keys.revoke.confirm',
            callback: () => this.revokeKey(key.id, entry.user.id),
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
      this.showModal = true
    },
    confirmRevokeAll(entry) {
      this.modalData = {
        titleIdent: 'admin.api-keys.revoke-all-title',
        messageIdent: 'admin.api-keys.revoke-all-message',
        messageParams: { user: entry.user.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'admin.api-keys.revoke-all-confirm',
            callback: () => this.revokeAllKeys(entry.user.id, entry.user.name),
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
      this.showModal = true
    },
    async revokeKey(keyId, userId) {
      try {
        await this.$apollo.mutate({
          mutation: adminRevokeApiKeyMutation(),
          variables: { id: keyId },
        })
        this.$apollo.queries.apiKeyUsers.refetch()
        await this.toggleUser(null) // collapse
        this.$toast.success(this.$t('admin.api-keys.revoke.success'))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async revokeAllKeys(userId, userName) {
      try {
        const result = await this.$apollo.mutate({
          mutation: adminRevokeUserApiKeysMutation(),
          variables: { userId },
        })
        const count = result.data.adminRevokeUserApiKeys
        this.$apollo.queries.apiKeyUsers.refetch()
        this.expandedUserId = null
        this.userKeys = null
        this.$toast.success(this.$t('admin.api-keys.revoke-all-success', { count, user: userName }))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>

<style scoped lang="scss">
.admin-select {
  width: auto;
  padding: $space-x-small;
  font-size: $font-size-base;
  border: 1px solid $color-neutral-80;
  border-radius: $border-radius-base;
  background-color: $background-color-base;
}

.table-no-clip {
  overflow: visible;
}

.action-buttons {
  display: flex;
  gap: $space-xx-small;
  align-items: center;
  justify-content: flex-end;
}

.detail-cell {
  background-color: $color-neutral-90;
  padding: $space-small;
}

.revoked-table {
  opacity: 0.6;
}

.revoked-heading {
  color: $text-color-soft;
}
</style>

<template>
  <os-card class="admin-api-keys">
    <h2 class="title">{{ $t('admin.api-keys.name') }}</h2>

    <template v-if="apiKeyUsers && apiKeyUsers.length">
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
                  <date-time v-if="entry.lastActivity" :date-time="entry.lastActivity" />
                  <template v-else>{{ $t('admin.api-keys.never') }}</template>
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
                      :loading="detailLoading && expandedUserId === entry.user.id"
                      :aria-label="$t('admin.api-keys.show-keys')"
                      @click="toggleUser(entry.user.id)"
                    >
                      <template #icon>
                        <os-icon
                          :icon="expandedUserId === entry.user.id ? icons.angleUp : icons.angleDown"
                        />
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
                            <th class="ds-table-head-col">
                              {{ $t('admin.api-keys.table.prefix') }}
                            </th>
                            <th class="ds-table-head-col">
                              {{ $t('admin.api-keys.table.last-activity') }}
                            </th>
                            <th class="ds-table-head-col">
                              {{ $t('admin.api-keys.table.actions') }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in activeUserKeys" :key="key.id">
                            <td
                              class="ds-table-col"
                              :title="
                                $t('settings.api-keys.list.created-at') +
                                ': ' +
                                $options.filters.dateTime(key.createdAt)
                              "
                            >
                              {{ key.name }}
                            </td>
                            <td class="ds-table-col">
                              <code>{{ key.keyPrefix }}...</code>
                            </td>
                            <td class="ds-table-col">
                              <date-time v-if="key.lastUsedAt" :date-time="key.lastUsedAt" />
                              <template v-else>{{ $t('admin.api-keys.never') }}</template>
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
                            <th class="ds-table-head-col">
                              {{ $t('admin.api-keys.table.prefix') }}
                            </th>
                            <th class="ds-table-head-col">{{ $t('admin.api-keys.revoked-at') }}</th>
                            <th class="ds-table-head-col">
                              {{ $t('admin.api-keys.table.last-activity') }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in revokedUserKeys" :key="key.id">
                            <td class="ds-table-col">{{ key.name }}</td>
                            <td class="ds-table-col">
                              <code>{{ key.keyPrefix }}...</code>
                            </td>
                            <td class="ds-table-col">
                              <date-time v-if="key.disabledAt" :date-time="key.disabledAt" />
                              <template v-else>–</template>
                            </td>
                            <td class="ds-table-col">
                              <date-time v-if="key.lastUsedAt" :date-time="key.lastUsedAt" />
                              <template v-else>{{ $t('admin.api-keys.never') }}</template>
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
    </template>
    <div v-else class="ds-placeholder">{{ $t('admin.api-keys.empty') }}</div>

    <confirm-modal v-if="showModal" :modalData="modalData" @close="showModal = false" />
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import DateTime from '~/components/DateTime'
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
    DateTime,
    UserTeaser,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const pageSize = 20
    return {
      apiKeyUsers: [],
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
        if (this.expandedUserId !== userId) return
        this.userKeys = result.data.apiKeysForUser
      } catch (error) {
        if (this.expandedUserId !== userId) return
        this.$toast.error(error.message)
      } finally {
        if (this.expandedUserId === userId) {
          this.detailLoading = false
        }
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
        this.expandedUserId = null
        this.userKeys = null
        this.$toast.success(this.$t('admin.api-keys.revoke.success'))
      } catch (error) {
        this.$toast.error(error.message)
        throw error
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
        throw error
      }
    },
  },
}
</script>

<style scoped lang="scss">
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

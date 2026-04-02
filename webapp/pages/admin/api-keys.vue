<template>
  <div class="admin-api-keys">
    <os-card>
      <h2 class="title">{{ $t('admin.api-keys.name') }}</h2>
      <div class="ds-mb-small">
        <label class="ds-label" for="api-key-order">
          {{ $t('admin.api-keys.sort-by') }}
        </label>
        <select id="api-key-order" v-model="orderBy" class="admin-select" @change="resetPagination">
          <option value="LAST_USED">{{ $t('admin.api-keys.order.last-used') }}</option>
          <option value="LAST_CONTENT">{{ $t('admin.api-keys.order.last-content') }}</option>
          <option value="CREATED_AT">{{ $t('admin.api-keys.order.created') }}</option>
          <option value="POSTS_COUNT">{{ $t('admin.api-keys.order.posts') }}</option>
          <option value="COMMENTS_COUNT">{{ $t('admin.api-keys.order.comments') }}</option>
        </select>
      </div>
    </os-card>

    <os-card v-if="allApiKeys && allApiKeys.length">
      <div class="ds-table-wrap">
        <table class="ds-table ds-table-condensed ds-table-bordered">
          <thead>
            <tr>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.prefix') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.name') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.user') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.last-used') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.posts') }}
              </th>
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.api-keys.table.comments') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.api-keys.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="entry in allApiKeys">
              <tr
                :key="entry.apiKey.id"
                :class="{ 'disabled-row': entry.apiKey.disabled }"
              >
                <td class="ds-table-col">
                  <code>{{ entry.apiKey.keyPrefix }}...</code>
                </td>
                <td class="ds-table-col">{{ entry.apiKey.name }}</td>
                <td class="ds-table-col">
                  <nuxt-link
                    :to="{ name: 'profile-id-slug', params: { id: entry.owner.id, slug: entry.owner.slug } }"
                  >
                    @{{ entry.owner.slug }}
                  </nuxt-link>
                </td>
                <td class="ds-table-col">
                  {{ entry.apiKey.lastUsedAt ? $options.filters.dateTime(entry.apiKey.lastUsedAt) : $t('admin.api-keys.never') }}
                </td>
                <td class="ds-table-col ds-table-col-right">{{ entry.postsCount }}</td>
                <td class="ds-table-col ds-table-col-right">{{ entry.commentsCount }}</td>
                <td class="ds-table-col">
                  <div class="action-buttons">
                    <os-button
                      v-if="entry.postsCount > 0 || entry.commentsCount > 0"
                      variant="primary"
                      appearance="outline"
                      circle
                      size="sm"
                      :aria-label="$t('admin.api-keys.show-content')"
                      @click="toggleDetail(entry.apiKey.id)"
                    >
                      <template #icon>
                        <os-icon :icon="expandedKeyId === entry.apiKey.id ? icons.chevronUp : icons.chevronDown" />
                      </template>
                    </os-button>
                    <os-button
                      v-if="!entry.apiKey.disabled"
                      variant="danger"
                      appearance="outline"
                      circle
                      size="sm"
                      :aria-label="$t('admin.api-keys.revoke-key')"
                      @click="confirmRevokeKey(entry)"
                    >
                      <template #icon><os-icon :icon="icons.trash" /></template>
                    </os-button>
                    <os-button
                      v-if="!entry.apiKey.disabled"
                      variant="danger"
                      appearance="outline"
                      size="sm"
                      :aria-label="$t('admin.api-keys.revoke-all')"
                      @click="confirmRevokeAll(entry)"
                    >
                      {{ $t('admin.api-keys.revoke-all-short') }}
                    </os-button>
                    <span v-if="entry.apiKey.disabled" class="status-label">
                      {{ $t('admin.api-keys.revoked') }}
                    </span>
                  </div>
                </td>
              </tr>
              <!-- Expanded detail row -->
              <tr v-if="expandedKeyId === entry.apiKey.id" :key="entry.apiKey.id + '-detail'">
                <td :colspan="7" class="detail-cell">
                  <div v-if="detailLoading" class="ds-placeholder">
                    <os-spinner />
                  </div>
                  <div v-else-if="detailContent">
                    <h4 class="ds-mb-small">
                      {{ $t('admin.api-keys.content-title', {
                        posts: detailContent.posts.length,
                        comments: detailContent.comments.length,
                      }) }}
                    </h4>
                    <table class="ds-table ds-table-condensed" v-if="detailContent.posts.length">
                      <tbody>
                        <tr v-for="post in detailContent.posts.slice(0, 20)" :key="post.id">
                          <td class="ds-table-col"><b>Post</b></td>
                          <td class="ds-table-col">{{ post.title | truncate(60) }}</td>
                          <td class="ds-table-col">{{ post.createdAt | dateTime }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <table class="ds-table ds-table-condensed" v-if="detailContent.comments.length">
                      <tbody>
                        <tr v-for="comment in detailContent.comments.slice(0, 20)" :key="comment.id">
                          <td class="ds-table-col"><b>Comment</b></td>
                          <td class="ds-table-col">{{ comment.contentExcerpt | truncate(60) }}</td>
                          <td class="ds-table-col">{{ comment.createdAt | dateTime }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
import {
  allApiKeysQuery,
  contentByApiKeyQuery,
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
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const pageSize = 20
    return {
      allApiKeys: [],
      orderBy: 'LAST_USED',
      offset: 0,
      pageSize,
      first: pageSize,
      hasNext: false,
      expandedKeyId: null,
      detailContent: null,
      detailLoading: false,
      showModal: false,
      modalData: null,
    }
  },
  apollo: {
    allApiKeys: {
      query: allApiKeysQuery,
      variables() {
        return {
          orderBy: this.orderBy,
          first: this.first + 1,
          offset: this.offset,
        }
      },
      update({ allApiKeys }) {
        this.hasNext = allApiKeys.length > this.pageSize
        return allApiKeys.slice(0, this.pageSize)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
  computed: {
    hasPrevious() {
      return this.offset > 0
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
    async toggleDetail(keyId) {
      if (this.expandedKeyId === keyId) {
        this.expandedKeyId = null
        this.detailContent = null
        return
      }
      this.expandedKeyId = keyId
      this.detailLoading = true
      this.detailContent = null
      try {
        const result = await this.$apollo.query({
          query: contentByApiKeyQuery(),
          variables: { apiKeyId: keyId },
          fetchPolicy: 'network-only',
        })
        this.detailContent = result.data.contentByApiKey
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.detailLoading = false
      }
    },
    confirmRevokeKey(entry) {
      this.modalData = {
        titleIdent: 'admin.api-keys.revoke.title',
        messageIdent: 'admin.api-keys.revoke.message',
        messageParams: { name: entry.apiKey.name, user: entry.owner.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'admin.api-keys.revoke.confirm',
            callback: () => this.revokeKey(entry.apiKey.id),
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
        messageParams: { user: entry.owner.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'admin.api-keys.revoke-all-confirm',
            callback: () => this.revokeAllKeys(entry.owner.id, entry.owner.name),
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
    async revokeKey(keyId) {
      try {
        await this.$apollo.mutate({
          mutation: adminRevokeApiKeyMutation(),
          variables: { id: keyId },
        })
        this.$apollo.queries.allApiKeys.refetch()
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
        this.$apollo.queries.allApiKeys.refetch()
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
  background-color: white;
}

.disabled-row {
  opacity: 0.5;
}

.status-label {
  font-size: $font-size-small;
  color: $color-neutral-60;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: $space-xx-small;
  align-items: center;
}

.detail-cell {
  background-color: $color-neutral-95;
  padding: $space-small;
}
</style>

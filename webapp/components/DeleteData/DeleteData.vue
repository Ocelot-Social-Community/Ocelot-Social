<template>
  <os-card class="delete-data">
    <h2 class="title">
      <os-icon :icon="icons.warning" />
      {{ $t('settings.deleteUserAccount.name') }}
    </h2>
    <label>
      {{ $t('settings.deleteUserAccount.pleaseConfirm', { confirm: currentUser.name }) }}
    </label>
    <ocelot-input v-model="enableDeletionValue" />
    <p v-show="enableDeletionValue" class="notice">
      {{ $t('settings.deleteUserAccount.accountDescription') }}
    </p>
    <label class="checkbox">
      <input
        type="checkbox"
        v-model="deleteContributions"
        data-test="contributions-deletion-checkbox"
      />
      {{
        $t(
          'settings.deleteUserAccount.contributionsCount',
          {
            count: currentUserCounts.contributionsCount,
          },
          currentUserCounts.contributionsCount,
        )
      }}
    </label>
    <label class="checkbox">
      <input type="checkbox" v-model="deleteComments" data-test="comments-deletion-checkbox" />
      {{
        $t(
          'settings.deleteUserAccount.commentedCount',
          {
            count: currentUserCounts.commentedCount,
          },
          currentUserCounts.commentedCount,
        )
      }}
    </label>
    <section class="warning">
      <p>{{ $t('settings.deleteUserAccount.accountWarning') }}</p>
    </section>
    <os-button
      variant="danger"
      appearance="filled"
      :disabled="!deleteEnabled"
      :loading="loading"
      data-test="delete-button"
      @click="handleSubmit"
    >
      <template #icon>
        <os-icon :icon="icons.trash" />
      </template>
      {{ $t('settings.deleteUserAccount.name') }}
    </os-button>
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapActions, mapGetters } from 'vuex'
import gql from 'graphql-tag'
import { currentUserCountQuery } from '~/graphql/User'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'DeleteData',
  components: { OsButton, OsCard, OsIcon, OcelotInput },
  data() {
    return {
      deleteContributions: false,
      deleteComments: false,
      enableDeletionValue: null,
      currentUserCounts: {},
      loading: false,
    }
  },
  apollo: {
    currentUser: {
      query() {
        return currentUserCountQuery()
      },
      update(currentUser) {
        this.currentUserCounts = currentUser.currentUser
      },
    },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    deleteEnabled() {
      return this.enableDeletionValue === this.currentUser.name
    },
  },
  methods: {
    ...mapActions({
      logout: 'auth/logout',
    }),
    handleSubmit() {
      this.loading = true
      const resourceArgs = []
      if (this.deleteContributions) {
        resourceArgs.push('Post')
      }
      if (this.deleteComments) {
        resourceArgs.push('Comment')
      }
      this.$apollo
        .mutate({
          mutation: gql`
            mutation ($id: ID!, $resource: [Deletable]) {
              DeleteUser(id: $id, resource: $resource) {
                id
              }
            }
          `,
          variables: { id: this.currentUser.id, resource: resourceArgs },
        })
        .then(async () => {
          this.$toast.success(this.$t('settings.deleteUserAccount.success'))
          try {
            await this.logout()
          } catch {
            // Logout-Fehler ignorieren — Account ist bereits gelöscht
          }
          this.$router.push('/')
        })
        .catch((error) => {
          this.$toast.error(error.message)
          this.loading = false
        })
    },
  },
}
</script>

<style>
.delete-data {
  display: flex;
  flex-direction: column;

  > .title > .os-icon {
    color: var(--color-danger);
  }

  > .ds-form-item {
    align-self: flex-start;
    margin-top: var(--space-xxx-small);
  }

  > .notice {
    font-weight: var(--text-weight-bold);
    margin-bottom: var(--space-small);
  }

  > .checkbox {
    margin-left: var(--space-base);
    margin-bottom: var(--space-x-small);

    &:last-of-type {
      margin-bottom: var(--space-small);
    }
  }

  > .warning {
    padding: var(--space-large);
    margin-bottom: var(--space-small);
    border-radius: var(--border-radius-base);

    color: var(--color-danger);
    background-color: var(--color-danger-inverse);
    border-left: 4px solid var(--color-danger);
  }

  > button {
    align-self: flex-start;
  }
}
</style>

<template>
  <div class="add-group-member">
    <h2 class="title">{{ $t('group.addUser') }}</h2>
    <ds-space margin-bottom="small" />
    <ds-space>
      <ds-select
        type="search"
        icon="search"
        label-prop="id"
        v-model="query"
        :id="id"
        :icon-right="null"
        :options="users"
        :loading="$apollo.queries.searchUsers.loading"
        :filter="(item) => item"
        :no-options-available="$t('group.addUserNoOptions')"
        :auto-reset-search="true"
        :placeholder="$t('group.addUserPlaceholder')"
        @focus.capture.native="onFocus"
        @input.native="handleInput"
        @keyup.enter.native="onEnter"
        @keyup.delete.native="onDelete"
        @keyup.esc.native="clear"
        @blur.capture.native="onBlur"
        @input.exact="onSelect"
      >
        <template #option="{ option }">
          <p>
            <user-teaser :user="option" :showPopover="false" :linkToProfile="false" />
          </p>
        </template>
      </ds-select>
      <ds-modal
        v-if="isOpen"
        force
        extended
        :confirm-label="$t('group.modal.confirm')"
        :cancel-label="$t('group.modal.cancel')"
        :title="$t('group.modal.confirmAddGroupMemberTitle')"
        v-model="isOpen"
        @close="closeModal"
        @confirm="confirmModal"
        @cancel="cancelModal"
      >
        <ds-text size="large">
          {{ $t('group.modal.confirmAddGroupMemberText', { name: user.name }) }}
        </ds-text>
      </ds-modal>
    </ds-space>
  </div>
</template>
<script>
import { changeGroupMemberRoleMutation } from '~/graphql/groups.js'
import { searchUsers } from '~/graphql/Search.js'
import UserTeaser from '~/components/UserTeaser/UserTeaser.vue'
import { isEmpty } from 'lodash'

export default {
  name: 'AddGroupMember',
  components: {
    UserTeaser,
  },
  props: {
    groupId: {
      type: String,
      required: true,
    },
    groupMembers: {
      type: Array,
      required: false,
    },
  },
  data() {
    return {
      users: [],
      id: 'search-user-to-add-to-group',
      query: '',
      user: {},
      isOpen: false,
    }
  },
  computed: {
    startSearch() {
      return this.query && this.query.length > 3
    },
  },
  methods: {
    cancelModal() {
      this.clear()
      this.isOpen = false
    },
    closeModal() {
      this.clear()
      this.isOpen = false
    },
    confirmModal() {
      this.addMemberToGroup()
      this.isOpen = false
      this.clear()
    },
    onFocus() {},
    onBlur() {
      this.query = ''
    },
    handleInput(event) {
      this.query = event.target ? event.target.value.trim() : ''
    },
    onDelete(event) {
      const value = event.target ? event.target.value.trim() : ''
      if (isEmpty(value)) {
        this.clear()
      } else {
        this.handleInput(event)
      }
    },
    clear() {
      this.query = ''
      this.user = {}
      this.users = []
    },
    onSelect(item) {
      this.user = item
      if (this.groupMembers.find((member) => member.id === this.user.id)) {
        this.$toast.error(this.$t('group.errors.userAlreadyMember', { name: this.user.name }))
        this.clear()
        return
      }
      this.isOpen = true
    },
    onEnter() {},
    async addMemberToGroup() {
      const newRole = 'usual'
      const username = this.user.name
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: this.user.id, roleInGroup: newRole },
        })
        this.$toast.success(
          this.$t('group.addMemberToGroupSuccess', {
            role: this.$t(`group.roles.${newRole}`),
            name: username,
          }),
        )
        this.$emit('loadGroupMembers')
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
  apollo: {
    searchUsers: {
      query() {
        return searchUsers
      },
      variables() {
        return {
          query: this.query,
          firstUsers: 5,
          usersOffset: 0,
        }
      },
      skip() {
        return !this.startSearch
      },
      update({ searchUsers }) {
        this.users = searchUsers.users
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
<style lang="scss">
.add-group-member {
  background-color: white;
  padding: $space-base;
}
</style>

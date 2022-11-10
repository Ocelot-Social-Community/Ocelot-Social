<template>
  <div class="group-member">
    <base-card>
      <h2 class="title">{{ $t('group.addUser') }}</h2>
      <ds-select
        type="search"
        icon="search"
        v-model="query"
        label-prop="id"
        :icon-right="null"
        :options="users"
        :loading="$apollo.queries.searchUsers.loading"
        :filter="(item) => item"
        :no-options-available="$t('group.addUserPlaceholder')"
        :auto-reset-search="!startSearch"
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
            <!-- ToDo: Avoid redirect to user profile when clicking on slug -->
            <user-teaser :user="option" :showPopover="false" />
          </p>
        </template>
      </ds-select>
    </base-card>
    <ds-table :fields="tableFields" :data="groupMembers" condensed>
      <template #avatar="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <ds-avatar online size="small" :name="scope.row.name"></ds-avatar>
        </nuxt-link>
      </template>
      <template #name="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <ds-text>
            <b>{{ scope.row.name | truncate(20) }}</b>
          </ds-text>
        </nuxt-link>
      </template>
      <template #slug="scope">
        <nuxt-link
          :to="{
            name: 'profile-id-slug',
            params: { id: scope.row.id, slug: scope.row.slug },
          }"
        >
          <ds-text>
            <b>{{ `@${scope.row.slug}` | truncate(20) }}</b>
          </ds-text>
        </nuxt-link>
      </template>
      <template #roleInGroup="scope">
        <select
          v-if="scope.row.myRoleInGroup !== 'owner'"
          :options="['pending', 'usual', 'admin', 'owner']"
          :value="`${scope.row.myRoleInGroup}`"
          @change="changeMemberRole(scope.row.id, $event)"
        >
          <option v-for="role in ['pending', 'usual', 'admin', 'owner']" :key="role" :value="role">
            {{ $t(`group.roles.${role}`) }}
          </option>
        </select>
        <ds-chip v-else color="primary">
          {{ $t(`group.roles.${scope.row.myRoleInGroup}`) }}
        </ds-chip>
      </template>
      <template #edit="scope">
        <ds-button v-if="scope.row.myRoleInGroup !== 'owner'" size="small" primary disabled>
          <!-- TODO: implement removal of group members -->
          <!--           :disabled="scope.row.myRoleInGroup === 'owner'"
          -->
          {{ $t('group.removeMemberButton') }}
        </ds-button>
      </template>
    </ds-table>
    <!-- TODO: implement removal of group members -->
    <!-- TODO: change to ocelot.social modal -->
    <!-- <ds-modal
         v-if="isOpen"
         v-model="isOpen"
         :title="`${$t('group.removeMember')}`"
         force
         extended
         :confirm-label="$t('group.removeMember')"
         :cancel-label="$t('actions.cancel')"
         @confirm="deleteMember(memberId)"
         /> -->
  </div>
</template>
<script>
import { changeGroupMemberRoleMutation } from '~/graphql/groups.js'
import { searchUsers } from '~/graphql/Search.js'
import { isEmpty } from 'lodash'
import UserTeaser from '~/components/UserTeaser/UserTeaser.vue'

export default {
  name: 'GroupMember',
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
      // isOpen: false,
      // memberId: null,
      users: [],
      id: 'search-user-to-add-to-group',
      query: '',
      searchProcess: null,
      user: {},
    }
  },
  computed: {
    tableFields() {
      return {
        avatar: {
          label: this.$t('group.membersAdministrationList.avatar'),
          align: 'left',
        },
        name: {
          label: this.$t('group.membersAdministrationList.name'),
          align: 'left',
        },
        slug: {
          label: this.$t('group.membersAdministrationList.slug'),
          align: 'left',
        },
        roleInGroup: {
          label: this.$t('group.membersAdministrationList.roleInGroup'),
          align: 'left',
        },
        edit: {
          label: '',
          align: 'left',
        },
      }
    },
    startSearch() {
      return this.query && this.query.length > 3
    },
  },
  methods: {
    onFocus(event) {},
    onBlur(event) {
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
      this.addMemberToGroup()
      this.clear()
    },
    onEnter() {},
    async changeMemberRole(id, event) {
      const newRole = event.target.value
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: id, roleInGroup: newRole },
        })
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.$t(`group.roles.${newRole}`) }),
        )
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async addMemberToGroup() {
      const newRole = 'usual'
      if (this.groupMembers.find((member) => member.id === this.user.id)) {
        this.$toast.error(this.$t('group.errors.userAlreadyMember', { slug: this.user.slug }))
        return
      }
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: this.user.id, roleInGroup: newRole },
        })
        this.$emit('loadGroupMembers')
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.$t(`group.roles.${newRole}`) }),
        )
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

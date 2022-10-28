<template>
  <div class="group-member">
    <base-card>
      <h2 class="title">{{ $t('group.addUser') }}</h2>
      <ds-form v-model="form" @submit="submit">
        <ds-flex gutter="small">
          <ds-flex-item width="90%">
            <ds-input
              name="query"
              model="query"
              :placeholder="$t('group.addUserPlaceholder')"
              icon="search"
            />
          </ds-flex-item>
          <ds-flex-item width="30px">
            <!-- <base-button filled circle type="submit" icon="search" :loading="$apollo.loading" /> -->
            <base-button filled circle type="submit" icon="search" />
          </ds-flex-item>
        </ds-flex>
      </ds-form>
      <div v-if="noSlug">Kein User mit diesem Slug gefunden!</div>
      <div v-if="slugUser.length > 0">
        <ds-space margin="base" />
        <ds-flex>
          <ds-flex-item>
            <ds-avatar online size="small" :name="slugUser[0].name"></ds-avatar>
          </ds-flex-item>
          <ds-flex-item>{{ slugUser[0].name }}</ds-flex-item>
          <ds-flex-item>{{ slugUser[0].slug }}</ds-flex-item>
          <ds-flex-item>
            <ds-button size="small" primary @click="addMemberToGroup(slugUser)">
              {{ $t('group.addMemberToGroup') }}
            </ds-button>
          </ds-flex-item>
        </ds-flex>
        <ds-space margin="base" />
      </div>
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
        <ds-button
          v-if="scope.row.myRoleInGroup !== 'owner'"
          size="small"
          primary
          disabled
          @click="deleteMember(scope.row.id)"
        >
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
import { minimisedUserQuery } from '~/graphql/User'
import { changeGroupMemberRoleMutation } from '~/graphql/groups.js'

export default {
  name: 'GroupMember',
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
      isOpen: false,
      memberId: null,
      noSlug: false,
      slugUser: [],
      form: {
        query: '',
      },
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
  },
  methods: {
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
      try {
        await this.$apollo.mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: { groupId: this.groupId, userId: this.slugUser[0].id, roleInGroup: newRole },
        })
        // this.$apollo.queries.GroupMembers.refetch()
        this.$emit('loadGroupMembers')
        this.slugUser = []
        this.form.query = ''
        this.$toast.success(
          this.$t('group.changeMemberRole', { role: this.$t(`group.roles.${newRole}`) }),
        )
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async submit() {
      try {
        const {
          data: { User },
        } = await this.$apollo.query({
          query: minimisedUserQuery(),
          variables: {
            slug: this.form.query,
          },
        })
        if (User.length === 0) {
          this.noSlug = true
        } else {
          this.noSlug = false
          this.slugUser = User
        }
      } catch (error) {
        this.noSlug = true
      } finally {
      }
    },
    // TODO: implement removal of group members
    // openModal(row) {
    //   this.isOpen = true
    //   this.memberId = row.id
    // },
    deleteMember(id) {
      alert('deleteMember: ' + id)
    },
  },
}
</script>

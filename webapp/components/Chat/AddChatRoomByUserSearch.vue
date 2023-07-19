<template>
  <div class="add-chat-room-by-user-search">
    <!-- Wolle -->
    <h2 class="title">{{ $t('group.addUser') }}</h2>
    <ds-space margin-bottom="small" />
    <ds-space>
      <select-user-search :id="id" ref="selectUserSearch" @select-user="selectUser" />
      <!-- <ds-modal
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
      </ds-modal> -->
    </ds-space>
  </div>
</template>

<script>
// import { changeGroupMemberRoleMutation } from '~/graphql/groups.js'
import SelectUserSearch from '~/components/generic/SelectUserSearch/SelectUserSearch'
import UserTeaser from '~/components/UserTeaser/UserTeaser.vue'

export default {
  name: 'AddChatRoomByUserSearch',
  components: {
    UserTeaser,
    SelectUserSearch,
  },
  props: {
    // groupId: {
    //   type: String,
    //   required: true,
    // },
    // chatRooms: {
    //   type: Array,
    //   default: [],
    // },
  },
  data() {
    return {
      id: 'search-user-to-add-to-group',
      user: {},
      // isOpen: false,
    }
  },
  methods: {
    // cancelModal() {
    //   this.$refs.selectUserSearch.clear()
    //   // this.isOpen = false
    // },
    // closeModal() {
    //   this.$refs.selectUserSearch.clear()
    //   // this.isOpen = false
    // },
    // confirmModal() {
    //   this.addChatRoom()
    //   // this.isOpen = false
    //   this.$refs.selectUserSearch.clear()
    // },
    selectUser(user) {
      this.user = user
      // if (this.groupMembers.find((member) => member.id === this.user.id)) {
      //   this.$toast.error(this.$t('group.errors.userAlreadyMember', { name: this.user.name }))
      //   this.$refs.selectUserSearch.clear()
      //   return
      // }
      this.$refs.selectUserSearch.clear()
      this.$emit('close-user-search')
      this.addChatRoom()
    },
    async addChatRoom() {
      this.$emit('load-chat-rooms', 'XXX') // Wolle
      // const newRole = 'usual'
      // const username = this.user.name
      // try {
      //   await this.$apollo.mutate({
      //     mutation: changeGroupMemberRoleMutation(),
      //     variables: { groupId: this.groupId, userId: this.user.id, roleInGroup: newRole },
      //   })
      //   this.$toast.success(
      //     this.$t('group.addMemberToGroupSuccess', {
      //       role: this.$t(`group.roles.${newRole}`),
      //       name: username,
      //     }),
      //   )
      //   this.$emit('loadGroupMembers')
      // } catch (error) {
      //   this.$toast.error(error.message)
      // }
    },
  },
}
</script>

<style lang="scss">
.add-chat-room-by-user-search {
  background-color: white;
  padding: $space-base;
}
</style>

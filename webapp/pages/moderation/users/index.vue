<template>
  <user-list badge-route-name="moderation-users-id" />
</template>

<script>
import UserList from '~/components/_new/features/Admin/UserList/UserList.vue'

export default {
  // badge.manage gates the badge management this page exists for; the email/role
  // columns gate themselves further down (a moderator usually holds neither).
  middleware: ['canManageBadges'],
  components: {
    UserList,
  },
}
</script>

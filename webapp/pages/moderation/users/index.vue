<template>
  <user-list badge-route-name="moderation-users-id" />
</template>

<script>
import UserList from '~/components/_new/features/Admin/UserList/UserList.vue'

export default {
  // Reachable by any per-user moderation capability (badge.manage OR user.delete.any);
  // every column/action inside gates on its own key. email/role gate themselves too (a
  // moderator usually holds neither).
  middleware: ['canManageUsers'],
  components: {
    UserList,
  },
}
</script>

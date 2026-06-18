<template>
  <user-badges :user-id="$route.params.id" />
</template>

<script>
import UserBadges from '~/components/_new/features/Admin/UserBadges/UserBadges.vue'

export default {
  middleware: ['canManageBadges'],
  components: {
    UserBadges,
  },
}
</script>

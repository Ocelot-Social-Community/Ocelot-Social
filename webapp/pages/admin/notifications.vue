<template>
  <base-card>
    <h2 class="title">{{ $t('admin.notifications.name') }}</h2>
    <empty icon="tasks" message="Coming Soon…" />
  </base-card>
</template>

<script>
import Empty from '~/components/Empty/Empty'

export default {
  components: {
    Empty,
  },
}
</script>

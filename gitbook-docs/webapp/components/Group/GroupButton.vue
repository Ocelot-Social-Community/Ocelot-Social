<template>
  <div>
    <nuxt-link to="/groups">
      <base-button
        icon="users"
        circle
        ghost
        v-tooltip="{
          content: $t('group.button.tooltip'),
          placement: 'bottom-start',
        }"
      />
    </nuxt-link>
  </div>
</template>

<script>
export default {}
</script>

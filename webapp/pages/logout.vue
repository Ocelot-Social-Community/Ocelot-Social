<template>
  <div class="ds-container ds-container-small">
    <div class="ds-flex">
      <div style="flex: 0 0 100%; width: 100%; align-self: center">
        <div style="text-align: center" class="ds-mt-large ds-mb-xxx-small ds-space-centered">
          <logo logoType="logout" />
        </div>
        <div style="text-align: center" class="ds-mt-small ds-mb-xxx-small ds-space-centered">
          <h3 class="ds-heading ds-heading-h3 ds-heading-soft">Logging out...</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Logo from '~/components/Logo/Logo'

export default {
  layout: 'blank',
  components: {
    Logo,
  },
  async beforeCreate() {
    await this.$store.dispatch('auth/logout')
    this.$router.replace('/login')
  },
}
</script>

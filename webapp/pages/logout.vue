<template>
  <ds-container width="small">
    <ds-flex>
      <ds-flex-item :width="{ base: '100%' }" centered>
        <ds-space style="text-align: center" margin-top="large" margin-bottom="xxx-small" centered>
          <logo logoType="logout" />
        </ds-space>
        <ds-space style="text-align: center" margin-top="small" margin-bottom="xxx-small" centered>
          <ds-heading tag="h3" soft>Logging out...</ds-heading>
        </ds-space>
      </ds-flex-item>
    </ds-flex>
  </ds-container>
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

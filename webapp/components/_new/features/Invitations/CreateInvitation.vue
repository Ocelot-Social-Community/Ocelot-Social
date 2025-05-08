<template>
  <form @submit.prevent="generateInviteCode" class="generate-invite-code-form">
    <ds-input name="comment" placeholder="Comment" v-model="comment" />
    <base-button class="generate-invite-code" icon="plus" type="submit">
      {{ $t('components.invitations.generate-invite-code') }}
    </base-button>
  </form>
</template>

<script>
export default {
  name: 'CreateInvitation',
  data() {
    return {
      comment: '',
    }
  },
  methods: {
    async generateInviteCode() {
      this.$emit('generate-invite-code', this.comment)
      this.comment = ''
    },
  },
}
</script>

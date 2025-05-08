<template>
  <form @submit.prevent="generateInviteCode" class="generate-invite-code-form">
    <ds-input
      name="comment"
      placeholder="Comment"
      v-model="comment"
      :schema="{ type: 'string', max: 30 }"
    />
    <base-button class="generate-invite-code" icon="plus" type="submit">
      {{ $t('invite-codes.generate-code') }}
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

<style scoped lang="scss">
.generate-invite-code-form {
  display: flex;
  align-items: center;
  gap: $space-x-small;
}

::v-deep .ds-form-item {
  margin-bottom: 0;
}

::v-deep .ds-input-error {
  margin-top: $space-xx-small;
  margin-left: $space-x-small;
}
</style>

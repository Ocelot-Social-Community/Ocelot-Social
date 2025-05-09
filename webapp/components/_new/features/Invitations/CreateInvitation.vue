<template>
  <div class="create-invitation">
    <div>{{ $t('invite-codes.generate-code-explanation') }}</div>
    <form @submit.prevent="generateInviteCode" class="generate-invite-code-form">
      <ds-input
        name="comment"
        :placeholder="$t('invite-codes.comment-placeholder')"
        v-model="comment"
        :schema="{ type: 'string', max: 30 }"
      />
      <base-button circle class="generate-invite-code" icon="plus" type="submit" />
    </form>
  </div>
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
.create-invitation {
  display: flex;
  flex-direction: column;
  gap: $space-small;
}

.generate-invite-code-form {
  display: flex;
  align-items: center;
  gap: $space-x-small;
}

::v-deep .ds-form-item {
  margin-bottom: 0;
  flex: auto;
}

::v-deep .ds-input-error {
  margin-top: $space-xx-small;
  margin-left: $space-x-small;
}
</style>

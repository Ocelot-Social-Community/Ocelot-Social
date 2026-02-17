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
      <os-button
        variant="primary"
        appearance="outline"
        circle
        class="generate-invite-code"
        :aria-label="$t('invite-codes.generate-code')"
        type="submit"
        :disabled="disabled"
      >
        <template #icon>
          <os-icon :icon="icons.plus" />
        </template>
      </os-button>
    </form>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

export default {
  name: 'CreateInvitation',
  components: { OsButton, OsIcon },
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      comment: '',
    }
  },
  created() {
    this.icons = ocelotIcons
  },
  methods: {
    generateInviteCode() {
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

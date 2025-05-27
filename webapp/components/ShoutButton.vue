<template>
  <ds-space margin="xx-small" class="text-align-center">
    <base-button
      :loading="loading"
      :disabled="disabled"
      :filled="shouted"
      icon="heart-o"
      circle
      @click="toggle"
    />
    <ds-space margin-bottom="xx-small" />
    <ds-text color="soft" class="shout-button-text">
      <ds-heading style="display: inline" tag="h3">{{ shoutedCount }}x</ds-heading>
      {{ $t('shoutButton.shouted') }}
    </ds-text>
  </ds-space>
</template>

<script>
import gql from 'graphql-tag'

export default {
  props: {
    nodeType: { type: String },
    count: { type: Number, default: 0 },
    nodeId: { type: String, default: null },
    isShouted: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: false,
      shoutedCount: this.count,
      shouted: false,
    }
  },
  watch: {
    isShouted: {
      immediate: true,
      handler: function (shouted) {
        this.shouted = shouted
      },
    },
  },
  methods: {
    toggle() {
      const shout = !this.shouted
      const mutation = shout ? 'shout' : 'unshout'
      const count = shout ? this.shoutedCount + 1 : this.shoutedCount - 1

      const backup = {
        shoutedCount: this.shoutedCount,
        shouted: this.shouted,
      }

      this.shoutedCount = count
      this.shouted = shout

      this.$apollo
        .mutate({
          mutation: gql`
            mutation($id: ID!, $type: ShoutTypeEnum!) {
              ${mutation}(id: $id, type: $type)
            }
          `,
          variables: {
            id: this.nodeId,
            type: this.nodeType,
          },
        })
        .then((res) => {
          if (res && res.data) {
            this.$emit('update', shout)
          }
        })
        .catch(() => {
          this.shoutedCount = backup.shoutedCount
          this.shouted = backup.shouted
        })
        .finally(() => {
          this.loading = false
        })
    },
  },
}
</script>

<style lang="scss">
.shout-button-text {
  user-select: none;
}
.text-align-center {
  text-align: center;
}
</style>

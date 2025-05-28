<template>
  <action-button
    :loading="loading"
    :disabled="disabled"
    :filled="shouted"
    :count="shoutedCount"
    :text="$t('shoutButton.shouted')"
    icon="heart-o"
    @click="toggle"
  />
</template>

<script>
import gql from 'graphql-tag'

import ActionButton from '~/components/ActionButton.vue'

export default {
  components: {
    ActionButton,
  },
  props: {
    count: { type: Number, default: 0 },
    nodeType: { type: String },
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

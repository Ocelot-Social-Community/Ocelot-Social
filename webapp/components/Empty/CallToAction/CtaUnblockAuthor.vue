<template>
  <ds-space centered margin="xxx-small">
    <ds-space margin-bottom="small" />
    <ds-heading tag="h4">
      {{ $t('contribution.comment.commenting-disabled.blocked-author.reason') }}
    </ds-heading>
    <ds-text>
      {{ $t('contribution.comment.commenting-disabled.blocked-author.call-to-action') }}
    </ds-text>
    <os-button as="nuxt-link" :to="authorLink" variant="primary" appearance="filled">
      <template #icon><os-icon :icon="icons.arrowRight" /></template>
      {{
        $t('contribution.comment.commenting-disabled.blocked-author.button-label', {
          name: author.name,
        })
      }}
    </os-button>
  </ds-space>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

export default {
  name: 'CtaUnblockAuthor',
  components: { OsButton, OsIcon },
  props: {
    author: {
      type: Object,
      required: true,
    },
  },
  computed: {
    authorLink() {
      const { id, slug } = this.author
      return { name: 'profile-id-slug', params: { slug, id } }
    },
  },
  created() {
    this.icons = ocelotIcons
  },
}
</script>

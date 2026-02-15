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
      <template #icon><base-icon name="arrow-right" /></template>
      {{
        $t('contribution.comment.commenting-disabled.blocked-author.button-label', {
          name: author.name,
        })
      }}
    </os-button>
  </ds-space>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  name: 'CtaUnblockAuthor',
  components: { OsButton },
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
}
</script>

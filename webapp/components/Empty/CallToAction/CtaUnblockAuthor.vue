<template>
  <div class="ds-my-xxx-small ds-space-centered">
    <div class="ds-mb-small"></div>
    <h4 class="ds-heading ds-heading-h4">
      {{ $t('contribution.comment.commenting-disabled.blocked-author.reason') }}
    </h4>
    <p class="ds-text">
      {{ $t('contribution.comment.commenting-disabled.blocked-author.call-to-action') }}
    </p>
    <os-button as="nuxt-link" :to="authorLink" variant="primary" appearance="filled">
      <template #icon><os-icon :icon="icons.arrowRight" /></template>
      {{
        $t('contribution.comment.commenting-disabled.blocked-author.button-label', {
          name: author.name,
        })
      }}
    </os-button>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'CtaUnblockAuthor',
  components: { OsButton, OsIcon },
  props: {
    author: {
      type: Object,
      required: true,
      validator: (value) => 'id' in value && 'slug' in value && 'name' in value,
    },
  },
  computed: {
    authorLink() {
      const { id, slug } = this.author
      return { name: 'profile-id-slug', params: { slug, id } }
    },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

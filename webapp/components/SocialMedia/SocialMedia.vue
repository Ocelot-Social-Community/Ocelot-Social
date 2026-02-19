<template>
  <div v-if="user.socialMedia && user.socialMedia.length" class="ds-my-large">
    <os-card class="social-media-bc">
      <div class="ds-my-x-small">
        <h5 class="ds-text ds-text-soft" data-test="social-media-list-headline">
          {{ $t('profile.socialMedia') }} {{ userName | truncate(15) }}?
        </h5>
        <template>
          <div v-for="link in socialMediaLinks()" :key="link.id" class="ds-my-x-small">
            <a :href="link.url" target="_blank">
              <img :src="link.favicon" alt="Link:" height="22" width="22" />
              {{ link.username }}
            </a>
          </div>
        </template>
      </div>
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'

export default {
  name: 'social-media',
  components: { OsCard },
  props: {
    userName: { type: String, required: true },
    user: { type: Object, required: true },
  },
  methods: {
    socialMediaLinks() {
      const { socialMedia = [] } = this.user
      return socialMedia.map((socialMedia) => {
        const { url } = socialMedia
        const matches = url.match(/^(?:https?:\/\/)?(?:[^@\n])?(?:www\.)?([^:/\n?]+)/g)
        const [domain] = matches || []
        const favicon = domain ? `${domain}/favicon.ico` : null
        const username = url.split('/').pop()
        return { url, username, favicon }
      })
    },
  },
}
</script>

<style scoped>
.social-media-bc {
  position: relative;
  height: auto;
}
</style>

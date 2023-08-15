<template>
  <ds-space v-if="user.socialMedia && user.socialMedia.length" margin="large">
    <base-card class="social-media-bc">
      <ds-space margin="x-small">
        <ds-text tag="h5" color="soft" data-test="social-media-list-headline">
          {{ $t('profile.socialMedia') }} {{ userName | truncate(15) }}?
        </ds-text>
        <template>
          <ds-space v-for="link in socialMediaLinks()" :key="link.id" margin="x-small">
            <a :href="link.url" target="_blank">
              <img :src="link.favicon" alt="Link:" height="22" width="22" />
              {{ link.username }}
            </a>
          </ds-space>
        </template>
      </ds-space>
    </base-card>
  </ds-space>
</template>

<script>
export default {
  name: 'social-media',
  props: {
    userName: {},
    user: {},
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

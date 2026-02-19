<template>
  <os-card>
    <h2 class="title">{{ $t('settings.download.name') }}</h2>
    <os-button
      variant="primary"
      appearance="filled"
      :disabled="loading"
      :loading="loading"
      @click="onClick(jsonData)"
    >
      <template #icon><os-icon :icon="icons.download" /></template>
      {{ $t('settings.download.json') }}
    </os-button>
    <div class="ds-my-large"></div>
    <p class="ds-text">{{ $t('settings.download.description') }}</p>
    <div class="ds-my-large"></div>
    <os-card v-for="image in imageList" :key="image.key">
      <a :href="image.url" target="_blank" rel="noopener noreferrer">{{ image.title }}</a>
      <div class="ds-my-xxx-small"></div>
    </os-card>
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import { userDataQuery } from '~/graphql/User'
import isEmpty from 'lodash/isEmpty'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsButton,
    OsCard,
    OsIcon,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      userData: {},
      loading: true,
      imageList: [],
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    jsonData() {
      return { data: JSON.stringify(this.userData, null, 2), type: 'json' }
    },
  },
  methods: {
    onClick(method) {
      var fileURL = window.URL.createObjectURL(new Blob([method.data]))
      var fileLink = document.createElement('a')
      fileLink.href = fileURL
      fileLink.setAttribute('download', 'userData.' + method.type)
      document.body.appendChild(fileLink)
      fileLink.click()
    },
  },
  apollo: {
    queryUserData: {
      query() {
        return userDataQuery()
      },
      variables() {
        return { id: this.user.id }
      },
      update({ userData }) {
        this.userData = userData
        this.loading = false
        if (isEmpty(this.userData)) return null
        const userId = this.userData.user.id
        if (isEmpty(userId)) return null
        this.imageList = this.userData.posts
          .filter((post) => post.author.id === userId && post.image)
          .map((post) => {
            const obj = {}
            obj.key = post.id
            obj.url = post.image.url
            obj.title = post.title
            return obj
          })
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

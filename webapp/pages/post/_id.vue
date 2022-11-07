<template>
  <transition name="slide-up" appear>
    <nuxt-child />
  </transition>
</template>

<script>
import gql from 'graphql-tag'
import PersistentLinks from '~/mixins/persistentLinks.js'

const options = {
  queryId: gql`
    query ($idOrSlug: ID) {
      Post(id: $idOrSlug) {
        id
        slug
      }
    }
  `,
  querySlug: gql`
    query ($idOrSlug: String) {
      Post(slug: $idOrSlug) {
        id
        slug
      }
    }
  `,
  path: 'post',
  message: 'error-pages.post-not-found',
}
const persistentLinks = PersistentLinks(options)

export default {
  mixins: [persistentLinks],
}
</script>

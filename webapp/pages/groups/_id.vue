<template>
  <nuxt-child />
</template>

<script>
import gql from 'graphql-tag'
import PersistentLinks from '~/mixins/persistentLinks.js'

const options = {
  queryId: gql`
    query ($idOrSlug: ID) {
      Group(id: $idOrSlug) {
        id
        slug
      }
    }
  `,
  querySlug: gql`
    query ($idOrSlug: String) {
      Group(slug: $idOrSlug) {
        id
        slug
      }
    }
  `,
  message: 'error-pages.group-not-found',
  path: 'groups',
}
const persistentLinks = PersistentLinks(options)

export default {
  mixins: [persistentLinks],
}
</script>

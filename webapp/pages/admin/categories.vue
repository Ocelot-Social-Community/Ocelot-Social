<template>
  <os-card>
    <h2 class="title">{{ $t('admin.categories.name') }}</h2>
    <ds-table :data="Category" :fields="fields" condensed>
      <template #icon="scope">
        <os-icon :icon="resolveIcon(scope.row.icon)" />
      </template>
    </ds-table>
  </os-card>
</template>

<script>
import { OsCard, OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'
import gql from 'graphql-tag'

export default {
  components: { OsCard, OsIcon },
  data() {
    return {
      Category: [],
    }
  },
  computed: {
    fields() {
      return {
        icon: ' ',
        name: this.$t('admin.categories.categoryName'),
        postCount: {
          label: this.$t('admin.categories.postCount'),
          align: 'right',
        },
      }
    },
  },
  methods: {
    resolveIcon(iconName) {
      return resolveIcon(iconName)
    },
  },
  apollo: {
    Category: {
      query: gql`
        query {
          Category(orderBy: postCount_desc) {
            id
            name
            slug
            icon
            postCount
          }
        }
      `,
    },
  },
}
</script>

<template>
  <base-card>
    <h2 class="title">{{ $t('admin.categories.name') }}</h2>
    <ds-table :data="Category" :fields="fields" condensed>
      <template #icon="scope">
        <os-icon :icon="resolveIcon(scope.row.icon)" />
      </template>
    </ds-table>
  </base-card>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry, toCamelCase } from '~/utils/iconRegistry'
import gql from 'graphql-tag'

export default {
  components: { OsIcon },
  data() {
    return {
      Category: [],
    }
  },
  methods: {
    resolveIcon(iconName) {
      const icon = iconRegistry[toCamelCase(iconName)]
      if (!icon) console.warn(`[AdminCategories] Unknown icon: "${iconName}"`)
      return icon
    },
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

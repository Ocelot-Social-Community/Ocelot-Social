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
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
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
      const camel = iconName
        .split('-')
        .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
        .join('')
      return ocelotIcons[camel]
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

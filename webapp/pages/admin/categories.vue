<template>
  <os-card>
    <h2 class="title">{{ $t('admin.categories.name') }}</h2>
    <div class="ds-table-wrap">
      <table class="ds-table ds-table-condensed ds-table-bordered">
        <thead>
          <tr>
            <th class="ds-table-head-col" aria-hidden="true"></th>
            <th scope="col" class="ds-table-head-col">{{ $t('admin.categories.categoryName') }}</th>
            <th scope="col" class="ds-table-head-col ds-table-head-col-right">
              {{ $t('admin.categories.postCount') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in Category" :key="category.id">
            <td class="ds-table-col">
              <os-icon :icon="resolveIcon(category.icon)" />
            </td>
            <td class="ds-table-col">{{ category.name }}</td>
            <td class="ds-table-col ds-table-col-right">{{ category.postCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
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

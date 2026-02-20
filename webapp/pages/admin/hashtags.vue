<template>
  <os-card>
    <h2 class="title">{{ $t('admin.hashtags.name') }}</h2>
    <div class="ds-table-wrap">
      <table class="ds-table ds-table-condensed ds-table-bordered">
        <thead>
          <tr>
            <th class="ds-table-head-col">{{ $t('admin.hashtags.number') }}</th>
            <th class="ds-table-head-col">{{ $t('admin.hashtags.nameOfHashtag') }}</th>
            <th class="ds-table-head-col ds-table-head-col-right">
              {{ $t('admin.hashtags.tagCountUnique') }}
            </th>
            <th class="ds-table-head-col ds-table-head-col-right">
              {{ $t('admin.hashtags.tagCount') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(tag, index) in Tag" :key="tag.id">
            <td class="ds-table-col">{{ index + 1 }}.</td>
            <td class="ds-table-col">
              <nuxt-link :to="{ path: '/', query: { hashtag: encodeURI(tag.id) } }">
                <b>#{{ tag.id | truncateStr(20) }}</b>
              </nuxt-link>
            </td>
            <td class="ds-table-col ds-table-col-right">{{ tag.taggedCountUnique }}</td>
            <td class="ds-table-col ds-table-col-right">{{ tag.taggedCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import gql from 'graphql-tag'

export default {
  components: { OsCard },
  data() {
    return {
      Tag: [],
    }
  },
  apollo: {
    Tag: {
      query: gql`
        query {
          Tag(first: 20, orderBy: taggedCountUnique_desc) {
            id
            taggedCount
            taggedCountUnique
          }
        }
      `,
    },
  },
}
</script>

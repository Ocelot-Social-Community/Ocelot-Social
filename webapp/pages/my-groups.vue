<template>
  <div>
    <div>my groups</div>
    <group-teaser />
    <group-list :items="responseGroupListQuery" :fields="fields" />
    <br />
    <br />
    <group-card :items="responseGroupListQuery" />
  </div>
</template>
<script>
import GroupTeaser from '~/components/GroupTeaser/GroupTeaser.vue'
import GroupList from '~/components/GroupList/GroupList.vue'
import GroupCard from '~/components/GroupList/GroupCard.vue'
import { groupQuery } from '~/graphql/groups.js'

/*
 *
 * gruppen status: { open, close, hidden }
 *
 *
 */
export default {
  name: 'MyGroups',
  components: {
    GroupTeaser,
    GroupList,
    GroupCard,
  },
  data() {
    return {
      responseGroupListQuery: [],
      fields: ['delete', 'name', 'about', 'categories', 'edit'],
    }
  },
  methods: {
    async groupListQuery() {
      try {
        const response = await this.$apollo.query({
          query: groupQuery,
        })
        this.responseGroupListQuery = response.data.Group
      } catch (error) {
        this.responseGroupListQuery = []
      } finally {
        this.pending = false
      }
    },
  },
  created() {
    this.groupListQuery()
  },
}
</script>

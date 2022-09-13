<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">My Groups</h1>
    <group-teaser />
    <br />
    <br />
    <group-card :items="responseGroupListQuery" />
  </div>
</template>
<script>
import GroupTeaser from '~/components/Group/GroupTeaser.vue'
import GroupCard from '~/components/Group/GroupCard.vue'
import { groupQuery } from '~/graphql/groups.js'

export default {
  name: 'MyGroups',
  components: {
    GroupTeaser,
    GroupCard,
  },
  data() {
    return {
      responseGroupListQuery: [],
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

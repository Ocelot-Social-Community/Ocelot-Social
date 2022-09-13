<template>
  <div><ds-section>
    <h1 class="ds-heading ds-heading-h1">My Groups</h1>
    <nuxt-link :to="{ name: 'group-create' }">
          <base-button
            v-tooltip="{
              content: $t('group.newGroup'),
              placement: 'left',
              delay: { show: 500 },
            }"
            :path="{ name: 'group-create' }"
            class="profile-post-add-button"
            icon="plus"
            circle
            filled
          />
        </nuxt-link></ds-section>
    <br />
    <br />
    <group-list :items="responseGroupListQuery" />
  </div>
</template>
<script>
import GroupList from '~/components/Group/GroupList.vue'
import { groupQuery } from '~/graphql/groups.js'

export default {
  name: 'MyGroups',
  components: {
    GroupList,
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

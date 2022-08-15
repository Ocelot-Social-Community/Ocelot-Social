<template>
  <div>
    <ds-container class="group-list">
      <ds-space><h2>Group List</h2></ds-space>
      <ds-table :data="items" :fields="fields">
        <template slot="delete" slot-scope="scope">
          <base-button
            v-if="scope.row.owner"
            icon="trash"
            @click="deleteGroup(scope.row)"
          ></base-button>
        </template>
        <template slot="name" slot-scope="scope">
          <nuxt-link to="/group/g1/testgruppe">{{ scope.row.name }}</nuxt-link>
        </template>
        <template slot="status" slot-scope="scope">
          <ds-tag :color="status">{{ scope.row.status }}</ds-tag>
        </template>
        <template slot="edit" slot-scope="scope">
          <base-button
            v-if="!scope.row.owner"
            icon="close"
            @click="unfollowGroup(scope.row)"
          ></base-button>

          <nuxt-link :to="{ name: 'group-create' }">
            <ds-icon v-show="scope.row.owner" name="ellipsis-v"></ds-icon>
          </nuxt-link>
        </template>
      </ds-table>
    </ds-container>
  </div>
</template>
<script lang="ts">
export default {
  name: 'GroupList',
  props: {
    items: { type: Array, default: () => [] },
    fields: { type: Array, default: () => [] },
  },
  methods: {
    deleteGroup() {
      alert('delete group')
    },
    unfollowGroup() {
      alert('unfollow group')
    },
  },
  computed: {
    status(state) {
      console.log(state)
      // if (scope === 'hidden') return 'danger'
      return 'inverse'
    },
  },
}
</script>

<template>
  <div>
    <ds-container class="group-list">
      <ds-space><h2>Group List</h2></ds-space>
      <ds-table :data="items" :fields="fields">
        <template slot="delete" slot-scope="scope">
          <base-button
            v-if="scope.row.myRole === 'owner'"
            icon="trash"
            @click="deleteGroup(scope.row)"
          ></base-button>
        </template>
        <template slot="name" slot-scope="scope">
          <nuxt-link :to="`/group/g1/${scope.row.name}`">{{ scope.row.name }}</nuxt-link>
          <small>{{ scope.row }}</small>
        </template>
        <template slot="categories" slot-scope="scope">
          <ds-tag v-for="categorie in scope.row.categories" :key="categorie.id" color="primary">
            {{ categorie.name }}
          </ds-tag>
        </template>
        <template slot="edit" slot-scope="scope">
          <base-button
            v-if="scope.row.myRole === 'owner'"
            icon="edit"
            @click="editGroup(scope.row)"
          ></base-button>

          <nuxt-link :to="{ name: 'group-create' }">
            <ds-icon v-show="scope.row.owner" name="ellipsis-v"></ds-icon>
          </nuxt-link>
        </template>
        <template slot="unfollow" slot-scope="scope">
          <base-button
            v-if="scope.row.myRole === 'usual'"
            icon="close"
            @click="unfollowGroup(scope.row)"
          ></base-button>
          <base-button
            v-if="scope.row.myRole === null"
            icon="plus"
            @click="addMemeberToGroup(scope.row)"
          ></base-button>
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
    editGroup(formData) {
      this.$router.push({ path: `/group/edit/${formData.id}` })
    },
    deleteGroup() {
      alert('delete group')
    },
    unfollowGroup() {
      alert('unfollow group')
    },
    addMemeberToGroup() {
      alert('addMemeberToGroup group')
    },
  },
  computed: {},
}
</script>

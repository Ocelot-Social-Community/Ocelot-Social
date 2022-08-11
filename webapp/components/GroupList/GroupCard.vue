<template>
  <div>
    <ds-container class="group-card">
      <ds-space><h2>Group Card</h2></ds-space>
      <ds-grid>
        <ds-grid-item v-for="item in items" :key="item.id" :row-span="8">
        <ds-placeholder>
        <base-button
            v-if="item.owner"
            icon="trash"
            @click="deleteGroup(item)"
          ></base-button>
          <nuxt-link to="/group/g1/testgruppe"> {{ item.name }}</nuxt-link> 
          <base-button
            v-if="!item.owner"
            icon="close"
            @click="unfollowGroup(item.row)"
          ></base-button>
          <nuxt-link :to="{ name: 'group-create' }">
            <ds-icon v-show="item.owner" name="ellipsis-v"></ds-icon>
          </nuxt-link>
          </ds-placeholder>
        </ds-grid-item>
      </ds-grid>
    </ds-container>
  </div>
</template>
<script lang="ts">
export default {
  name: 'GroupList',
  props: {
    items: { type: Array, default: () => [] },
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

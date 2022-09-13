<template>
  <div>
    <ds-container class="group-card">
      <ds-card v-for="item in items" :key="item.id" space="xx-small">
        <nuxt-link :to="`/group/${item.id}`">{{ item.name }}</nuxt-link>
        {{ item.categories ? item.categories.map((category) => category.name) : [] }}
        <div>{{ item }}</div>
        <ds-space>
          <base-button
            v-if="item.myRole === 'owner'"
            icon="trash"
            @click="deleteGroup(item)"
          ></base-button>
          <base-button
            v-if="item.myRole === 'pending'"
            icon="question-circle"
            @click="removePending(item)"
          ></base-button>
          <base-button
            v-if="item.myRole === 'owner'"
            icon="edit"
            @click="editGroup(item)"
          ></base-button>
          <base-button
            v-if="item.myRole === 'usual'"
            icon="close"
            @click="unfollowGroup(item)"
          ></base-button>
          <base-button
            v-if="item.myRole === null"
            icon="plus"
            @click="addMemeberToGroup(item)"
          ></base-button>
        </ds-space>
      </ds-card>
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
    removePending() {
      alert('removePending group')
    },
    editGroup(item) {
      this.$router.push({ path: `/group/edit/${item.id}` })
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
}
</script>

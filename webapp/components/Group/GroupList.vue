<template>
  <div>
    <ds-container class="group-card">
      <ds-flex v-for="item in items" :key="item.id" class="border-bottom">
      <ds-flex-item width="80%" centered>
        <ds-space margin="large">
          <nuxt-link :to="`/group/${item.id}`">
            <ds-text size="x-large">{{ item.name }}</ds-text>
          </nuxt-link>
          <div>
            <ds-space margin-top="small">
              {{ item.about }}
            </ds-space>
          </div>
          <ds-space margin-top="small">
            <ds-chip v-if="item.groupType === 'public'" color="primary">{{item.groupType}}</ds-chip>
            <ds-chip v-if="item.groupType === 'hidden'" color="warning">{{item.groupType}}</ds-chip>
            <ds-chip v-if="item.groupType === 'closed'" color="danger">{{item.groupType}}</ds-chip>
            <ds-chip v-for="category in item.categories" :key="category.name">
              <ds-icon :name="category.icon"></ds-icon> 
              {{category.name}}
            </ds-chip>
          </ds-space>
        </ds-space>
      </ds-flex-item>
      <ds-flex-item width="20%" centered>
        
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
        
      </ds-flex-item>
    </ds-flex>
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
<style scoped>
.border-bottom {
  border-bottom: 1px solid #17b53f;
  background-color: rgb(255, 255, 255);
  padding-left: 20px;
}
</style>

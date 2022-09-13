<template>
  <div>
    <ds-container class="group-card">
      <ds-space>
        <div @click="onlyOwnerGroups(true)" ref="myGruops">show only my groups</div>
        <div @click="onlyOwnerGroups(false)" ref="allGruops" hidden>show all groups</div>
      </ds-space>
      <ds-flex
        v-for="item in items"
        :key="item.id"
        class="border-bottom"
        :ref="item.myRole === null ? 'null' : item.myRole"
      >
        <ds-flex-item width="90%" centered>
          {{ item.myRole }}
          <ds-space margin="large">
            <nuxt-link :to="`/group/${item.id}`">
              <ds-text size="x-large">{{ item.name }}</ds-text>
            </nuxt-link>

            <ds-chip v-if="item.groupType === 'public'" color="primary">
              {{ item.groupType }}
            </ds-chip>
            <ds-chip v-if="item.groupType === 'hidden'" color="warning">
              {{ item.groupType }}
            </ds-chip>
            <ds-chip v-if="item.groupType === 'closed'" color="danger">
              {{ item.groupType }}
            </ds-chip>
            <ds-chip v-if="item.myRole === 'owner'" color="inverse">{{ item.myRole }}</ds-chip>
            <ds-chip v-if="item.myRole === 'usual' || item.myRole === 'pending'">
              {{ item.myRole }}
            </ds-chip>

            <div>
              <ds-space margin-top="small">
                {{ item.about }}
              </ds-space>
            </div>
            <ds-space margin-top="small">
              <ds-chip v-for="category in item.categories" :key="category.name">
                <ds-icon :name="category.icon"></ds-icon>
                {{ category.name }}
              </ds-chip>
            </ds-space>
          </ds-space>
        </ds-flex-item>
        <ds-flex-item width="10%" centered>
          <group-menu resource-type="group" :resource="item" :isOwner="item.myRole" />
        </ds-flex-item>
      </ds-flex>
    </ds-container>
  </div>
</template>
<script>
import GroupMenu from '~/components/Group/GroupMenu'

export default {
  name: 'GroupList',
  components: {
    GroupMenu,
  },
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
    onlyOwnerGroups(bool) {
      this.$refs.myGruops.hidden = bool
      this.$refs.allGruops.hidden = !bool

      if (this.$refs.usual) {
        this.$refs.usual.forEach((element) => {
          element.$el.hidden = bool
        })
      }

      if (this.$refs.null) {
        this.$refs.null.forEach((element) => {
          element.$el.hidden = bool
        })
      }

      if (this.$refs.pending) {
        this.$refs.pending.forEach((element) => {
          element.$el.hidden = bool
        })
      }
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

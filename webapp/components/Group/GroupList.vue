<template>
    <ds-container class="group-card">
      <ds-space>
        <div @click="onlyOwnerGroups(true)" ref="myGruops"><ds-button >show only my groups</ds-button ></div>
        <div @click="onlyOwnerGroups(false)" ref="allGruops" hidden><ds-button >show all groups</ds-button ></div>
      </ds-space>
      <ds-space margin-bottom="small" v-for="item in items" :key="item.id"> 
        <ds-card  :ref="item.myRole === null ? 'null' : item.myRole">
          <ds-flex>
            <ds-flex-item width="90%" centered>
              <ds-space margin="large">
              <nuxt-link :to="`/group/${item.id}`">
                <ds-text size="x-large">{{ item.name }}</ds-text>
              </nuxt-link> 
              <ds-text size="small">
                {{ item.groupType }}
                <ds-chip v-if="item.myRole === 'owner'" color="inverse">{{ item.myRole }}</ds-chip>
                <ds-chip v-if="item.myRole === 'usual' || item.myRole === 'pending'">
                  {{ item.myRole }}
                </ds-chip>
              </ds-text>
              <ds-space margin-top="small">
                <ds-text bold>{{ item.about }}</ds-text> 
              </ds-space>
              <ds-space margin-top="small">
               <div v-html="item.descriptionExcerpt"></div>
              </ds-space>
              <ds-space margin-top="small">
                <ds-chip v-for="category in item.categories" :key="category.name">
                <ds-icon :name="category.icon"></ds-icon>
                  {{ category.name }}
                </ds-chip>
                <ds-space margin="x-small">
                  <div v-if="item.locationName">{{ item.locationName }}</div>
                  <div v-if="item.actionRadius">{{ item.actionRadius }}</div>
                </ds-space>
              </ds-space>
            </ds-space>
          </ds-flex-item>
          <ds-flex-item width="10%" centered>
            <group-menu v-if="item.myRole === 'owner'" resource-type="group" :resource="item" :isOwner="item.myRole" @joinGroup="joinGroup"/>
          </ds-flex-item>
        </ds-flex>
      </ds-card>
    </ds-space>
  </ds-container>
</template>
<script>
import GroupMenu from '~/components/Group/GroupMenu'
import { joinGroupMutation } from '~/graphql/groups.js'

export default {
  name: 'GroupList',
  components: {
    GroupMenu,
  },
  props: {
    items: { type: Array, default: () => [] },
  },
  methods: {
    editGroup(item) {
      this.$router.push({ path: `/group/edit/${item.id}` })
    },
    async joinGroup(value) {
      const { id } = value
      const variables = { groupId: id, userId: this.$store.getters['auth/user'].id }
      try {
         await this.$apollo.mutate({
           mutation: joinGroupMutation,
           variables,
         })
        this.$toast.success(this.$t('group.group-created'))
      } catch (error) {
        this.$toast.error(error.message)
      }
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

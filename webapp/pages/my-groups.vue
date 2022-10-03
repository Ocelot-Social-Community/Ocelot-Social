<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('group.myGroups') }}</ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-container>
      <!-- create group -->
      <ds-space centered>
        <nuxt-link :to="{ name: 'group-create' }">
          <base-button
            class="group-add-button"
            icon="plus"
            size="large"
            circle
            filled
            v-tooltip="{
              content: $t('group.createNewGroup.tooltip'),
              placement: 'left',
            }"
          />
        </nuxt-link>
      </ds-space>
      <!-- group list -->
      <group-list :groups="myGroups" />
    </ds-container>
  </div>
</template>

<script>
import GroupList from '~/components/Group/GroupList'
import { groupQuery } from '~/graphql/groups.js'

export default {
  name: 'MyGroups',
  components: {
    GroupList,
  },
  data() {
    return {
      Group: [],
    }
  },
  computed: {
    myGroups() {
      return this.Group ? this.Group : []
    },
  },
  apollo: {
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          isMember: true,
        }
      },
      error(error) {
        this.Group = []
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
.group-add-button {
  box-shadow: $box-shadow-x-large;
}
</style>

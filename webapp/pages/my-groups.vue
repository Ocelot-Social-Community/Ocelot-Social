<template>
  <div>
    <div>my groups</div>
    <group-teaser />
    <group-list :items="items" :fields="fields" />
    <br />
    <br />
    <group-card :items="items" :responseGroupListQuery="responseGroupListQuery" />
  </div>
</template>
<script>
import GroupTeaser from '~/components/GroupTeaser/GroupTeaser.vue'
import GroupList from '~/components/GroupList/GroupList.vue'
import GroupCard from '~/components/GroupList/GroupCard.vue'
import { groupQuery } from '~/graphql/groups.js'

/*
 *
 * gruppen status: { open, close, hidden }
 *
 *
 */
export default {
  name: 'MyGroups',
  components: {
    GroupTeaser,
    GroupList,
    GroupCard,
  },
  data() {
    return {
      responseGroupListQuery: [],
      fields: ['delete', 'name', 'desc', 'status', 'edit'],
      items: [
        {
          id: 0,
          name: 'Rengar',
          desc: 'Rengar Jungler Rengar Jungler Rengar Jungler Rengar Jungler Rengar Jungler ',
          status: 'open',
          owner: true,
        },
        {
          id: 1,
          name: 'Renekton',
          desc:
            'Renekton Toplaner Renekton Toplaner Renekton Toplaner Renekton Toplaner Renekton Toplaner ',
          status: 'open',
          owner: false,
        },
        {
          id: 2,
          name: 'Twitch',
          desc: 'Twitch ADC',
          status: 'close',
          owner: true,
        },
        {
          id: 3,
          name: 'Blitz',
          desc: 'Blitz Support',
          status: 'hidden',
          owner: true,
        },
      ],
    }
  },
  methods: {
    async groupListQuery() {
      try {
        const response = await this.$apollo.query({
          query: groupQuery,
        })
        this.responseGroupListQuery = response.data
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

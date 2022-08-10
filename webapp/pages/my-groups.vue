<template>
  <div>
    <div>my groups</div>
    <group-teaser />
    <group-list :items="items" :fields="fields"/>
  </div>
</template>
<script>
import GroupTeaser from '~/components/GroupTeaser/GroupTeaser.vue'
import GroupList from  '~/components/GroupList/GroupList.vue'

export default {
  name: 'MyGroups',
  components: {
    GroupTeaser,
    GroupList
  },
  data() {
      return {
         fields: ['name', 'type', 'loves', 'edit'],
        items: [
          {
            name: 'Rengar',
            type: 'Jungler',
            loves: 'Hide and seek'
          },
          {
            name: 'Renekton',
            type: 'Toplaner',
            loves: 'Slice and dice'
          },
          {
            name: 'Twitch',
            type: 'ADC',
            loves: 'Spray and pray'
          },
          {
            name: 'Blitz',
            type: 'Support',
            loves: 'Hook you up'
          }
        ]
      }
    }
}
</script>

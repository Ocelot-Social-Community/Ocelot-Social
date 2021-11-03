<template>
  <my-something-list>
    <template #list-item="{ link }">
      <social-media-list-item :link="link" />
    </template>
  </my-something-list>
</template>

<script>
import MySomethingList from '~/components/_new/features/MySomethingList/MySomethingList.vue'
import SocialMediaListItem from '~/components/_new/features/SocialMedia/SocialMediaListItem.vue'

export default {
  components: {
    MySomethingList,
    SocialMediaListItem,
  },
}
</script>

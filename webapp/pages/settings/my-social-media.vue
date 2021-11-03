<template>
  <my-something-list :useFormData="useFormData" :useFormSchema="useFormSchema">
    <template #list-item="{ link }">
      <social-media-list-item :link="link" />
    </template>
    <template #edit-item>
      <ds-input
        id="editSocialMedia"
        model="socialMediaUrl"
        type="text"
        :placeholder="$t('settings.social-media.placeholder')"
      />
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
  data() {
    return {
      useFormData: {
        socialMediaUrl: '',
      },
      useFormSchema: {
        socialMediaUrl: {
          type: 'url',
          message: this.$t('common.validations.url'),
        },
      },
    }
  },
}
</script>

<template>
  <my-something-list
    :useFormData="useFormData"
    :useFormSchema="useFormSchema"
    :callbackEdit="callbackEditSocialMedia"
  >
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
  methods: {
    callbackEditSocialMedia(thisMySomethingList, link) {
      // Wolle this.editingLink = link
      thisMySomethingList.formData.socialMediaUrl = link.url
      // thisMySomethingList.$refs.socialMediaUrl.$el.focus()
      // !!! Check for existenz
      // this.$scopedSlots.default()[0].context.$refs
      // thisMySomethingList.$scopedSlots['edit-item']()[0].$el.focus()
      // console.log(thisMySomethingList.$scopedSlots['edit-item']()[0].context.$refs)
      // console.log(thisMySomethingList.$scopedSlots['edit-item']()[0].context.$refs)
      // console.log(thisMySomethingList.$refs)
    },
  },
}
</script>

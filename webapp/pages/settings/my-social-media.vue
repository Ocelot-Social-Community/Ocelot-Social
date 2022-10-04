<template>
  <base-card>
    <ds-heading tag="h2" class="title">{{ $t('settings.social-media.name') }}</ds-heading>
    <my-something-list
      :useFormData="useFormData"
      :useFormSchema="useFormSchema"
      :useItems="socialMediaLinks"
      :defaultItem="{ url: '' }"
      :namePropertyKey="'url'"
      :texts="mySomethingListTexts"
      :callbacks="mySomethingListCallbacks"
    >
      <template #list-item="{ item }">
        <social-media-list-item :item="item" />
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
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import unionBy from 'lodash/unionBy'
import {
  createSocialMediaMutation,
  updateSocialMediaMutation,
  deleteSocialMediaMutation,
} from '~/graphql/SocialMedia.js'
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
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    currentSocialMediaLinks() {
      const domainRegex = /^(?:https?:\/\/)?(?:[^@\n])?(?:www\.)?([^:/\n?]+)/g
      const { socialMedia = [] } = this.currentUser
      return socialMedia.map(({ id, url }) => {
        const [domain] = url.match(domainRegex) || []
        const favicon = domain ? `${domain}/favicon.ico` : null
        return { id, url, favicon }
      })
    },
    socialMediaLinks() {
      const domainRegex = /^(?:https?:\/\/)?(?:[^@\n])?(?:www\.)?([^:/\n?]+)/g
      const { socialMedia = [] } = this.currentUser
      return socialMedia.map(({ id, url }) => {
        const [domain] = url.match(domainRegex) || []
        const favicon = domain ? `${domain}/favicon.ico` : null
        return { id, url, favicon }
      })
    },
    mySomethingListTexts() {
      return {
        addButton: this.$t('settings.social-media.submit'),
        addNew: this.$t('settings.social-media.add-new-link'),
        deleteModal: {
          titleIdent: 'settings.social-media.delete-modal.title',
          messageIdent: 'settings.social-media.delete-modal.message',
          confirm: {
            icon: 'trash',
            buttonTextIdent: 'settings.social-media.delete-modal.confirm-button',
          },
        },
        edit: this.$t('settings.social-media.edit-link'),
      }
    },
    mySomethingListCallbacks() {
      return {
        handleInput: () => {},
        handleInputValid: this.handleInputValid,
        edit: this.callbackEditSocialMedia,
        submit: this.handleSubmitSocialMedia,
        delete: this.callbackDeleteSocialMedia,
      }
    },
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    handleInputValid(thisList, data) {
      if (data.socialMediaUrl.length < 1) {
        thisList.disabled = true
      } else {
        thisList.disabled = false
      }
    },
    callbackEditSocialMedia(thisList, link) {
      thisList.formData.socialMediaUrl = link.url
      // try to set focus on link edit field
      // thisList.$refs.socialMediaUrl.$el.focus()
      // !!! check for existence
      // this.$scopedSlots.default()[0].context.$refs
      // thisList.$scopedSlots['edit-item']()[0].$el.focus()
      // console.log(thisList.$scopedSlots['edit-item']()[0].context.$refs)
      // console.log(thisList.$scopedSlots['edit-item']()[0].context.$refs)
      // console.log(thisList.$refs)
    },
    async handleSubmitSocialMedia(thisList, isCreation, item, formData) {
      item.url = formData.socialMediaUrl

      const items = this.socialMediaLinks
      const duplicateUrl = items.find((eleItem) => eleItem.url === item.url)
      if (duplicateUrl && duplicateUrl.id !== item.id) {
        return thisList.$toast.error(thisList.$t('settings.social-media.requireUnique'))
      }

      let mutation, variables, successMessage
      if (isCreation) {
        mutation = createSocialMediaMutation()
        variables = { url: item.url }
        successMessage = thisList.$t('settings.social-media.successAdd')
      } else {
        mutation = updateSocialMediaMutation()
        variables = { id: item.id, url: item.url }
        successMessage = thisList.$t('settings.data.success')
      }

      try {
        await thisList.$apollo.mutate({
          mutation,
          variables,
          update: (_store, { data }) => {
            const newSocialMedia = !isCreation ? data.UpdateSocialMedia : data.CreateSocialMedia
            this.setCurrentUser({
              ...this.currentUser,
              socialMedia: unionBy([newSocialMedia], this.currentUser.socialMedia, 'id'),
            })
          },
        })

        thisList.$toast.success(successMessage)

        return true
      } catch (err) {
        thisList.$toast.error(err.message)

        return false
      }
    },
    async callbackDeleteSocialMedia(thisList, item) {
      try {
        await thisList.$apollo.mutate({
          mutation: deleteSocialMediaMutation(),
          variables: {
            id: item.id,
          },
          update: (store, { data }) => {
            const socialMedia = this.currentUser.socialMedia.filter(
              (element) => element.id !== item.id,
            )
            this.setCurrentUser({
              ...this.currentUser,
              socialMedia,
            })
          },
        })

        thisList.$toast.success(thisList.$t('settings.social-media.successDelete'))
      } catch (err) {
        thisList.$toast.error(err.message)
      }
    },
  },
}
</script>

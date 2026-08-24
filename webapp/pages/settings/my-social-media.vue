<template>
  <os-card>
    <h2 class="ds-heading ds-heading-h2 title">{{ $t('settings.social-media.name') }}</h2>
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
        <ocelot-input
          id="editSocialMedia"
          model="socialMediaUrl"
          type="text"
          :placeholder="$t('settings.social-media.placeholder')"
          aria-describedby="socialMediaPrivacyHint"
        />
        <!--
          At the field, not in the docs. This list accepts `mailto:` since the value is
          validated against the backend's rule, and a mail address typed here is PUBLISHED —
          the address on the account is protected, this one is not, and nothing on the way in
          said so. Tied to the input with aria-describedby so it is announced when the field
          takes focus rather than only being visible to sighted users.
        -->
        <p id="socialMediaPrivacyHint" class="ds-text-small ds-text-soft ds-mt-x-small">
          {{ $t('settings.social-media.privacy-hint') }}
        </p>
      </template>
    </my-something-list>
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { iconRegistry } from '~/utils/iconRegistry'
import unionBy from 'lodash/unionBy'
import {
  createSocialMediaMutation,
  updateSocialMediaMutation,
  deleteSocialMediaMutation,
} from '~/graphql/SocialMedia.js'
import MySomethingList from '~/components/_new/features/MySomethingList/MySomethingList.vue'
import SocialMediaListItem from '~/components/_new/features/SocialMedia/SocialMediaListItem.vue'
import scrollToContent from './scroll-to-content.js'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'
import { fallbackIconFor, faviconFor, followable } from '~/utils/followableUrl'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    MySomethingList,
    SocialMediaListItem,
    OcelotInput,
  },
  data() {
    return {
      useFormData: {
        socialMediaUrl: '',
      },
      useFormSchema: {
        socialMediaUrl: {
          // Not async-validator's `type: 'url'`: its pattern requires a `//` authority, so it
          // rejects every `mailto:` — a value the backend accepts and the profile card
          // renders. The form and the card now ask the same question.
          //
          // The empty value passes, as it did before: a built-in type skips an empty field
          // while a custom validator runs on every one, so without this the form is invalid
          // from the moment it mounts and never opens for input. Whether a value is REQUIRED
          // is a separate rule, and not one this field carries.
          //
          // Trimmed here and trimmed again before the mutation, so the string this rule
          // judges is the string the backend stores. Surrounding whitespace is a paste
          // artefact and never part of a url, but the backend matches the value as given and
          // refuses it — so a pasted `https://example.org ` used to pass this form and fail
          // on save, with the space invisible in the field.
          validator: (_rule, value) => value.trim() === '' || followable(value.trim()),
          message: this.$t('common.validations.followableUrl'),
        },
      },
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    socialMediaLinks() {
      const { socialMedia = [] } = this.currentUser
      return socialMedia.map(({ id, url }) => ({
        id,
        url,
        favicon: faviconFor(url),
        fallbackIcon: fallbackIconFor(url),
      }))
    },
    mySomethingListTexts() {
      return {
        addButton: this.$t('settings.social-media.submit'),
        addNew: this.$t('settings.social-media.add-new-link'),
        deleteModal: {
          titleIdent: 'settings.social-media.delete-modal.title',
          messageIdent: 'settings.social-media.delete-modal.message',
          confirm: {
            icon: this.icons.trash,
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
  created() {
    this.icons = iconRegistry
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
      // Adding a link is gated by socialMedia.create; editing an existing one is not
      // (that path is owner-gated on the backend). Give friendly feedback instead of
      // the raw backend "Not Authorized" error when the role lacks the permission.
      if (isCreation && !this.$can('socialMedia.create')) {
        thisList.$toast.error(this.$t('permissions.deniedHint'))
        return false
      }
      // The same trim the validator applied, so what was judged is what is sent — and what the
      // duplicate check below compares against the rows already stored.
      item.url = formData.socialMediaUrl.trim()

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

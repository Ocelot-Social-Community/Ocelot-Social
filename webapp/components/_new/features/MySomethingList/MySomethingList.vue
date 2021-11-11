<template>
  <ds-form
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
    @submit="handleSubmitSocialMedia"
  >
    <div v-if="isEditing">
      <!-- Wolle translation -->
      <ds-space margin="base">
        <ds-heading tag="h3" class="undertitle">
          {{
            /* $t('settings.social-media.name') */ isCreation
              ? 'Add new'
              : 'Edit "' + editingItem[namePropertyKey] + '"'
          }}
        </ds-heading>
      </ds-space>
      <ds-space v-if="items" margin-top="base" margin="base">
        <!-- Wolle <ds-input
          id="editSocialMedia"
          model="socialMediaUrl"
          type="text"
          :placeholder="$t('settings.social-media.placeholder')"
        /> -->
        <slot name="edit-item" />
      </ds-space>
    </div>
    <div v-else>
      <ds-space v-if="items" margin-top="base" margin="small">
        <ds-list>
          <ds-list-item v-for="item in items" :key="item.id" class="list-item--high">
            <!-- Wolle remove template tag? -->
            <template>
              <!-- Wolle <a :href="link.url" target="_blank">
                <img :src="link.favicon" alt="Link:" height="16" width="16" />
                {{ link.url }}
              </a> -->
              <!-- Wolle <slot name="list-item" :link="link" data-test="item-slot" /> -->
              <slot name="list-item" :item="item" />
              <span class="divider">|</span>
              <base-button
                icon="edit"
                circle
                ghost
                @click="handleEditSocialMedia(item)"
                :title="$t('actions.edit')"
                data-test="edit-button"
              />
              <base-button
                icon="trash"
                circle
                ghost
                @click="handleDeleteSocialMedia(item)"
                :title="$t('actions.delete')"
                data-test="delete-button"
              />
            </template>
          </ds-list-item>
        </ds-list>
      </ds-space>
    </div>

    <ds-space margin-top="base">
      <!-- Wolle <ds-input
        v-if="!isEditing"
        id="addSocialMedia"
        model="socialMediaUrl"
        type="text"
        :placeholder="$t('settings.social-media.placeholder')"
      /> -->
      <ds-space margin-top="base">
        <base-button
          filled
          :disabled="!(!isEditing || (isEditing && !disabled))"
          type="submit"
          data-test="add-save-button"
        >
          {{ isEditing ? $t('actions.save') : $t('settings.social-media.submit') }}
        </base-button>
        <base-button v-if="isEditing" id="cancel" danger @click="handleCancel()">
          {{ $t('actions.cancel') }}
        </base-button>
      </ds-space>
    </ds-space>
  </ds-form>
</template>

<script>
// Wolle import unionBy from 'lodash/unionBy'
// import gql from 'graphql-tag'
// Wolle import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'MySomethingList',
  props: {
    useFormData: {
      type: Object,
      default: () => ({}),
    },
    useFormSchema: {
      type: Object,
      default: () => ({}),
    },
    useItems: {
      type: Array,
      default: () => [],
    },
    defaultItem: {
      type: Object,
      default: () => ({}),
    },
    namePropertyKey: {
      type: String,
      required: true,
    },
    callbacks: {
      type: Object,
      default: () => ({ edit: () => {}, submit: () => {}, delete: () => {} }),
    },
  },
  data() {
    // Wolle console.log(this.useItems)
    return {
      // Wolle formData: {
      //   socialMediaUrl: '',
      // },
      // formSchema: {
      //   socialMediaUrl: {
      //     type: 'url',
      //     message: this.$t('common.validations.url'),
      //   },
      // },
      formData: this.useFormData,
      formSchema: this.useFormSchema,
      items: this.useItems,
      disabled: true,
      editingItem: null,
    }
  },
  computed: {
    // Wolle ...mapGetters({
    //   currentUser: 'auth/user',
    // }),
    isEditing() {
      return this.editingItem !== null
    },
    isCreation() {
      return this.editingItem !== null && this.editingItem.id === ''
    },
    // Wolle socialMediaLinks() {
    //   const domainRegex = /^(?:https?:\/\/)?(?:[^@\n])?(?:www\.)?([^:/\n?]+)/g
    //   const { socialMedia = [] } = this.currentUser
    //   return socialMedia.map(({ id, url }) => {
    //     const [domain] = url.match(domainRegex) || []
    //     const favicon = domain ? `${domain}/favicon.ico` : null
    //     return { id, url, favicon }
    //   })
    // },
  },
  watch: {
    // useFormData(newFormData) {
    //   this.formData = newFormData
    // },
    // useFormSchema(newFormSchema) {
    //   this.formSchema = newFormSchema
    // },
    useItems(newItems) {
      this.items = newItems
    },
  },
  methods: {
    // Wolle ...mapMutations({
    //   setCurrentUser: 'auth/SET_USER',
    // }),
    handleCancel() {
      this.editingItem = null
      // Wolle ??? this.formData.socialMediaUrl = ''
      this.disabled = true
    },
    handleEditSocialMedia(item) {
      this.editingItem = item
      // Wolle this.formData.socialMediaUrl = link.url
      // Wolle this.$refs.socialMediaUrl.$el.focus()
      this.callbacks.edit(this, item)
    },
    handleInput(data) {
      this.disabled = true
    },
    handleInputValid(data) {
      if (data.socialMediaUrl.length < 1) {
        this.disabled = true
      } else {
        this.disabled = false
      }
    },
    async handleDeleteSocialMedia(item) {
      // Wolle try {
      //   await this.$apollo.mutate({
      //     mutation: gql`
      //       mutation($id: ID!) {
      //         DeleteSocialMedia(id: $id) {
      //           id
      //           url
      //         }
      //       }
      //     `,
      //     variables: {
      //       id: item.id,
      //     },
      //     update: (store, { data }) => {
      //       const socialMedia = this.currentUser.socialMedia.filter(
      //         (element) => element.id !== item.id,
      //       )
      //       this.setCurrentUser({
      //         ...this.currentUser,
      //         socialMedia,
      //       })
      //     },
      //   })

      //   this.$toast.success(this.$t('settings.social-media.successDelete'))
      // } catch (err) {
      //   this.$toast.error(err.message)
      // }
      await this.callbacks.delete(this, item)
    },
    async handleSubmitSocialMedia() {
      // Wolle const isEditing = (this.editingLink !== null)
      if (!this.isEditing) {
        // Wolle this.editingLink = { id: '', url: '' }
        // this.handleEditSocialMedia({ id: '', url: '' })
        this.handleEditSocialMedia({ ...this.defaultItem, id: '' })
      } else {
        // // Wolle const url = this.formData.socialMediaUrl
        // this.editingLink.url = this.formData.socialMediaUrl

        // const duplicateUrl = this.items.find((item) => item.url === this.editingLink.url)
        // // Wolle console.log('duplicateUrl: ', duplicateUrl)
        // // console.log('this.isEditing: ', this.isEditing)
        // // console.log('this.editingLink: ', this.editingLink)
        // if (duplicateUrl && this.isEditing && duplicateUrl.id !== this.editingLink.id) {
        //   return this.$toast.error(this.$t('settings.social-media.requireUnique'))
        // }

        // let mutation, variables, successMessage
        // if (this.isCreation) {
        //   mutation = gql`
        //     mutation($url: String!) {
        //       CreateSocialMedia(url: $url) {
        //         id
        //         url
        //       }
        //     }
        //   `
        //   variables = { url: this.editingLink.url }
        //   successMessage = this.$t('settings.social-media.successAdd')
        // } else {
        //   mutation = gql`
        //     mutation($id: ID!, $url: String!) {
        //       UpdateSocialMedia(id: $id, url: $url) {
        //         id
        //         url
        //       }
        //     }
        //   `
        //   variables = { id: this.editingLink.id, url: this.editingLink.url }
        //   successMessage = this.$t('settings.data.success')
        // }

        // try {
        //   await this.$apollo.mutate({
        //     mutation,
        //     variables,
        //     update: (_store, { data }) => {
        //       const newSocialMedia = !this.isCreation
        //         ? data.UpdateSocialMedia
        //         : data.CreateSocialMedia
        //       this.setCurrentUser({
        //         ...this.currentUser,
        //         socialMedia: unionBy([newSocialMedia], this.currentUser.socialMedia, 'id'),
        //       })
        //     },
        //   })

        //   this.$toast.success(successMessage)
        //   this.formData.socialMediaUrl = ''
        //   this.disabled = true
        //   this.editingLink = null
        // } catch (err) {
        //   this.$toast.error(err.message)
        // }
        if (await this.callbacks.submit(this, this.isCreation, this.editingItem, this.formData)) {
          this.disabled = true
          this.editingItem = null
        }
      }
    },
  },
}
</script>

<style lang="scss" scope>
// Wolle .title {
//   font-size: $font-size-xx-large;
//   margin-top: $space-small;
//   // Wolle margin-bottom: $space-small;
// }

.undertitle {
  font-size: $font-size-base;
  // margin-top: $space-base;
}

.divider {
  opacity: 0.4;
  padding: 0 $space-small;
}

.icon-button {
  cursor: pointer;
}

.list-item--high {
  .ds-list-item-prefix {
    align-self: center;
  }

  .ds-list-item-content {
    display: flex;
    align-items: center;
  }
}
</style>

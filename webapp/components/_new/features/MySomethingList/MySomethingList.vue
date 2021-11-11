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
        <slot name="edit-item" />
      </ds-space>
    </div>
    <div v-else>
      <ds-space v-if="items" margin-top="base" margin="small">
        <ds-list>
          <ds-list-item v-for="item in items" :key="item.id" class="list-item--high">
            <!-- Wolle remove template tag? -->
            <template>
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
    return {
      formData: this.useFormData,
      formSchema: this.useFormSchema,
      items: this.useItems,
      disabled: true,
      editingItem: null,
    }
  },
  computed: {
    isEditing() {
      return this.editingItem !== null
    },
    isCreation() {
      return this.editingItem !== null && this.editingItem.id === ''
    },
  },
  watch: {
    // can change by a parents callback and again given trough by bind from there
    useItems(newItems) {
      this.items = newItems
    },
  },
  methods: {
    handleCancel() {
      this.editingItem = null
      this.disabled = true
    },
    handleEditSocialMedia(item) {
      this.editingItem = item
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
      await this.callbacks.delete(this, item)
    },
    async handleSubmitSocialMedia() {
      if (!this.isEditing) {
        this.handleEditSocialMedia({ ...this.defaultItem, id: '' })
      } else {
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
.undertitle {
  font-size: $font-size-base;
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

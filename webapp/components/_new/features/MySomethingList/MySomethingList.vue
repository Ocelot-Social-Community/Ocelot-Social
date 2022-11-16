<template>
  <ds-form
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
    @submit="handleSubmitItem"
  >
    <div v-if="isEditing">
      <ds-space margin="base">
        <ds-heading tag="h5">
          {{
            isCreation
              ? $t('settings.social-media.addNewTitle')
              : $t('settings.social-media.editTitle', { name: editingItem[namePropertyKey] })
          }}
        </ds-heading>
      </ds-space>
      <ds-space v-if="items" margin-top="base">
        <slot name="edit-item" />
      </ds-space>
    </div>
    <div v-else>
      <ds-space v-if="items" margin-top="base">
        <ds-list>
          <ds-list-item v-for="item in items" :key="item.id" class="list-item--high">
            <template>
              <slot name="list-item" :item="item" />
              <span class="divider">|</span>
              <base-button
                icon="edit"
                circle
                ghost
                @click="handleEditItem(item)"
                :title="$t('actions.edit')"
                data-test="edit-button"
              />
              <base-button
                icon="trash"
                circle
                ghost
                @click="handleDeleteItem(item)"
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
          :disabled="loading || !(!isEditing || (isEditing && !disabled))"
          :loading="loading"
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
      default: () => ({
        handleInput: () => {},
        handleInputValid: () => {},
        edit: () => {},
        submit: () => {},
        delete: () => {},
      }),
    },
  },
  data() {
    return {
      formData: this.useFormData,
      formSchema: this.useFormSchema,
      items: this.useItems,
      disabled: true,
      loading: false,
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
    // can change by a parents callback and again given trough by v-bind from there
    useItems(newItems) {
      this.items = newItems
    },
  },
  methods: {
    handleInput(data) {
      this.callbacks.handleInput(this, data)
      this.disabled = true
    },
    handleInputValid(data) {
      this.callbacks.handleInputValid(this, data)
    },
    handleEditItem(item) {
      this.editingItem = item
      this.callbacks.edit(this, item)
    },
    async handleSubmitItem() {
      if (!this.isEditing) {
        this.handleEditItem({ ...this.defaultItem, id: '' })
      } else {
        this.loading = true
        if (await this.callbacks.submit(this, this.isCreation, this.editingItem, this.formData)) {
          this.disabled = true
          this.editingItem = null
        }
        this.loading = false
      }
    },
    handleCancel() {
      this.editingItem = null
      this.disabled = true
    },
    async handleDeleteItem(item) {
      await this.callbacks.delete(this, item)
    },
  },
}
</script>

<style lang="scss" scope>
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

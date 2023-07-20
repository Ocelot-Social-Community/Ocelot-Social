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
          {{ isCreation ? texts.addNew : texts.edit + ' — ' + editingItem[namePropertyKey] }}
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
                :title="$t('actions.delete')"
                icon="trash"
                circle
                ghost
                @click="handleDeleteItem(item)"
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
          {{ isEditing ? $t('actions.save') : texts.addButton }}
        </base-button>
        <base-button v-if="isEditing" id="cancel" @click="handleCancel()">
          {{ $t('actions.cancel') }}
        </base-button>
      </ds-space>
    </ds-space>
  </ds-form>
</template>

<script>
import { mapMutations } from 'vuex'

export default {
  name: 'MySomethingList',
  props: {
    useFormData: { type: Object, default: () => ({}) },
    useFormSchema: { type: Object, default: () => ({}) },
    useItems: { type: Array, default: () => [] },
    defaultItem: { type: Object, default: () => ({}) },
    namePropertyKey: { type: String, required: true },
    texts: {
      type: Object,
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
    ...mapMutations({
      commitModalData: 'modal/SET_OPEN',
    }),
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
    handleDeleteItem(item) {
      this.openModal(item)
    },
    openModal(item) {
      this.commitModalData(this.modalData(item))
    },
    modalData(item) {
      return {
        name: 'confirm',
        data: {
          type: '',
          resource: { id: '' },
          modalData: {
            titleIdent: this.texts.deleteModal.titleIdent,
            messageIdent: this.texts.deleteModal.messageIdent,
            messageParams: {
              name: item[this.namePropertyKey],
            },
            buttons: {
              confirm: {
                danger: true,
                icon: this.texts.deleteModal.confirm.icon,
                textIdent: this.texts.deleteModal.confirm.buttonTextIdent,
                callback: () => {
                  this.callbacks.delete(this, item)
                },
              },
              cancel: {
                icon: 'close',
                textIdent: 'actions.cancel',
                callback: () => {},
              },
            },
          },
        },
      }
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

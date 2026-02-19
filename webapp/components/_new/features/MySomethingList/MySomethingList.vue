<template>
  <ds-form
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
    @submit="handleSubmitItem"
  >
    <div v-if="isEditing">
      <div class="ds-my-base">
        <h5 class="ds-heading ds-heading-h5">
          {{ isCreation ? texts.addNew : texts.edit + ' — ' + editingItem[namePropertyKey] }}
        </h5>
      </div>
      <div v-if="items" class="ds-mt-base ds-mb-large">
        <slot name="edit-item" />
      </div>
    </div>
    <div v-else>
      <div v-if="items" class="ds-mt-base ds-mb-large">
        <ul class="ds-list">
          <li v-for="item in items" :key="item.id" class="ds-list-item list-item--high">
            <template>
              <slot name="list-item" :item="item" />
              <span class="divider">|</span>
              <os-button
                variant="primary"
                appearance="ghost"
                circle
                @click="handleEditItem(item)"
                :title="$t('actions.edit')"
                :aria-label="$t('actions.edit')"
                data-test="edit-button"
              >
                <template #icon>
                  <os-icon :icon="icons.edit" />
                </template>
              </os-button>
              <os-button
                variant="primary"
                appearance="ghost"
                circle
                :title="$t('actions.delete')"
                :aria-label="$t('actions.delete')"
                @click="handleDeleteItem(item)"
                data-test="delete-button"
              >
                <template #icon>
                  <os-icon :icon="icons.trash" />
                </template>
              </os-button>
            </template>
          </li>
        </ul>
      </div>
    </div>

    <div class="ds-mt-base ds-mb-large">
      <div class="ds-mt-base ds-mb-large">
        <os-button
          variant="primary"
          appearance="filled"
          :disabled="loading || (isEditing && disabled)"
          :loading="loading"
          type="submit"
          data-test="add-save-button"
        >
          {{ isEditing ? $t('actions.save') : texts.addButton }}
        </os-button>
        <os-button
          v-if="isEditing"
          id="cancel"
          variant="primary"
          appearance="outline"
          @click="handleCancel()"
        >
          {{ $t('actions.cancel') }}
        </os-button>
      </div>
    </div>
  </ds-form>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapMutations } from 'vuex'

export default {
  name: 'MySomethingList',
  components: { OsButton, OsIcon },
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
  created() {
    this.icons = iconRegistry
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
                icon: this.icons.close,
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

<style lang="scss" scoped>
.divider {
  opacity: 0.4;
  padding: 0 $space-small;
}

.list-item--high {
  display: flex;
  align-items: center;
}
</style>

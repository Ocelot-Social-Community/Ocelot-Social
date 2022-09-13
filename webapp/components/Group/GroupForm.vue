<template>
  <div>
    <ds-container>
      <ds-form
        class="group-form"
        ref="groupForm"
        v-model="formData"
        :schema="formSchema"
        @submit="submit"
      >
        <ds-input
          v-model="formData.name"
          label="Gruppenname"
          placeholder="Your name ..."
        ></ds-input>

        <ds-select
          icon="user"
          v-model="formData.groupType"
          label="Sichtbarkeit"
          :options="['public', 'closed', 'hidden']"
          placeholder="Status ..."
        ></ds-select>

        <ds-input v-model="formData.about" label="Kurzbeschreibung" rows="3"></ds-input>

        <ds-input
          v-model="formData.description"
          label="Beschreibung"
          type="textarea"
          rows="3"
        ></ds-input>

        <ds-space margin-top="large">
        <ds-select
          icon="card"
          v-model="formData.actionRadius"
          label="Radius"
          :options="['regional', 'national', 'continental', 'global']"
          placeholder="Radius ..."
        ></ds-select>
      </ds-space>
        <ds-space margin-top="large">
        <categories-select
          v-if="categoriesActive"
          model="categoryIds"
          :existingCategoryIds="formData.categoryIds"
        />
      </ds-space>  
        <ds-space margin-top="large">
          <ds-button @click.prevent="reset()">Reset form</ds-button>
          <ds-button
            type="submit"
            @click.prevent="submit()"
            icon="save"
            :disabled="update ? submitDisableEdit : submitDisable"
            primary
          >
            {{ update ? $t('group.update') : $t('group.save') }}
          </ds-button>
        </ds-space>
      </ds-form>
      <ds-space centered v-show="!update">
        <nuxt-link to="/my-groups">zurück</nuxt-link>
      </ds-space>
    </ds-container>
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '~/constants/categories.js'
import { NAME_LENGTH_MIN, NAME_LENGTH_MAX } from '~/constants/groups.js'

export default {
  name: 'GroupForm',
  components: {
    CategoriesSelect,
  },
  props: {
    update: {
      type: Boolean,
      required: false,
      default: false,
    },
    group: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  data() {
    const { name, groupType, about, description, actionRadius, categories } = this.group
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      disabled: false,
      formData: {
        name: name || '',
        groupType: groupType || '',
        about: about || '',
        description: description || '',
        actionRadius: actionRadius || '',
        categoryIds: categories ? categories.map((category) => category.id) : [],
      },
      formSchema: {
        name: { required: true, min: NAME_LENGTH_MIN, max: NAME_LENGTH_MAX },
        groupType: { required: true },
        about: { required: true },
        description: { required: true },
        actionRadius: { required: true },
        categoryIds: {
          type: 'array',
          required: this.categoriesActive,
          validator: (_, value = []) => {
            if (
              this.categoriesActive &&
              (value.length < CATEGORIES_MIN || value.length > CATEGORIES_MAX)
            ) {
              return [new Error(this.$t('common.validations.categories'))]
            }
            return []
          },
        },
      },
    }
  },

  methods: {
    submit() {
      const { name, about, description, groupType, actionRadius, categoryIds } = this.formData
      const variables = {
        name,
        about,
        description,
        groupType,
        actionRadius,
        categoryIds,
      }
      this.update
        ? this.$emit('updateGroup', {
            ...variables,
            id: this.group.id,
          })
        : this.$emit('createGroup', variables)
    },
    reset() {
      alert('reset')
    },
  },
  computed: {
    submitDisable() {
      if (
        this.formData.name !== ''
        && this.formData.groupType !== ''
        && this.formData.about !== ''
        && this.formData.description !== ''
        && this.formData.actionRadius !== ''
        && this.formData.categoryIds.length > 0
        ) {
        return false
      }
      return true
    },
    submitDisableEdit() {
       
      if (
        this.formData.name !== this.group.name
        || this.formData.groupType !== this.group.groupType
        || this.formData.about !== this.group.about
        || this.formData.description !== this.group.description
        || this.formData.actionRadius !== this.group.actionRadius
        || this.formData.categoryIds.length === 0
        || !this.sameCategories
        ) {
        return false
      }
      return true
    },
    sameCategories(){
      let formDataCategories = this.formData.categoryIds.map((categoryIds) => categoryIds)
      let groupDataCategories = this.group.categories.map((category) => category.id)
      let result
      let each = true

      if (formDataCategories.length !== groupDataCategories.length) return false

      if (JSON.stringify(formDataCategories) !== JSON.stringify(groupDataCategories)) {
        formDataCategories.forEach(element => {
          result = groupDataCategories.filter(groupCategorieId => groupCategorieId === element)
          if (result.length === 0) each = false
        })
        return each
      }
      return true
    }
  }
}
</script>

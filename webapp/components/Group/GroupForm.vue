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

        <hc-editor
          :users="null"
          :value="formData.description"
          :hashtags="null"
          @input="updateEditorDescription"
        />
        <ds-chip size="base" :color="errors && errors.content && 'danger'">
          {{ `${contentLength} / ${descriptionMin}` }}
          <base-icon v-if="errors && errors.content" name="warning" />
        </ds-chip>

        <ds-select
          icon="card"
          v-model="formData.actionRadius"
          label="Radius"
          :options="['regional', 'national', 'continental', 'global']"
          placeholder="Radius ..."
        ></ds-select>
        <categories-select
          v-if="categoriesActive"
          model="categoryIds"
          :existingCategoryIds="formData.categoryIds"
        />

        <ds-space margin-top="large">
          <ds-button @click.prevent="reset()">Reset form</ds-button>
          <ds-button
            type="submit"
            @click.prevent="submit()"
            icon="save"
            :disabled="disabled"
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
import HcEditor from '~/components/Editor/Editor'

export default {
  name: 'GroupForm',
  components: {
    CategoriesSelect,
    HcEditor,
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
      descriptionMin: 50,
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
  computed: {
    contentLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
  },
  methods: {
    updateEditorDescription(value) {
      this.$refs.groupForm.update('description', value)
    },
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
}
</script>

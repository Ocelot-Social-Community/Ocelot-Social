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
          v-model="formData.status"
          label="Sichtbarkeit"
          :options="['offen', 'geschlossen', 'geheim']"
          placeholder="Status ..."
        ></ds-select>

        <ds-input
          v-model="formData.description"
          label="Beschreibung"
          type="textarea"
          rows="3"
        ></ds-input>

        <categories-select
          v-if="categoriesActive"
          model="formData.categoryIds"
          :existingCategoryIds="formData.categoryIds"
        />

        <div>{{ formData }}</div>

        <ds-space margin-top="large">
          <ds-button @click.prevent="reset()">Reset form</ds-button>
          <ds-button
            type="submit"
            @click.prevent="submit()"
            icon="save"
            :disabled="disabled"
            primary
          >
            save
          </ds-button>
        </ds-space>
      </ds-form>
      <ds-space centered>
        <nuxt-link to="/my-groups">zurück</nuxt-link>
      </ds-space>
    </ds-container>
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'

export default {
  name: 'GroupForm',
  components: {
    CategoriesSelect,
  },
  props: {
    group: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    const { name, status, description, categories } = this.group
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      disabled: false,
      formData: {
        name: name || '',
        status: status || '',
        description: description || '',
        categoryIds: categories ? categories.map((category) => category.id) : [],
      },
      formSchema: {
        name: { required: true, min: 3, max: 100 },
        description: { required: true },
        status: { required: true },
        categoryIds: {
          type: 'array',
          required: this.categoriesActive,
          validator: (_, value = []) => {
            if (this.categoriesActive && (value.length === 0 || value.length > 3)) {
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
      console.log('submit', this.formData)
      this.$emit('createGroup', this.formData)
    },
    reset() {
      console.log('reset')
    },
  },
}
</script>

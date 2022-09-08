<template>
  <div>
    <ds-container>
      update: {{update}}
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
          :options="['public', 'close', 'hidden']"
          placeholder="Status ..."
        ></ds-select>

        <ds-input
          v-model="formData.about"
          label="Kurzbeschreibung"
          rows="3"
        ></ds-input>

        <ds-input
          v-model="formData.description"
          label="Beschreibung"
          type="textarea"
          rows="3"
        ></ds-input>

        <ds-select
          icon="card"
          v-model="formData.actionRadius"
          label="Radius"
          :options="['local', 'regional', 'global']"
          placeholder="Radius ..."
        ></ds-select>

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
            {{update ? $t('group.update') : $t('group.save')}}
          </ds-button>
        </ds-space>
      </ds-form>
      <ds-space centered>
        <nuxt-link to="/group/my-groups">zurück</nuxt-link>
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
    const { name, groupType, about, description, actionRadius, categories } = this.groupData
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
        name: { required: true, min: 3, max: 100 },
        groupType: { required: true },
        about: { required: true },
        description: { required: true },
        actionRadius: { required: true },
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
      this.update ? this.$emit('updateGroup', this.formData) : this.$emit('createGroup', this.formData)
    },
    reset() {
      console.log('reset')
    },
  },
}
</script>

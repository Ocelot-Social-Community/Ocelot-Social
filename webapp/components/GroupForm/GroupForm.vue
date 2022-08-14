<template>
  <div>
    <ds-container>
      <ds-form @submit="submit">
        <ds-input v-model="form.name" label="Gruppenname" placeholder="Your name ..."></ds-input>

        <ds-select
          icon="user"
          v-model="form.status"
          label="Status"
          :options="['offen', 'geschlossen', 'geheim']"
          placeholder="Status ..."
        ></ds-select>

        <ds-input v-model="form.description" label="Beschreibung" type="textarea" rows="3"></ds-input>

        <categories-select 
          v-model="form.categoryIds"
          />
        <div>{{ form.name }}</div>
        <div>{{ form.status }}</div>
        <div>{{ form.description }}</div>
        <div>{{ form.categoryIds }}</div>

        <ds-space margin-top="large">
          <ds-button @click.prevent="reset()">Reset form</ds-button>
          <ds-button type="submit" :disabled="disabled" icon="save" primary>Save group</ds-button>
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
  props:{
    model: { type: String, required: true },
    value: { type: String, default: '' },
  },
  data() {
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      form: {
        name: '',
        status: '',
        description: '',
        disable: false,
        categoryIds: [],
      }
      
    }
  },

  methods: {
    submit() {
       console.log('submit', this.form)
      this.$emit('createGroup', this.form)
     
    },
    reset() {
      console.log('reset')
    },
  },
}
</script>

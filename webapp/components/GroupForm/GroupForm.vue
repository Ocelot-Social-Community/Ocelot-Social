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

        <div>{{ form.name }}</div>
        <div>{{ form.status }}</div>
        <div>{{ form.description }}</div>

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
    value: {
      type: Object,
       default: () => ({}),
      required: true,
    }
  },
  data() {
    return {
      form: {
        name: '',
        status: '',
        description: '',
        disable: false,
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

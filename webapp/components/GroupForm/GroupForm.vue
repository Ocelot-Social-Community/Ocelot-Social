<template>
  <div>
    <ds-container>
      <ds-form v-model="formData" @submit="submit" :schema="formSchema">
          <ds-input v-model="name" label="Gruppenname" placeholder="Your name ..."></ds-input>

          <ds-select
            icon="user"
            v-model="status"
            label="Status"
            :options="['offen', 'geschlossen', 'geheim']"
            placeholder="Status ..."
          ></ds-select>

          <ds-input v-model="description" label="Beschreibung" type="textarea" rows="3"></ds-input>

           <div>{{name}}</div>
      <div>{{status}}</div>
      <div>{{description}}</div>

          <ds-space margin-top="large">
            <ds-button @click.prevent="reset()">Reset form</ds-button>
            <ds-button :disabled="disabled" icon="save" primary>Save group</ds-button>
          </ds-space>
    
      </ds-form>
      <ds-space centered>
        zurück
      </ds-space>
    </ds-container>
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'

export default {
  components: {
    CategoriesSelect,
  },
  data() {
    return {
      name: '',
      status: '',
      description: '',
    }
  },
 
  methods: {
  submit() {
    console.log('handleSubmit')
  },
  handleSubmit() {
    console.log('handleSubmit')
  },
  reset() {
    console.log('handleSubmit')
  },
 },
}
</script>

<template>
<div>
    <ds-container>
      <ds-form
    v-model="formData"
    @submit="submit"
    :schema="formSchema">
    <template slot-scope="{ errors, reset }">
      <ds-input
        model="name"
        label="Gruppenname"
        placeholder="Your name ..."></ds-input>
       
       
      <ds-select
        icon="user"
        model="status"
        label="Status"
        :options="['offen', 'geschlossen', 'geheim']"
        placeholder="Status ..."></ds-select>
   
      <ds-input
        model="description"
        label="Beschreibung"
        type="textarea"
        rows="3"></ds-input>

      <categories-select
          v-if="categoriesActive"
          model="categoryIds"
          :existingCategoryIds="formData.categoryIds"
        />
        <ds-chip
          v-if="categoriesActive"
          size="base"
          :color="errors && errors.categoryIds && 'danger'"
        >
          {{ formData.categoryIds.length }} / 3
          <base-icon v-if="errors && errors.categoryIds" name="warning" />
        </ds-chip>
      <ds-space margin-top="large">
        <ds-button @click.prevent="reset()">
          Reset form
        </ds-button>
        <ds-button
          :disabled="disabled"
          icon="save"
          primary>
          Save group
        </ds-button>
      </ds-space>
    </template>
  </ds-form>
    </ds-container>
    <div  align="center" style="padding-top: 30px">
    <nuxt-link :to="{ name: 'my-groups' }">
                <base-button :path="{ name: 'my-groups' }">zurück</base-button> 
              </nuxt-link></div>

</div>
  
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'

export default {
   components: {
       CategoriesSelect,
   },
    data() {
      // const { name, status, description, categories } = this.group
      categories: [{id: 0, name: 'Bildung'},{id: 1, name: 'Politik'}]
 
       return {
           categoriesActive: this.$env.CATEGORIES_ACTIVE,
 
 formData: {
     categoryIds: this.categories ? this.categories.map((category) => category.id) : [],
       name: name || '',
       status: status || '',
       description: description || '',
   },
     formSchema: {
        name: { required: true, min: 3, max: 100 },
        description: { required: true },

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
//   // computed: {
//   //   ...mapGetters({
//   //     currentUser: 'auth/user',
//   //   }),
//   //   contentLength() {
//   //     return this.$filters.removeHtml(this.formData.content).length
//   //   },
//   // },
//   // methods: {
         handleSubmit() {
             console.log('handleSubmit')
         },
//   //   updateEditorContent(value) {
//   //     this.$refs.contributionForm.update('content', value)
//   //   },
//   //   addHeroImage(file) {
//   //     this.formData.image = null
//   //     if (file) {
//   //       const reader = new FileReader()
//   //       reader.onload = ({ target }) => {
//   //         this.formData.image = {
//   //           ...this.formData.image,
//   //           url: target.result,
//   //         }
//   //       }
//   //       reader.readAsDataURL(file)
//   //       this.imageUpload = file
//   //     }
//   //   },
//   //   addImageAspectRatio(aspectRatio) {
//   //     this.formData.imageAspectRatio = aspectRatio
//   //   },
//   //   addImageType(imageType) {
//   //     this.formData.imageType = imageType
//   //   },
//   // },
//   // apollo: {
//   //   User: {
//   //     query() {
  //       return gql`
  //         query {
  //           User(orderBy: slug_asc) {
  //             id
  //             slug
  //           }
  //         }
  //       `
  //     },
  //     result({ data: { User } }) {
  //       this.users = User
  //     },
  //   },
  //   Tag: {
  //     query() {
  //       return gql`
  //         query {
  //           Tag(orderBy: id_asc) {
  //             id
  //           }
  //         }
  //       `
  //     },
  //     result({ data: { Tag } }) {
  //       this.hashtags = Tag
  //     },
  //   },
  // },
}
</script>



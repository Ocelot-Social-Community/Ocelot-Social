<template>
  <div>
    <ds-form
      class="group-form"
      ref="groupForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <!-- "errors" is only working if you use a submit event on the form -->
      <template #default="{ errors }">
        <!-- group Name -->
        <ds-input
          name="name"
          :label="$t('group.name')"
          model="name"
          autofocus
          :placeholder="`${$t('group.name')} …`"
        />
        <ds-chip size="base" :color="errors && errors.name && 'danger'">
          {{ `${formData.name.length} / ${formSchema.name.min}–${formSchema.name.max}` }}
          <base-icon v-if="errors && errors.name" name="warning" />
        </ds-chip>

        <!-- group Slug -->
        <ds-input
          v-if="update"
          :label="$t('group.labelSlug')"
          model="slug"
          icon="at"
          :placeholder="`${$t('group.labelSlug')} …`"
        ></ds-input>

        <ds-space v-if="update" margin-top="small" />

        <!-- groupType -->
        <ds-text class="select-label">
          {{ $t('group.type') }}
        </ds-text>
        <!-- TODO: change it has to be implemented later -->
        <!-- TODO: move 'ds-select' from style guide to main code and implement missing translation etc. functionality -->
        <select
          class="select ds-input appearance--auto"
          name="groupType"
          model="groupType"
          :value="formData.groupType"
          :disabled="update"
          @change="changeGroupType($event)"
        >
          <option v-for="groupType in groupTypeOptions" :key="groupType" :value="groupType">
            {{ $t(`group.types.${groupType}`) }}
          </option>
        </select>
        <ds-chip
          size="base"
          :color="errors && errors.groupType && formData.groupType === '' && 'danger'"
        >
          {{ `${formData.groupType === '' ? 0 : 1} / 1` }}
          <base-icon
            v-if="errors && errors.groupType && formData.groupType === ''"
            name="warning"
          />
        </ds-chip>

        <!-- goal -->
        <ds-input
          name="about"
          :label="$t('group.goal')"
          v-model="formData.about"
          :placeholder="$t('group.goal') + ' …'"
          rows="3"
        />

        <ds-space margin-top="small" />

        <!-- description -->
        <ds-text class="select-label">
          {{ $t('group.description') }}
        </ds-text>
        <editor
          name="description"
          model="description"
          :users="null"
          :value="formData.description"
          :hashtags="null"
          @input="updateEditorDescription"
        />
        <ds-chip size="base" :color="errors && errors.description && 'danger'">
          {{ `${descriptionLength} / ${formSchema.description.min}` }}
          <base-icon v-if="errors && errors.description" name="warning" />
        </ds-chip>

        <!-- actionRadius -->
        <ds-text class="select-label">
          {{ $t('group.actionRadius') }}
        </ds-text>
        <!-- TODO: move 'ds-select' from styleguide to main code and implement missing translation etc. functionality -->
        <select
          class="select ds-input appearance--auto"
          name="actionRadius"
          :value="formData.actionRadius"
          @change="changeActionRadius($event)"
        >
          <option
            v-for="actionRadius in actionRadiusOptions"
            :key="actionRadius"
            :value="actionRadius"
          >
            {{ $t(`group.actionRadii.${actionRadius}`) }}
          </option>
        </select>
        <ds-chip
          size="base"
          :color="errors && errors.actionRadius && formData.actionRadius === '' && 'danger'"
        >
          {{ `${formData.actionRadius === '' ? 0 : 1} / 1` }}
          <base-icon
            v-if="errors && errors.actionRadius && formData.actionRadius === ''"
            name="warning"
          />
        </ds-chip>

        <!-- location -->
        <ds-select
          id="city"
          :label="$t('settings.data.labelCity')"
          v-model="formData.locationName"
          :options="cities"
          icon="map-marker"
          :icon-right="null"
          :placeholder="$t('settings.data.labelCity') + ' …'"
          :loading="loadingGeo"
          @input.native="handleCityInput"
        />
        <base-button
          v-if="formData.locationName !== ''"
          icon="close"
          ghost
          size="small"
          style="position: relative; display: inline-block; right: -96%; top: -33px; width: 26px"
          @click="formData.locationName = ''"
        ></base-button>

        <ds-space margin-top="small" />

        <!-- category -->
        <categories-select
          v-if="categoriesActive"
          model="categoryIds"
          name="categoryIds"
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

        <!-- submit -->
        <ds-space margin-top="large">
          <nuxt-link to="/my-groups">
            <ds-button>{{ $t('actions.cancel') }}</ds-button>
          </nuxt-link>
          <ds-button type="submit" icon="save" primary :disabled="checkFormError(errors)" fill>
            {{ update ? $t('group.update') : $t('group.save') }}
          </ds-button>
        </ds-space>
      </template>
    </ds-form>
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '~/constants/categories.js'
import {
  NAME_LENGTH_MIN,
  NAME_LENGTH_MAX,
  DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
} from '~/constants/groups.js'
import Editor from '~/components/Editor/Editor'
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'GroupForm',
  components: {
    CategoriesSelect,
    Editor,
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
    const { name, slug, groupType, about, description, actionRadius, locationName, categories } =
      this.group
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      disabled: false,
      groupTypeOptions: ['public', 'closed', 'hidden'],
      actionRadiusOptions: ['regional', 'national', 'continental', 'global'],
      loadingGeo: false,
      cities: [],
      formData: {
        name: name || '',
        slug: slug || '',
        groupType: groupType || '',
        about: about || '',
        description: description || '',
        locationName: locationName || '',
        actionRadius: actionRadius || '',
        categoryIds: categories ? categories.map((category) => category.id) : [],
      },
      formSchema: {
        name: { required: true, min: NAME_LENGTH_MIN, max: NAME_LENGTH_MAX },
        slug: { required: false, min: NAME_LENGTH_MIN },
        groupType: { required: true, min: 1 },
        about: { required: false },
        description: {
          type: 'string',
          required: true,
          min: DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
          validator: (_, value = '') => {
            if (this.$filters.removeHtml(value).length < this.formSchema.description.min) {
              return [new Error()]
            }
            return []
          },
        },
        actionRadius: { required: true, min: 1 },
        locationName: { required: false },
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
    descriptionLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
    sameLocation() {
      console.log('sameLocation this.group.locationName', this.group.locationName)
      console.log('sameLocation this.formData.locationName', this.formData.locationName)
      if ( this.group.locationName === null ) { this.group.locationName = '' }

      if ( this.formData.locationName.value ){
        console.log('if value form', this.formData.locationName.value )
        console.log('if value group', this.group.locationName )
        if (this.formData.locationName.value !== this.group.locationName) {
          console.log('value != group location name')
          return false
        }
        
      } else  {
        console.log('if not value ')
        if (this.formData.locationName !== this.group.locationName) {
          console.log('ungleich')
          return false
        }
        
      }

      
      // if ( this.group.locationName !== null ) {
      //   if ( this.formData.locationName !== '' ) {
      //     if ( this.group.locationName !== this.formData.locationName.value ) return false
      //   } else {
      //     return false
      //   }
      // }  

      return true
    },
    sameCategories() {
      if (this.group.categories.length !== this.formData.categoryIds.length) return false
      const groupCategories = []
      this.group.categories.forEach((categories) => {
        groupCategories.push(categories.id)
        const some = this.formData.categoryIds.some((item) => item === categories.id)
        if (!some) return false
      })

      return true
    },
    disableButtonByUpdate() {
      if (!this.update) return true
      console.log('name', this.group.name === this.formData.name)
      console.log('slug', this.group.slug === this.formData.slug)
      console.log('about', this.group.about === this.formData.about)
      console.log('description', this.group.description === this.formData.description)
      console.log('actionRadius', this.group.actionRadius === this.formData.actionRadius)
      console.log('sameLocation', this.sameLocation)
      console.log('sameCategories', this.sameCategories)
      if (
        this.group.name === this.formData.name &&
        this.group.slug === this.formData.slug &&
        this.group.about === this.formData.about &&
        this.group.description === this.formData.description &&
        this.group.actionRadius === this.formData.actionRadius &&
        this.sameLocation &&
        this.sameCategories
      )
        return true
      return false
    },
  },
  methods: {
    checkFormError(error) {
      if (!this.update && error && !!error && this.disableButtonByUpdate) return true
      if (this.update && !error && this.disableButtonByUpdate) return true
      return false
    },
    changeGroupType(event) {
      this.formData.groupType = event.target.value
    },
    changeActionRadius(event) {
      this.formData.actionRadius = event.target.value
    },
    updateEditorDescription(value) {
      this.$refs.groupForm.update('description', value)
    },
    submit() {
      const { name, about, description, groupType, actionRadius, locationName, categoryIds } =
        this.formData
        console.log(this.formData)
      const variables = {
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName: locationName.label ? locationName.label : '',
        categoryIds,
      }
      this.update
        ? this.$emit('updateGroup', {
            ...variables,
            id: this.group.id,
          })
        : this.$emit('createGroup', variables)
    },
    handleCityInput(value) {
      clearTimeout(timeout)
      timeout = setTimeout(() => this.requestGeoData(value), 500)
    },
    processLocationsResult(places) {
      if (!places.length) {
        return []
      }
      const result = []
      places.forEach((place) => {
        result.push({
          label: place.place_name,
          value: place.place_name,
          id: place.id,
        })
      })

      return result
    },
    async requestGeoData(e) {
      const value = e.target ? e.target.value.trim() : ''
      if (value === '') {
        this.cities = []
        return
      }
      this.loadingGeo = true

      const place = encodeURIComponent(value)
      const lang = this.$i18n.locale()

      const {
        data: { queryLocations: res },
      } = await this.$apollo.query({ query: queryLocations(), variables: { place, lang } })

      this.cities = this.processLocationsResult(res)
      this.loadingGeo = false
    },
  },
}
</script>

<style lang="scss">
.appearance--auto {
  -webkit-appearance: auto;
  -moz-appearance: auto;
  appearance: auto;
}

.select-label {
  margin-bottom: 0;
  padding-bottom: 4px;
  color: #70677e;
  font-size: 1rem;
}

.textarea-label {
  padding-bottom: 14px;
}

.group-form {
  display: flex;
  flex-direction: column;

  > .ds-form-item {
    margin: 0;
  }

  > .ds-chip {
    align-self: flex-end;
    margin: $space-xx-small 0 $space-base;
    cursor: default;
  }

  > .select-field {
    align-self: flex-end;
  }

  > .buttons {
    align-self: flex-end;
    margin-top: $space-base;
  }
}
</style>

<template>
  <div>
    <ds-form
      class="group-form"
      ref="groupForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
    <template #default="{ errors }">
      <!-- Group Name -->
      <ds-input
        :label="$t('group.name')"
        v-model="formData.name"
        :placeholder="`${$t('group.name')} …`"
      ></ds-input>

      <!-- Group Slug -->
      <ds-space margin-top="large">
        <ds-input
          v-if="update"
          :label="$t('group.labelSlug')"
          v-model="formData.slug"
          icon="at"
          :placeholder="`${$t('group.labelSlug')} …`"
        ></ds-input>
      </ds-space>

      <!-- groupType -->
      <ds-space margin-top="large">
        <ds-text class="select-label">
          {{ $t('group.type') }}
        </ds-text>
        <select
          class="select ds-input appearance--auto"
          :options="groupTypeOptions"
          :value="formData.groupType"
          :disabled="update"
          @change="changeGroupType($event)"
        >
          <option v-for="groupType in groupTypeOptions" :key="groupType" :value="groupType">
            {{ $t(`group.types.${groupType}`) }}
          </option>
        </select>
      </ds-space>

      <!-- goal -->
      <ds-space margin-top="large"> 
        <ds-input
          :label="$t('group.goal')"
          v-model="formData.about"
          :placeholder="$t('group.goal') + ' …'"
          rows="3"
        ></ds-input>
      </ds-space>

      <!-- description -->
      <ds-space margin-top="large">
      <ds-text class="select-label">
        {{ $t('group.description') }}
      </ds-text>
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
        </ds-space>
      <ds-space margin-top="large">

        <!-- actionRadius -->
        <ds-text class="select-label">
          {{ $t('group.actionRadius') }}
        </ds-text>
        <select
          class="select ds-input appearance--auto"
          :options="actionRadiusOptions"
          :value="formData.actionRadius"
          @change="changeActionRadius($event)"
        >
          <option
            v-for="actionRadius in actionRadiusOptions"
            :key="actionRadius"
            :value="actionRadius"
          >
            {{ $t(`group.actionRadii.${actionRadius}`)  }}
          </option>
        </select>
      </ds-space>

        <!-- location -->
        <ds-space margin-top="large">
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
          @click="formData.locationName = ''"
          style="position:relative; display: inline-block; right: -93%; top: -45px">
        </base-button>
      </ds-space>
      <ds-space margin-top="large">
        <categories-select
          v-if="categoriesActive"
          model="categoryIds"
          :existingCategoryIds="formData.categoryIds"
        />
      </ds-space>
      <ds-space margin-top="large">
        <nuxt-link to="/my-groups">
          <ds-button>{{ $t('actions.cancel') }}</ds-button>
        </nuxt-link>
        <ds-button
          type="submit"
          icon="save"
          :disabled="update ? submitDisableEdit : submitDisable"
          primary
          @click.prevent="submit()"
        >
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
import { NAME_LENGTH_MIN, NAME_LENGTH_MAX } from '~/constants/groups.js'
import HcEditor from '~/components/Editor/Editor'
import { queryLocations } from '~/graphql/location'

let timeout

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
    const { name, slug, groupType, about, description, actionRadius, locationName, categories } =
      this.group
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      disabled: false,
      descriptionMin: 50,
      groupTypeOptions: [
        'public', 
        'closed', 
        'hidden'
      ],
      actionRadiusOptions: [ 
        'regional',
        'national',
        'continental',
        'global'
      ],
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
        slug: { required: false },
        groupType: { required: true },
        about: { required: true },
        description: { required: true },
        actionRadius: { required: true },
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

    contentLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
    submitDisable() {
      return (
        this.formData.name === '' ||
        this.formData.groupType === '' ||
        // this.formData.about === '' || // not mandatory
        this.formData.description === '' ||
        this.formData.actionRadius === '' ||
        // this.formData.locationName === '' || // not mandatory
        this.formData.categoryIds.length === 0
      )
    },
    submitDisableEdit() {
      return (
        this.formData.name === this.group.name &&
        this.formData.slug === this.group.slug &&
        // this.formData.groupType === this.group.groupType && // can not be changed for now
        this.formData.about === this.group.about &&
        this.formData.description === this.group.description &&
        this.formData.actionRadius === this.group.actionRadius &&
        this.formData.locationName === (this.group.locationName ? this.group.locationName : '') &&
        this.sameCategories
      )
    },
    sameCategories() {
      const formDataCategories = this.formData.categoryIds.map((id) => id).sort()
      const groupDataCategories = this.group.categories.map((category) => category.id).sort()
      let equal = true

      if (formDataCategories.length !== groupDataCategories.length) return false

      formDataCategories.forEach((id, index) => {
        equal = equal && id === groupDataCategories[index]
      })
      return equal
    },
  },
  methods: {
    updateEditorDescription(value) {
      this.$refs.groupForm.update('description', value)
    },
    submit() {
      const { name, about, description, groupType, actionRadius, locationName, categoryIds } =
        this.formData
      const variables = {
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName: locationName.label,
        categoryIds,
      }
      this.update
        ? this.$emit('updateGroup', {
            ...variables,
            id: this.group.id,
          })
        : this.$emit('createGroup', variables)
    },
    changeGroupType(event) {
      this.formData.groupType = event.target.value
    },
    changeActionRadius(event) {
      this.formData.actionRadius = event.target.value
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

<style lang="scss" scoped>


.appearance--auto {
    -webkit-appearance: auto;
    -moz-appearance: auto;
    appearance: auto;
}

</style>

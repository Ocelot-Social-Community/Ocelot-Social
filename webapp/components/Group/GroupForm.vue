<template>
  <div>
    <ds-form
      class="group-form"
      ref="groupForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <ds-input
        :label="$t('group.name')"
        v-model="formData.name"
        :placeholder="`${$t('group.name')} …`"
      ></ds-input>
      <ds-input
        v-if="update"
        :label="$t('group.labelSlug')"
        v-model="formData.slug"
        icon="at"
        :placeholder="`${$t('group.labelSlug')} …`"
      ></ds-input>
      <!-- groupType -->
      <!-- TODO: change it has to be implemented later -->
      <!-- TODO: move 'ds-select' from styleguide to main code and implement missen translation etc. functionality -->
      <!-- <ds-select
        id="groupType"
        :label="$t('group.type')"
        :v-model="formData.groupType"
        :label-prop="'label'"
        :options="groupTypeOptions"
        icon="user"
        :placeholder="$t('group.type') + ' …'"
      ></ds-select> -->
      <ds-text class="select-label">
        {{ $t('group.type') }}
      </ds-text>
      <ds-icon class="select-icon" name="user" />
      <select
        class="select"
        :options="groupTypeOptions"
        :value="formData.groupType"
        :disabled="update"
        @change="changeGroupType($event)"
      >
        <option v-for="groupType in groupTypeOptions" :key="groupType" :value="groupType">
          {{ $t(`group.types.${groupType}`) }}
        </option>
      </select>
      <!-- description -->
      <ds-input v-model="formData.about" :label="$t('group.goal')" rows="3"></ds-input>
      <ds-input
        :label="$t('group.description')"
        v-model="formData.description"
        type="textarea"
        rows="3"
      ></ds-input>
      <ds-space margin-top="large">
        <!-- actionRadius -->
        <!-- TODO: move 'ds-select' from styleguide to main code and implement missen translation etc. functionality -->
        <!-- <ds-select
          id="actionRadius"
          :label="$t('group.actionRadius')"
          v-model="formData"
          model="actionRadius"
          :options="['regional', 'national', 'continental', 'global']"
          icon="globe"
          :placeholder="`${$t('group.actionRadius')} …`"
        ></ds-select> -->
        <ds-text class="select-label">
          {{ $t('group.actionRadius') }}
        </ds-text>
        <ds-icon class="select-icon" name="globe" />
        <select
          class="select"
          :options="actionRadiusOptions"
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
        <!-- location -->
        <ds-select
          id="city"
          :label="$t('settings.data.labelCity')"
          v-model="formData.locationName"
          :options="cities"
          icon="map-marker"
          :placeholder="$t('settings.data.labelCity') + ' …'"
          :loading="loadingGeo"
          @input.native="handleCityInput"
        />
        <!-- TODO: implement clear button -->
        <!-- <base-button icon="close" circle ghost size="small" :disabled="formData.locationName.length === 0" @click="clear" /> -->
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
    </ds-form>
    <!-- Wolle: <ds-space centered v-show="!update">
        <nuxt-link to="/my-groups">{{ $t('group.back') }}</nuxt-link>
      </ds-space> -->
    <!-- Wolle: </ds-container> -->
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '~/constants/categories.js'
import { NAME_LENGTH_MIN, NAME_LENGTH_MAX } from '~/constants/groups.js'
import { queryLocations } from '~/graphql/location'

let timeout

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
.select-label {
  margin-bottom: 3pt;
  color: $text-color-soft;
}
.select-icon {
  margin-right: 4pt;
  color: $text-color-disabled;
}
.select {
  margin-bottom: $space-small;
  color: $text-color-base;
}
</style>

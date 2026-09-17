<template>
  <div>
    <form class="group-form" @submit.prevent="onSubmit" novalidate>
      <template>
        <!-- group Name -->
        <ocelot-input
          name="name"
          :label="$t('group.name')"
          model="name"
          autofocus
          :placeholder="`${$t('group.name')} …`"
          hide-error
          @blur="dirtyFields.name && touchField('name')"
        />
        <os-validation-hint
          :count="formData.name.length"
          :min="formSchema.name.min"
          :max="formSchema.name.max"
          :variant="visibleErrors && visibleErrors.name ? 'error' : null"
          :text="nameErrorText"
        />

        <!-- group Slug -->
        <ocelot-input
          v-if="update"
          :label="$t('group.labelSlug')"
          model="slug"
          prefix="&amp;"
          :placeholder="`${$t('group.labelSlug')} …`"
        ></ocelot-input>

        <div v-if="update" class="ds-mt-small ds-mb-large"></div>

        <!-- groupType -->
        <p class="ds-text select-label">
          {{ $t('group.type') }}
        </p>
        <select
          class="select ds-input appearance--auto"
          name="groupType"
          model="groupType"
          :value="formData.groupType"
          :disabled="update && (!group || group.myRole !== 'owner')"
          @change="changeGroupType($event)"
          @blur="touchField('groupType')"
        >
          <option
            v-for="groupType in groupTypeOptions"
            :key="groupType"
            :value="groupType"
            :disabled="groupType !== group.groupType && !$can(`group.create_${groupType}`)"
          >
            {{ $t(`group.typesOptions.${groupType}`) }}
          </option>
        </select>
        <os-validation-hint
          v-if="visibleErrors && visibleErrors.groupType && formData.groupType === ''"
          variant="error"
          :text="$t('group.validations.groupTypeRequired')"
        />

        <!-- showMembers -->
        <div class="show-members-control">
          <input
            id="show-members"
            type="checkbox"
            :checked="effectiveShowMembers"
            :disabled="formData.groupType !== 'closed'"
            @change="formData.showMembers = $event.target.checked"
          />
          <label for="show-members" :class="{ 'is-disabled': formData.groupType !== 'closed' }">
            {{ $t('group.showMembers') }}
          </label>
        </div>

        <!-- goal -->
        <ocelot-input
          name="about"
          :label="$t('group.goal')"
          v-model="formData.about"
          :placeholder="$t('group.goal') + ' …'"
          rows="3"
        />

        <div class="ds-mt-small ds-mb-large"></div>

        <!-- description -->
        <p class="ds-text select-label">
          {{ $t('group.description') }}
        </p>
        <editor
          name="description"
          model="description"
          :users="null"
          :value="formData.description"
          :hashtags="null"
          @input="updateEditorDescription"
          @blur.native.capture="dirtyFields.description && touchField('description')"
        />
        <os-validation-hint
          :count="descriptionLength"
          :max="formSchema.description.min"
          :variant="visibleErrors && visibleErrors.description ? 'error' : null"
          :text="visibleErrors && visibleErrors.description"
        />

        <!-- actionRadius -->
        <p class="ds-text select-label">
          {{ $t('group.actionRadius') }}
        </p>
        <action-radius-select
          v-model="formData.actionRadius"
          @change.native="changeActionRadius($event)"
          @blur.native="touchField('actionRadius')"
        />
        <os-validation-hint
          v-if="visibleErrors && visibleErrors.actionRadius && formData.actionRadius === ''"
          variant="error"
          :text="$t('group.validations.actionRadiusRequired')"
        />

        <!-- location -->
        <location-select v-model="formData.locationName" />

        <div class="ds-mt-small ds-mb-large"></div>

        <!-- category -->
        <div v-if="categoriesActive">
          <p class="ds-text select-label">
            {{ $t('group.categoriesTitle') }}
          </p>

          <categories-select
            model="categoryIds"
            name="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <os-validation-hint
            :count="formData.categoryIds.length"
            :max="3"
            :variant="visibleErrors && visibleErrors.categoryIds ? 'error' : null"
            :text="visibleErrors && visibleErrors.categoryIds"
          />
        </div>
        <!-- submit -->
        <div class="buttons ds-mt-large ds-mb-large">
          <os-button as="nuxt-link" to="/groups" variant="default" appearance="filled">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            variant="primary"
            appearance="filled"
            type="submit"
            :loading="loading"
            :disabled="loading"
            :class="{ 'permission-denied': !canCreateSelectedGroup }"
            :aria-disabled="!canCreateSelectedGroup"
            v-tooltip="{
              content: !canCreateSelectedGroup ? $t('permissions.deniedHint') : '',
            }"
          >
            <template #icon><os-icon :icon="icons.save" /></template>
            {{ update ? $t('group.update') : $t('group.save') }}
          </os-button>
        </div>
      </template>
    </form>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsValidationHint } from '@ocelot-social/ui'
import { branding } from '@ocelot-social/branding'
import { iconRegistry } from '~/utils/iconRegistry'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import Editor from '~/components/Editor/Editor'
import ActionRadiusSelect from '~/components/Select/ActionRadiusSelect'
import LocationSelect from '~/components/Select/LocationSelect'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'GroupForm',
  mixins: [GetCategories, formValidation],
  components: {
    CategoriesSelect,
    Editor,
    ActionRadiusSelect,
    LocationSelect,
    OsButton,
    OsIcon,
    OsValidationHint,
    OcelotInput,
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
    const {
      name,
      slug,
      groupType,
      about,
      description,
      actionRadius,
      locationName,
      categories,
      showMembers,
    } = this.group
    const initialCategoryIds = categories ? categories.map((category) => category.id) : []
    return {
      disabled: false,
      loading: false,
      groupTypeOptions: ['public', 'closed', 'hidden'],
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
        categoryIds: [...initialCategoryIds],
        showMembers: showMembers ?? false,
      },
      formSchema: {
        name: {
          required: true,
          min: branding.group.nameLengthMin,
          max: branding.group.nameLengthMax,
        },
        slug: { required: false, min: branding.group.nameLengthMin },
        groupType: { required: true, min: 1 },
        about: { required: false },
        description: {
          type: 'string',
          required: true,
          min: branding.group.descriptionMinLength,
          validator: (_, value = '') => {
            if (this.$filters.removeHtml(value).length < this.formSchema.description.min) {
              // A bare new Error() (no message) leaves formErrors.description as
              // '' — falsy, so a plain `visibleErrors && visibleErrors.description`
              // check (the validation hint's :text binding) never actually fires.
              return [new Error(this.$t('group.validations.descriptionNotEmpty'))]
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
              (value.length < branding.category.min || value.length > branding.category.max)
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
    formLocationName() {
      const isNestedValue =
        typeof this.formData.locationName === 'object' &&
        typeof this.formData.locationName.value === 'string'
      const isDirectString = typeof this.formData.locationName === 'string'
      return isNestedValue
        ? this.formData.locationName.value
        : isDirectString
          ? this.formData.locationName
          : ''
    },
    descriptionLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
    nameErrorText() {
      if (!this.visibleErrors?.name) return null
      return !this.formData.name.trim()
        ? this.$t('group.validations.nameNotEmpty')
        : this.$t('group.validations.nameLength', {
            min: this.formSchema.name.min,
            max: this.formSchema.name.max,
          })
    },
    // Flat per-type create rights (mirrors the backend group.create_* shield): the
    // "create group" entry point is open if the user may create at least one type, and
    // the submit gate keys off the currently selected type.
    canCreateAnyGroup() {
      return this.groupTypeOptions.some((type) => this.$can(`group.create_${type}`))
    },
    canCreateSelectedGroup() {
      if (this.update) return true
      // No type chosen yet (e.g. the form was just opened) — checking
      // `group.create_` (an empty suffix, matching no real permission)
      // would wrongly flag "denied" for someone who can create every
      // type, just hasn't picked one. Fall back to "can create at least
      // one type" until they do.
      if (!this.formData.groupType) return this.canCreateAnyGroup
      return this.$can(`group.create_${this.formData.groupType}`)
    },
    effectiveShowMembers() {
      if (this.formData.groupType === 'public') return true
      if (this.formData.groupType === 'hidden') return false
      return this.formData.showMembers
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    changeGroupType(event) {
      this.updateFormField('groupType', event.target.value)
    },
    changeActionRadius(event) {
      this.updateFormField('actionRadius', event.target.value)
    },
    changeLocation(event) {
      this.formData.locationName = event.target.value
    },
    updateEditorDescription(value) {
      this.updateFormField('description', value)
    },
    onSubmit() {
      // Block creating a group of a type the user may not create (the button is grayed;
      // this also guards keyboard Enter and direct navigation to the form).
      if (!this.update && !this.$can(`group.create_${this.formData.groupType}`)) return
      // Switching an existing group TO hidden additionally needs group.create_hidden
      // (the privacy-raising transition). Editing an already-hidden group is fine.
      if (
        this.formData.groupType === 'hidden' &&
        this.group.groupType !== 'hidden' &&
        !this.$can('group.create_hidden')
      ) {
        return
      }
      this.formSubmit(this.submit, () => {
        this.$toast.error(this.$t('common.validations.formHasErrors'))
      })
    },
    submit() {
      this.loading = true
      const { name, slug, about, description, groupType, actionRadius, categoryIds } = this.formData
      const variables = {
        name,
        slug,
        groupType,
        about,
        description,
        actionRadius,
        locationName: this.formLocationName,
        categoryIds,
        showMembers: this.effectiveShowMembers,
      }
      const done = () => {
        this.loading = false
      }
      this.update
        ? this.$emit('updateGroup', { ...variables, id: this.group.id }, done)
        : this.$emit('createGroup', variables, done)
    },
  },
}
</script>

<style>
.appearance--auto {
  -webkit-appearance: auto;
  -moz-appearance: auto;
  appearance: auto;
}

.select-label {
  margin-bottom: 0;
  padding-bottom: 4px;
  color: var(--color-neutral-40);
  font-size: 1rem;
}

.textarea-label {
  padding-bottom: 14px;
}

.group-form {
  display: flex;
  flex-direction: column;

  > .show-members-control {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-x-small);
    margin-bottom: var(--space-x-large);

    label.is-disabled {
      opacity: 0.5;
    }
  }

  /* Fixed gap after the groupType <select> itself, not a negative margin on
     .show-members-control counting on the validation hint above it always
     being there to cancel out — that hint (like every os-validation-hint
     here) is only actually in the DOM while there's something to show
     (v-if), so with no error present there was nothing for the negative
     margin to cancel, pulling the checkbox up into/over the select. */
  > select {
    margin-bottom: var(--space-x-small);
  }

  > .ds-form-item {
    margin: 0;
  }

  > .os-validation-hint {
    margin-bottom: var(--space-base);
    cursor: default;
  }

  /* :not(.os-validation-hint) — without it, this ALSO matches
     os-validation-hint's own root div directly (it's a bare <div> too,
     for the fields not wrapped in an extra one, e.g. name/description):
     matches both this selector and the .os-validation-hint rule above at
     equal specificity for shared properties, but this one is MORE
     specific overall (div + two :not()s beats a single class), so ITS
     flex-direction: column silently won over the component's own default
     row layout — stacking the message and the count/icon badge instead of
     spreading them left/right across the row. Not something
     ContributionForm.vue hits: its fields sit inside plain-block
     os-card__content, not a div matched by a rule like this one. */
  > div:not(.buttons):not(.show-members-control):not(.os-validation-hint) {
    display: flex;
    flex-direction: column;

    > .os-validation-hint {
      margin-bottom: var(--space-base);
      cursor: default;
    }
  }

  > .select-field {
    align-self: flex-end;
  }

  > .buttons {
    align-self: flex-end;
    margin-top: var(--space-base);
  }

  > .location-hint {
    margin-top: calc(-1 * var(--space-base) + var(--space-xxx-small));
  }
}
</style>

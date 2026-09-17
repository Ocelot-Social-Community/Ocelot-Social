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
          hide-error
          @blur="dirtyFields.slug && touchField('slug')"
        ></ocelot-input>
        <os-validation-hint
          v-if="update"
          :variant="visibleErrors && visibleErrors.slug ? 'error' : null"
          :text="visibleErrors && visibleErrors.slug"
        />

        <div v-if="update" class="ds-mb-base"></div>

        <!-- groupType -->
        <p class="ds-text select-label">
          {{ $t('group.type') }}
        </p>
        <div
          class="select-wrap"
          :class="{
            'ds-input-has-error':
              visibleErrors && visibleErrors.groupType && formData.groupType === '',
          }"
        >
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
        </div>
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
        <ocelot-input name="about" :label="$t('group.goal')" v-model="formData.about" rows="3" />

        <div class="ds-mb-base"></div>

        <!-- description -->
        <p class="ds-text select-label">
          {{ $t('group.description') }}
        </p>
        <div :class="{ 'ds-input-has-error': visibleErrors && visibleErrors.description }">
          <editor
            name="description"
            model="description"
            :users="null"
            :value="formData.description"
            :hashtags="null"
            @input="updateEditorDescription"
            @blur.native.capture="dirtyFields.description && touchField('description')"
          />
        </div>
        <os-validation-hint
          :count="descriptionLength"
          :variant="visibleErrors && visibleErrors.description ? 'error' : null"
          :text="visibleErrors && visibleErrors.description"
        />

        <!-- actionRadius -->
        <p class="ds-text select-label">
          {{ $t('group.actionRadius') }}
        </p>
        <div
          class="select-wrap action-radius-wrap"
          :class="{
            'ds-input-has-error':
              visibleErrors && visibleErrors.actionRadius && formData.actionRadius === '',
          }"
        >
          <action-radius-select
            v-model="formData.actionRadius"
            @change.native="changeActionRadius($event)"
            @blur.native="touchField('actionRadius')"
          />
        </div>
        <os-validation-hint
          v-if="visibleErrors && visibleErrors.actionRadius && formData.actionRadius === ''"
          variant="error"
          :text="$t('group.validations.actionRadiusRequired')"
        />

        <!-- location -->
        <location-select v-model="formData.locationName" />

        <div class="ds-mb-base"></div>

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
        slug: {
          type: 'string',
          // Only rendered/editable in update mode (see the template's
          // v-if="update") — on create, formData.slug stays empty and the
          // backend derives a fresh one from the name instead, so it must
          // stay optional there or an untouched create form could never
          // be submitted.
          required: this.update,
          min: branding.group.nameLengthMin,
          validator: (_, value = '') => {
            if (!this.update) return []
            if (!value.trim()) {
              return [new Error(this.$t('group.validations.slugNotEmpty'))]
            }
            // Mirrors the backend's own slug pattern (db/schema/entities/patterns.ts'
            // SLUG) — without this, an invalid value typed here only surfaces as a
            // generic save failure after the round trip to the server.
            if (!/^[a-z0-9_-]+$/.test(value)) {
              return [new Error(this.$t('group.validations.slugInvalidCharacters'))]
            }
            return []
          },
        },
        groupType: { required: true, min: 1 },
        about: { required: false },
        description: {
          type: 'string',
          required: true,
          min: branding.group.descriptionMinLength,
          validator: (_, value = '') => {
            const plainText = this.$filters.removeHtml(value)
            if (plainText.length < this.formSchema.description.min) {
              // Same empty-vs-too-short distinction as nameErrorText: someone who
              // typed a few characters did enter a description, so telling them
              // to "enter a description" (descriptionNotEmpty) would be wrong —
              // only a genuinely empty field gets that message.
              // A bare new Error() (no message) leaves formErrors.description as
              // '' — falsy, so a plain `visibleErrors && visibleErrors.description`
              // check (the validation hint's :text binding) never actually fires.
              return [
                new Error(
                  plainText.trim()
                    ? this.$t('group.validations.descriptionLength', {
                        min: this.formSchema.description.min,
                      })
                    : this.$t('group.validations.descriptionNotEmpty'),
                ),
              ]
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
      // this also guards keyboard Enter and direct navigation to the form). Only once a
      // type is actually chosen — same fix as canCreateSelectedGroup: checking
      // `$can('group.create_')` (empty suffix) for an untouched, still-empty groupType
      // is never true for anyone, so this used to silently block every submit attempt
      // on a fresh form (no validation, no toast, nothing) even for an admin who can
      // create every type. Submitting with no type chosen should fall through to
      // formSubmit() instead, so the schema's own "groupType is required" catches it
      // and shows the usual error + toast like any other invalid field.
      if (
        !this.update &&
        this.formData.groupType &&
        !this.$can(`group.create_${this.formData.groupType}`)
      )
        return
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

/* Editor's own margin-top lives on .editor-content (the space between its
   own toolbar and the text area) — same override ContributionForm.vue
   uses for its own description-style editor field, matched to the
   label's own gap above the toolbar rather than the component's larger
   default. */
.group-form .select-label + div .editor-content {
  margin-top: var(--space-x-small);
}

.group-form {
  display: flex;
  flex-direction: column;

  > .show-members-control {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-x-small);
    margin-top: var(--space-x-small);
    margin-bottom: var(--space-base);

    label.is-disabled {
      opacity: 0.5;
    }
  }

  > .ds-form-item {
    margin: 0;
  }

  /* Same zeroed margin as .ds-form-item above (OcelotInput's own root) —
     without it, the groupType/actionRadius selects sat noticeably further
     from their validation hint below than name/description do, since
     those two are the only fields wrapped in an extra div (for the
     ds-input-has-error red border; see the template) and that div had no
     margin reset of its own. */
  > .select-wrap {
    margin: 0;
  }

  /* Unlike groupType's select-wrap (whose next sibling is the checkbox and
     stays deliberately tight, handled above), actionRadius's next sibling
     is the next field group (location) and should keep the same
     space-base gap every other field-to-field transition uses — there is
     no explicit spacer div for it any more (see template). */
  > .action-radius-wrap {
    margin-bottom: var(--space-base);
  }

  /* ...unless the hint is actually showing: then the tight field+hint gap
     (the hint's own 4px top margin) is what should apply here instead, and
     the space-base gap to the next field comes from the hint's own
     margin-bottom below. Without this, the two would add up and push the
     hint away from its select. */
  > .action-radius-wrap:has(+ .os-validation-hint) {
    margin-bottom: 0;
  }

  > .os-validation-hint {
    margin-bottom: var(--space-base);
    cursor: default;
  }

  /* .show-members-control's own margin-top (8px, above) assumes it's
     sitting right after the groupType select directly. When the select's
     validation hint is showing instead (error state), that hint's own
     margin-bottom (16px, from the rule above — meant for the general case
     of one field's hint to the next field) adds to those 8px instead of
     collapsing with them (flex containers never collapse sibling
     margins), pulling the checkbox noticeably further down than in the
     no-error case. Cancel just the hint's margin here so the gap stays
     the same small size either way. */
  > .os-validation-hint + .show-members-control {
    margin-top: calc(var(--space-x-small) - var(--space-base));
  }

  /* Same double-margin problem as above, one field over: the slug field's
     own space-base spacer div (see template) assumes it sits right after
     the input — when the slug hint renders between them instead (error
     state), its own margin-bottom already provides that gap, so the
     spacer's identical margin would otherwise just add another one on
     top. */
  > .os-validation-hint + .ds-mb-base {
    margin-bottom: 0;
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

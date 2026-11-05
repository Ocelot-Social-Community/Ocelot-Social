<template>
  <os-modal
    class="report-modal"
    size="lg"
    :title="title"
    :close-label="$t('actions.close')"
    :open="isOpen"
    @cancel="cancel"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-html="message" />
    <div class="ds-mb-small"></div>
    <fieldset class="report-radio-group" data-test="report-radio-group" role="radiogroup">
      <legend>{{ $t('report.reason.category.label') }}</legend>
      <div
        v-for="(option, index) in form.reasonCategoryOptions"
        :key="option.value"
        class="report-radio-option"
        :class="{ 'report-radio-option-selected': form.reasonCategory === option }"
        role="radio"
        :aria-checked="String(form.reasonCategory === option)"
        :tabindex="form.reasonCategory === option || (!form.reasonCategory && index === 0) ? 0 : -1"
        @click="selectReasonCategory(option)"
        @keydown.space.prevent="selectReasonCategory(option)"
        @keydown.enter.prevent="selectReasonCategory(option)"
        @keydown.down.prevent="focusRadioOption(index + 1)"
        @keydown.up.prevent="focusRadioOption(index - 1)"
      >
        <span class="report-radio-option-mark" />
        <span class="report-radio-option-label">{{ option.label }}</span>
      </div>
    </fieldset>
    <ocelot-input
      class="reason-description"
      v-model="form.reasonDescription"
      :schema="formSchema.reasonDescription"
      :label="$t('report.reason.description.label')"
      :placeholder="$t('report.reason.description.placeholder')"
      type="textarea"
      rows="5"
    />
    <small class="smallTag">
      {{ form.reasonDescription.length }}/{{ formSchema.reasonDescription.max }}
    </small>
    <template #footer>
      <os-button class="cancel" variant="primary" appearance="outline" @click="cancel">
        <template #icon>
          <os-icon :icon="icons.close" />
        </template>
        {{ $t('report.cancel') }}
      </os-button>

      <os-button
        class="confirm"
        variant="danger"
        appearance="filled"
        :disabled="!form.reasonCategory"
        :loading="loading"
        @click="confirm"
      >
        <template #icon>
          <os-icon :icon="icons.exclamationCircle" />
        </template>
        {{ $t('report.submit') }}
      </os-button>
    </template>
  </os-modal>
</template>

<script>
import { OsButton, OsIcon, OsModal } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { reportMutation } from '~/graphql/Moderation.js'
import { valuesReasonCategoryOptions } from '~/constants/modals.js'
import validReport from '~/components/utils/ReportModal'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'ReportModal',
  components: {
    OsButton,
    OsIcon,
    OsModal,
    OcelotInput,
  },
  props: {
    name: { type: String, default: '' },
    type: { type: String, required: true },
    id: { type: String, required: true },
  },
  data() {
    return {
      isOpen: true,
      loading: false,
      form: {
        reasonCategory: null,
        reasonCategoryOptions: [],
        reasonDescription: '',
      },
    }
  },
  computed: {
    title() {
      return this.$t(`report.${this.type}.title`)
    },
    message() {
      const name = this.$filters.truncate(this.name, 30)
      return this.$t(`report.${this.type}.message`, { name })
    },
    formSchema() {
      const validReportSchema = validReport({ translate: this.$t })
      return {
        ...validReportSchema.formSchema,
      }
    },
  },
  created() {
    this.icons = iconRegistry
    this.form.reasonCategoryOptions = valuesReasonCategoryOptions.map((reasonCategory) => {
      return {
        label: this.$t('report.reason.category.options.' + reasonCategory),
        value: reasonCategory,
      }
    })
  },
  methods: {
    close() {
      this.isOpen = false
      this.$emit('close')
    },
    cancel() {
      this.close()
    },
    selectReasonCategory(option) {
      this.form.reasonCategory = option
      this.$nextTick(() => {
        const selected = this.$el.querySelector('.report-radio-option[aria-checked="true"]')
        if (selected) selected.focus()
      })
    },
    focusRadioOption(index) {
      const options = this.form.reasonCategoryOptions
      const wrappedIndex = (index + options.length) % options.length
      this.selectReasonCategory(options[wrappedIndex])
    },
    async confirm() {
      const { reasonCategory, reasonDescription } = this.form
      this.loading = true
      this.$apollo
        .mutate({
          mutation: reportMutation(),
          variables: {
            resourceId: this.id,
            reasonCategory: reasonCategory.value,
            reasonDescription,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('report.success'))
          this.loading = false
          this.close()
        })
        .catch((err) => {
          switch (err.message) {
            case 'GraphQL error: User':
              this.$toast.error(this.$t('report.user.error'))
              break
            case 'GraphQL error: Post':
              this.$toast.error(this.$t('report.contribution.error'))
              break
            case 'GraphQL error: Comment':
              this.$toast.error(this.$t('report.comment.error'))
              break
            default:
              this.$toastBackendError(err)
          }
          this.loading = false
          this.close()
        })
    },
  },
}
</script>

<style>
.report-modal .report-radio-group {
  border: none;
  padding: 0;
  margin: 0;
}
.report-modal .report-radio-group legend {
  font-weight: bold;
  margin-bottom: var(--space-xx-small);
}
.report-modal .report-radio-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
}
.report-modal .report-radio-option-mark {
  display: inline-block;
  position: relative;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border: 2px solid var(--border-color-base);
  background-color: var(--background-color-base);
  border-radius: 50%;
  margin-right: 8px;
}
.report-modal .report-radio-option-mark::before {
  position: absolute;
  content: '';
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%) scale(0);
  opacity: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-color-primary);
  transition: all 0.1s ease-in;
}
.report-modal .report-radio-option-selected .report-radio-option-mark::before {
  opacity: 1;
  transform: translateY(-50%) translateX(-50%) scale(1);
}
.report-modal .report-radio-option-label {
  cursor: pointer;
  flex: 1;
}
.report-modal .reason-description {
  margin-top: var(--space-x-small) !important;
  margin-bottom: var(--space-xx-small) !important;
}
.report-modal .smallTag {
  width: 100%;
  position: relative;
  left: 90%;
}
</style>

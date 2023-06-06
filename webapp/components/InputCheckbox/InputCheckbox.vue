<template>
  <div>
    <input type="checkbox" v-model="currentValue" :name="name" />
    {{ label }}
  </div>
</template>
<script>
export default {
  inject: {
    $parentForm: {
      default: null,
    },
  },
  props: {
    value: {
      type: Boolean,
      required: true,
      default: false,
    },
    label: {
      type: String,
      required: true,
      default: '',
    },
    name: {
      type: String,
      required: false,
      default: '',
    },
  },
  data() {
    return {
      currentValue: this.value,
    }
  },
  watch: {
    currentValue() {
      this.$parentForm.update('formData.isOnlineEvent', this.currentValue)
    },
  },
}
</script>

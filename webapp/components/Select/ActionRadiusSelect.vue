<template>
  <select
    class="select ds-input appearance--auto"
    name="actionRadius"
    :value="value"
    @change="onActionRadiusChange"
  >
    <option v-for="actionRadius in actionRadiusOptions" :key="actionRadius" :value="actionRadius">
      {{ $t(`group.actionRadii.${actionRadius}`) }}
    </option>
  </select>
</template>

<script>
export default {
  name: 'ActionRadiusSelect',
  props: {
    value: {
      required: true,
    }
  },
  data() {
    return {
      actionRadiusOptions: ['regional', 'national', 'continental', 'global'],
    }
  },
  methods: {
    onActionRadiusChange(event) {
      this.$emit('change', event.target.value)
    },
  },
}
</script>

<script lang="ts" setup>
import { ref } from 'vue'

import EyeClosedIcon from '#components/icons/EyeClosedIcon.vue'
import EyeIcon from '#components/icons/EyeIcon.vue'
import PasswordIcon from '#components/icons/PasswordIcon.vue'

withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    required?: boolean
    autofocus?: boolean
  }>(),
  {
    label: '',
    placeholder: '',
    required: undefined,
    autofocus: undefined,
  },
)

const password = defineModel<string>()

const reveal = ref(false)

function toggleReveal() {
  reveal.value = !reveal.value
}
</script>

<template>
  <div class="d-flex">
    <v-text-field
      v-model="password"
      variant="outlined"
      :type="reveal ? 'text' : 'password'"
      :label="$props.label"
      :required="required"
      :placeholder="$props.placeholder"
      :prepend-inner-icon="PasswordIcon"
      :class="['password-field']"
    >
    </v-text-field>
    <v-btn class="reveal-button" type="button" @click="toggleReveal">
      <component :is="reveal ? EyeClosedIcon : EyeIcon"></component>
    </v-btn>
  </div>
</template>

<style lang="scss">
@use '../../assets/sass/style';

.v-field {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.reveal-button {
  height: style.$input-control-height !important;
  border: 1px solid rgb(var(--v-border-color), var(--v-border-opacity)) !important; // --v-border-opacity 0.12, but should be more like 30%
  border-left: none !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  box-shadow: none !important;
}

/*
.password-wrapper {
  display: grid;
}

.v-input {
  grid-area: 1 / 1;
}

.reveal-button {
  align-self: start;
  justify-self: right;
  grid-area: 1 / 1;
  height: 52px !important;
  margin-top: 2px;
  margin-right: 2px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
} */

/*
.password-wrapper {
  display: flex;
  width: 100%;
  align-items: center;
  padding-left: 0;
  padding-right: 0;
  height: $input-height;
  margin-bottom: 10px;

  color: $text-color-base;
  background: $background-color-disabled;

  border: $input-border-size solid $border-color-softer;
  border-radius: $border-radius-base;
  outline: none;
  transition: all $duration-short $ease-out;

  &:focus-within {
    background-color: $background-color-base;
    border: $input-border-size solid $border-color-active;

    .toggle-icon {
      color: $text-color-base;
    }
  }

  .password-field {
    position: relative;
    padding-top: 16px;
    border: none;
    border-style: none;
    appearance: none;
    margin-left: 0;
    width: 100%;
  }
}
*/
</style>

<template>
   <div class="input-wrapper">
      <base-icon class="input-icon" v-if="icon" :name="icon" /> 
      
      <input
         class="base-input"
         :class="[
            icon && `input-has-icon`,
            iconRight && `input-has-icon-right`,
            iconRightSecondary && `input-has-icon-right-secondary`
         ]"
         type="type"
         :placeholder="placeholder"
         :name="name ? name : model"
         :disabled="disabled"
         :value.prop="innerValue"
         :rows="type === 'textarea' ? rows : null"
         v-html="type === textarea"
         @input="handleInput"
         @focus="handleFocus"
      />
      <base-icon 
         class="input-icon-right"
         v-if="iconRight" 
         :name="iconRight" />
      <base-icon 
         class="input-icon-right"
         v-if="iconRightSecondary" 
         :name="iconRightSecondary" />
   </div>
</template>

<script>

import BaseIcon from '../BaseIcon/BaseIcon'

export default {
   components: {
      BaseIcon,
   },
   props: {
      type: {
         type: String, 
         default: 'text',
         // validator - check if there is existing value helper
      },
      placeholder: {
         type: String, 
         default: null
      },
      icon: {
         type: String, 
         default: null
      },
      autofocus: {
         type: Boolean,
         default: false
      },
      rows: {
         type: [String, Number],
         default: 1
      },
      iconRight: {
         type: String, 
         default: null
      },
      iconRightSecondary: {
         type: String, 
         default: null
      }
   },
   computed: {
      tag() {
         if (this.type === 'textarea') {
            return 'textarea'
         }
         return 'input'
      }
   },
   methods: {
      handleInput(event) {
       this.input(event.target.value)
      },
      input(value) {
         this.innerValue = value
         if (this.$parentForm) {
         this.$parentForm.update(this.model, value)
         } else {
         /**
            * Fires after user input.
            * Receives the value as the only argument.
            *
            * @event input
            */
         this.$emit('input', value)
         this.validate(value)
         }
      },
      handleFocus() {
         this.focus = true
      }
   }
}
</script>

<style lang="scss">
   .input-wrapper {
      position: relative;
      display: flex;
      appearance: none;
      box-sizing: border-box;
      font-size: $input-font-size-base;
      line-height: $line-height-base;
      font-family: $font-family-text;
      width: 100%;
      padding: $input-padding-vertical $space-x-small;
      height: $input-height;
   
      color: $text-color-base;
      background: $background-color-base;
   
      border: $input-border-size solid $border-color-base;
      border-radius: $border-radius-base;
      outline: none;
      transition: all $duration-short $ease-out;

      
   } 

   .base-input {
      border: none;
      width: 76%;

      &::placeholder {
         color: $text-color-disabled;
      }

      .input-has-focus &,
      &:focus {
         border-color: $border-color-active;
         background: $background-color-base;
      }

      .input-is-disabled &,
      &:disabled {
         color: $text-color-disabled;
         opacity: $opacity-disabled;
         pointer-events: none;
         cursor: not-allowed;
         background-color: $background-color-disabled;
      }
   }

   .base-input:focus {
      outline-width: 0;
   }

   .input-icon,
   .input-icon-right {
      top: 0;
      bottom: 0;
      left: 0;
      width: 6%;
      align-items: center;
      justify-content: center;
      width: $input-height;
      color: $text-color-softer;
      transition: color $duration-short $ease-out;
      pointer-events: none;
      
      .input-has-focus & {
         color: $text-color-base;
      }
   }

   /* .input-has-icon-right {
      padding-right: $input-height;

      .input-size-small & {
         padding-right: $input-height-small;
      }

      .input-size-large & {
         padding-right: $input-height-large;
      }
   }

   .input-has-icon-right-secondary {
      padding-right: $input-height;

      .input-size-small & {
         padding-right: $input-height-small;
      }

      .input-size-large & {
         padding-right: $input-height-large;
      }
   } */
</style>

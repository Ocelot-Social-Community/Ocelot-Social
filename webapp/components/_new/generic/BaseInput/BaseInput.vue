<template>
   <div class="input-wrapper" :class="[focus]">
      <base-icon class="input-icon" v-if="icon" :name="icon" /> 
      
      <input
         class="base-input"
         :class="[
            icon && `input-has-icon`,
            iconRight && `input-has-icon-right`,
            iconRightSecondary && `input-has-icon-right-secondary`
         ]"
         :id="id"
         :name="name ? name : model"
         :type="[showPassword ? 'text' : 'password']"
         :v-model="type"
         :autofocus="autofocus"
         :placeholder="placeholder"
         :tabindex="tabindex"
         :disabled="disabled"
         :readonly="readonly"
         :value.prop="innerValue"
         @input="handleInput"
         @focus="handleFocus"
         @blur="handleBlur"
         v-on:keydown.caps-lock="caps = true"
         v-on:keyup.caps-lock="caps = false"
      />
      <base-icon 
         class="input-icon-right"
         v-show="caps" 
         :name="iconRight" />
      <a
         class="click-wrapper"
         @mousedown="(event) => {
            showPassword = !showPassword;
            event.preventDefault();
            }"
      >
         <base-icon 
            class="toggle-icon"
            :icon="[showPassword ? iconRightSecondary = 'eye-slash' :  iconRightSecondary = 'eye']"
            v-if="iconRightSecondary" 
            :name="iconRightSecondary" 
         />
      </a>
   </div>
</template>

<script>

import BaseButton from '../BaseButton/BaseButton'
import BaseIcon from '../BaseIcon/BaseIcon'
import IconButton from '../IconButton/IconButton'
import inputMixin from '~/mixins/tempMixins-styleguide/input'

export default {
   components: {
      BaseIcon,
      BaseButton,
      IconButton
   },
   data: function() {
      return {
         showPassword: false,
         caps: false
      }
   },
   mixins: [inputMixin],
   props: {
      type: {
         type: String, 
         default: 'text',
         validator: value => {
            return value.match(/(url|text|password|email|search|textarea)/)
         }
      },
      placeholder: {
         type: String, 
         default: null
      },
      autofocus: {
         type: Boolean,
         default: false
      },
      icon: {
         type: String, 
         default: null
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
}
</script>

<style lang="scss">
   .input-wrapper {
      position: relative;
      display: flex;
      appearance: none;
      box-sizing: border-box;
      width: 100%;
      padding: $input-padding-vertical $space-x-small;
      height: $input-height;
   
      color: $text-color-base;
      background: $background-color-disabled;
   
      border: $input-border-size solid $border-color-softer;
      border-radius: $border-radius-base;
      outline: none;
      transition: all $duration-short $ease-out;

      &:focus-within {
         background-color: $background-color-base;
         border: $input-border-size solid $border-color-active;

         .input-icon {
            color: $text-color-base;
         }

      }
    

      .base-input {
         border: none;
         width: 60%;
         background-color: $background-color-disabled;
         font-size: $input-font-size-base;
         line-height: $line-height-base;
         font-family: $font-family-text;
         padding: $input-padding-vertical $space-x-small;
      
         &::placeholder {
            color: $text-color-disabled;
         }

         &:focus {
            background: $background-color-base;

            .input-wrapper {
               background-color: $background-color-base;
               border: $input-border-size solid $border-color-active;
            }
            .toggle-icon,
            .click-wrapper,
            .input-icon-right {
               background-color: $background-color-base;
            }
         }
      }
   }



   .base-input:focus {
      outline-width: 0;
   }

   .input-icon {
      align-items: center;
      justify-content: center;
      width: $input-height;
      color: $text-color-softer;
      transition: color $duration-short $ease-out;
      pointer-events: none;
   }

   .input-icon-right,
   .toggle-icon {
      align-items: center;
      justify-content: center;
      width: $input-height;
      color: $text-color-softer;
      transition: color $duration-short $ease-out;
      pointer-events: none;
   }
   
   .click-wrapper {
      position: absolute;
      right: 10px;
   }


   
   

   
</style>

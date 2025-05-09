<template>
  <component :is="tag" class="ds-logo" :class="[inverse && 'ds-logo-inverse']">
    <!-- Desktop logo -->
    <img
      class="ds-logo-svg ds-logo-desktop"
      :alt="metadata.APPLICATION_NAME + ' ' + logo.alt"
      :src="logo.path"
      :style="logoWidthStyle"
    />

    <!-- Mobile logo (falls back to desktop if not provided) -->
    <img
      class="ds-logo-svg ds-logo-mobile"
      :alt="metadata.APPLICATION_NAME + ' ' + logo.alt + ' Mobile'"
      :src="logo.mobilePath || logo.path"
      :style="mobileLogoWidthStyle"
    />
  </component>
</template>

<script>
import logos from '~/constants/logosBranded.js'
import metadata from '~/constants/metadata.js'

/**
 * This component displays the brand's logo.
 * @version 1.1.0
 */
export default {
  name: 'Logo',
  props: {
    /**
     * Logo type
     */
    logoType: {
      type: String,
      required: true,
    },
    /**
     * Logo width
     */
    logoWidth: {
      type: String,
      default: null,
    },
    /**
     * Mobile logo width
     */
    mobileLogoWidth: {
      type: String,
      default: null,
    },
    /**
     * Inverse the logo
     */
    inverse: {
      type: Boolean,
      default: false,
    },
    /**
     * The html element name used for the logo.
     */
    tag: {
      type: String,
      default: 'div',
    }
  },
  data() {
    const logosObject = {
      header: {
        path: logos.LOGO_HEADER_PATH,
        mobilePath: logos.LOGO_HEADER_MOBILE_PATH || null,
        alt: 'Header',
        widthDefault: logos.LOGO_HEADER_WIDTH,
        mobileWidthDefault: logos.LOGO_HEADER_MOBILE_WIDTH || logos.LOGO_HEADER_WIDTH
      },
      welcome: { path: logos.LOGO_WELCOME_PATH, alt: 'Welcome', widthDefault: '200px' },
      signup: { path: logos.LOGO_SIGNUP_PATH, alt: 'Sign Up', widthDefault: '200px' },
      logout: { path: logos.LOGO_LOGOUT_PATH, alt: 'Logging Out', widthDefault: '200px' },
      passwordReset: {
        path: logos.LOGO_PASSWORD_RESET_PATH,
        alt: 'Reset Your Password',
        widthDefault: '200px',
      },
      maintenance: {
        path: logos.LOGO_MAINTENACE_RESET_PATH,
        alt: 'Under Maintenance',
        widthDefault: '200px',
      },
    }
    return {
      logo: logosObject[this.logoType],
      metadata,
    }
  },
  computed: {
    logoWidthStyle() {
      let width = this.logoWidth === null ? this.logo.widthDefault : this.logoWidth;
      return `width: ${width};`;
    },
    mobileLogoWidthStyle() {
      let width = this.mobileLogoWidth === null ? this.logo.mobileWidthDefault : this.mobileLogoWidth;
      return `width: ${width};`;
    }
  }
}
</script>

<style lang="scss" scoped>
.ds-logo {
  @include reset;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: $text-color-primary;
}

.ds-logo-inverse {
  color: $text-color-primary-inverse;
}

.ds-logo-svg {
  height: auto;
  fill: #000000;
  max-width: 100%;
}

/* Show desktop logo by default and hide mobile logo */
.ds-logo-desktop {
  display: block;
}

.ds-logo-mobile {
  display: none;
}

@media (max-width: 767px) {
  .ds-logo-desktop {
    display: none;
  }

  .ds-logo-mobile {
    display: block;
  }
}
</style>

<docs src="./demo.md"></docs>

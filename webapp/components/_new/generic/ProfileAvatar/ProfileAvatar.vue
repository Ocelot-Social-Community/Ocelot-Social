<template>
  <div :class="['profile-avatar', size && `--${size}`, !showImage && '--no-image']">
    <!-- '--no-image' is neccessary, because otherwise we still have a little unwanted boarder araund the image for images with white backgrounds -->
    <span class="initials">{{ profileInitials }}</span>
    <os-icon v-if="isAnonymous" :icon="icons.eyeSlash" />
    <responsive-image
      v-if="showImage"
      :image="profile.avatar"
      class="image"
      :alt="profile.name"
      :title="showProfileNameTitle ? profile.name : ''"
      :loading="loading"
      @error="imageFailed = true"
      sizes="320px"
    />
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage.vue'

export default {
  name: 'ProfileAvatar',
  components: {
    OsIcon,
    ResponsiveImage,
  },
  props: {
    size: {
      type: String,
      required: false,
      validator: (value) => {
        return /^(small|large)$/.test(value)
      },
    },
    profile: {
      type: Object,
      default: null,
    },
    showProfileNameTitle: {
      type: Boolean,
      default: true,
    },
    loading: {
      // Forwarded to ResponsiveImage — see its prop docs for when 'eager' is
      // the right call.
      type: String,
      default: 'lazy',
      validator: (value) => /^(lazy|eager)$/.test(value),
    },
  },
  data() {
    return {
      imageFailed: false,
    }
  },
  watch: {
    'profile.avatar.url'() {
      // A new URL deserves a fresh attempt — otherwise one broken avatar would
      // permanently pin this instance to the initials fallback even after the
      // component is reused for a different profile.
      this.imageFailed = false
    },
  },
  computed: {
    isAnonymous() {
      return !this.profile || !this.profile.name || this.profile.name.toLowerCase() === 'anonymous'
    },
    isAvatar() {
      return this.profile && this.profile.avatar
    },
    showImage() {
      // An unreachable avatar URL must fall back to the initials treatment.
      // Dropping only the <img> is not enough: '--no-image' also supplies the
      // dark background the initials are legible against, so without this the
      // avatar renders as light-on-light and reads as broken.
      return !!this.isAvatar && !this.imageFailed
    },
    profileInitials() {
      if (this.isAnonymous) return ''

      return this.profile.name.match(/\b\w/g).join('').substring(0, 3).toUpperCase()
    },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style lang="scss">
.profile-avatar {
  position: relative;
  height: $size-avatar-base;
  width: $size-avatar-base;
  border-radius: 50%;
  overflow: hidden;
  background-color: $background-color-base;
  color: $text-color-primary-inverse;

  &.--small {
    width: $size-avatar-small;
    height: $size-avatar-small;
  }

  &.--large {
    width: $size-avatar-large;
    height: $size-avatar-large;
    font-size: $font-size-xx-large;
  }

  &.--no-image {
    background-color: $color-primary-dark;
  }

  > .initials,
  > .os-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  > .image {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    background-color: $background-color-base;
  }
}
</style>

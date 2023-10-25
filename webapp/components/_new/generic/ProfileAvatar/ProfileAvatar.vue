<template>
  <div :class="['profile-avatar', size && `--${this.size}`, !isAvatar && '--no-image']">
    <!-- '--no-image' is neccessary, because otherwise we still have a little unwanted boarder araund the image for images with white backgrounds -->
    <span class="initials">{{ profileInitials }}</span>
    <base-icon v-if="isAnonymous" name="eye-slash" />
    <img
      v-if="isAvatar"
      :src="profile.avatar | proxyApiUrl"
      class="image"
      :alt="profile.name"
      :title="showProfileNameTitle ? profile.name : ''"
      @error="$event.target.style.display = 'none'"
    />
  </div>
</template>

<script>
export default {
  name: 'ProfileAvatar',
  props: {
    size: {
      type: String,
      required: false,
      validator: (value) => {
        return value.match(/(small|large)/)
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
  },
  computed: {
    isAnonymous() {
      return !this.profile || !this.profile.name || this.profile.name.toLowerCase() === 'anonymous'
    },
    isAvatar() {
      // TODO may we could test as well if the image is reachable? otherwise the background gets white and the initails can not be read
      return this.profile && this.profile.avatar
    },
    profileInitials() {
      if (this.isAnonymous) return ''

      return this.profile.name.match(/\b\w/g).join('').substring(0, 3).toUpperCase()
    },
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
  > .base-icon {
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

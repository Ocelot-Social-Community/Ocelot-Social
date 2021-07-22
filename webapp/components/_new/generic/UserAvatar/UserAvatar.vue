<template>
  <div :class="['user-avatar', size && `--${this.size}`, !isAvatar && '--no-image']">
    <!-- '--no-image' is neccessary, because otherwise we still have a little unwanted boarder araund the image for images with white backgrounds -->
    <span class="initials">{{ userInitials }}</span>
    <base-icon v-if="isAnonymous" name="eye-slash" />
    <img
      v-if="isAvatar"
      :src="user.avatar | proxyApiUrl"
      class="image"
      :alt="user.name"
      :title="user.name"
      @error="$event.target.style.display = 'none'"
    />
  </div>
</template>

<script>
export default {
  name: 'UserAvatar',
  props: {
    size: {
      type: String,
      required: false,
      validator: (value) => {
        return value.match(/(small|large)/)
      },
    },
    user: {
      type: Object,
      default: null,
    },
  },
  computed: {
    isAnonymous() {
      return !this.user || !this.user.name || this.user.name.toLowerCase() === 'anonymous'
    },
    isAvatar() {
      // TODO may we could test as well if the image is reachable? otherwise the background gets white and the initails can not be read
      return this.user && this.user.avatar
    },
    userInitials() {
      if (this.isAnonymous) return ''

      return this.user.name.match(/\b\w/g).join('').substring(0, 3).toUpperCase()
    },
  },
}
</script>

<style lang="scss">
.user-avatar {
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

<template>
  <div class="image-uploader">
    <vue-dropzone
      v-show="!showCropper && !hasImage"
      id="postdropzone"
      :options="dropzoneOptions"
      :use-custom-slot="true"
      @vdropzone-file-added="fileAdded"
    >
      <loading-spinner v-if="isLoadingImage" />
      <base-icon v-else-if="!hasImage" name="image" />
      <div v-if="!hasImage" class="supported-formats">
        {{ $t('contribution.teaserImage.supportedFormats') }}
      </div>
    </vue-dropzone>
    <div v-show="!showCropper && hasImage">
      <os-button
        class="delete-image-button"
        variant="danger"
        appearance="filled"
        circle
        data-test="delete-button"
        :title="$t('actions.delete')"
        :aria-label="$t('actions.delete')"
        @click.stop="deleteImage"
      >
        <template #icon>
          <base-icon name="trash" />
        </template>
      </os-button>
    </div>
    <div v-show="!showCropper && imageCanBeCropped" class="crop-overlay">
      <os-button class="crop-confirm" variant="primary" @click="initCropper">
        {{ $t('contribution.teaserImage.cropImage') }}
      </os-button>
    </div>
    <div v-show="showCropper" class="crop-overlay">
      <img id="cropping-image" />
      <os-button class="crop-confirm" variant="primary" @click="cropImage">
        {{ $t('contribution.teaserImage.cropperConfirm') }}
      </os-button>
      <os-button
        class="crop-cancel"
        variant="danger"
        appearance="filled"
        circle
        size="sm"
        :aria-label="$t('actions.cancel')"
        @click="closeCropper"
      >
        <template #icon>
          <base-icon name="close" />
        </template>
      </os-button>
    </div>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import Cropper from 'cropperjs'
import VueDropzone from 'nuxt-dropzone'
import LoadingSpinner from '~/components/_new/generic/LoadingSpinner/LoadingSpinner'
import 'cropperjs/dist/cropper.css'

const minAspectRatio = 0.3

export default {
  components: {
    LoadingSpinner,
    OsButton,
    VueDropzone,
  },
  props: {
    hasImage: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      dropzoneOptions: {
        url: () => '',
        maxFilesize: 5.0,
        previewTemplate: '<span class="no-preview" />',
        acceptedFiles: '.png,.jpg,.jpeg,.gif',
      },
      cropper: null,
      file: null,
      showCropper: false,
      imageCanBeCropped: false,
      isLoadingImage: false,
    }
  },
  methods: {
    onUnSupportedFormat(message) {
      this.$toast.error(message)
    },
    addImageProcess(src) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })
    },
    async fileAdded(file) {
      const supportedFormats = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif']
      if (supportedFormats.indexOf(file.type) < 0) {
        this.onUnSupportedFormat(this.$t('contribution.teaserImage.errors.unSupported-file-format'))
        this.$nextTick((this.isLoadingImage = false))
        return null
      }
      const imageURL = URL.createObjectURL(file)
      const image = await this.addImageProcess(imageURL)
      const aspectRatio = image.width / image.height
      if (aspectRatio < minAspectRatio) {
        this.aspectRatioError()
        return null
      }
      this.saveImage(aspectRatio, file, file.type)
      this.file = file
      if (this.file.type === 'image/jpeg') this.imageCanBeCropped = true
      this.$nextTick((this.isLoadingImage = false))
    },
    initCropper() {
      this.showCropper = true
      const imageElement = document.querySelector('#cropping-image')
      imageElement.src = URL.createObjectURL(this.file)
      this.cropper = new Cropper(imageElement, { zoomable: false, autoCropArea: 0.9 })
    },
    cropImage() {
      this.isLoadingImage = true
      const onCropComplete = (aspectRatio, imageFile, imageType) => {
        this.saveImage(aspectRatio, imageFile, imageType)
        this.$nextTick((this.isLoadingImage = false))
        this.closeCropper()
      }
      if (this.file.type === 'image/jpeg') {
        const canvas = this.cropper.getCroppedCanvas()
        canvas.toBlob((blob) => {
          const imageAspectRatio = canvas.width / canvas.height
          if (imageAspectRatio < minAspectRatio) {
            this.aspectRatioError()
            return
          }
          const croppedImageFile = new File([blob], this.file.name, { type: this.file.type })
          onCropComplete(imageAspectRatio, croppedImageFile, 'image/jpeg')
        }, 'image/jpeg')
      } else {
        // TODO: use cropped file instead of original file
        const imageAspectRatio = this.file.width / this.file.height || 1.0
        onCropComplete(imageAspectRatio, this.file)
      }
    },
    closeCropper() {
      this.showCropper = false
      this.cropper.destroy()
    },
    aspectRatioError() {
      this.$toast.error(this.$t('contribution.teaserImage.errors.aspect-ratio-too-small'))
    },
    saveImage(aspectRatio = 1.0, file, fileType) {
      this.$emit('addImageAspectRatio', aspectRatio)
      this.$emit('addHeroImage', file)
      this.$emit('addImageType', fileType)
    },
    deleteImage() {
      this.$emit('addHeroImage', null)
      this.$emit('addImageAspectRatio', null)
      this.$emit('addImageType', null)
    },
  },
}
</script>
<style lang="scss">
.image-uploader {
  position: relative;
  min-height: $size-image-uploader-min-height;

  .image + & {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  &:only-child {
    background-color: $color-neutral-85;
  }

  &:disabled {
    pointer-events: none;
  }

  > .crop-overlay {
    width: 100%;
    height: 100%;
    min-height: $size-image-cropper-min-height;
    max-height: $size-image-cropper-max-height;
    font-size: $font-size-base;

    > .img {
      display: block;
      max-width: 100%;
    }

    > .crop-confirm {
      position: absolute !important;
      left: $space-x-small;
      top: $space-x-small;
      z-index: $z-index-surface;
    }

    > .crop-cancel {
      position: absolute !important;
      right: $space-x-small !important;
      top: $space-x-small !important;
      z-index: $z-index-surface;
    }
  }

  .delete-image-button {
    position: absolute !important;
    top: $space-small !important;
    right: $space-small !important;
    z-index: $z-index-surface;
    cursor: pointer;
  }

  .dz-message {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    z-index: $z-index-surface;
    cursor: pointer;

    &:hover {
      > .base-icon {
        opacity: $opacity-base;
      }
    }

    > .base-icon {
      position: absolute;
      padding: $space-small;
      border-radius: 100%;
      border: $border-size-base dashed $color-neutral-20;
      background-color: $color-neutral-95;
      font-size: $size-icon-large;
      opacity: $opacity-soft;
    }

    > .supported-formats {
      margin-top: 150px;
      font-weight: bold;
    }
  }
}
</style>

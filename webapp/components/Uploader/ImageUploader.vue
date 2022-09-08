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
      <base-button
        class="delete-image-button"
        icon="trash"
        circle
        danger
        filled
        data-test="delete-button"
        :title="$t('actions.delete')"
        @click.stop="deleteImage"
      />
    </div>
    <div v-show="!showCropper && imageCanBeCropped" class="crop-overlay">
      <base-button class="crop-confirm" filled @click="initCropper">
        {{ $t('contribution.teaserImage.cropImage') }}
      </base-button>
    </div>
    <div v-show="showCropper" class="crop-overlay">
      <img id="cropping-image" />
      <base-button class="crop-confirm" filled @click="cropImage">
        {{ $t('contribution.teaserImage.cropperConfirm') }}
      </base-button>
      <base-button
        class="crop-cancel"
        icon="close"
        size="small"
        circle
        danger
        filled
        @click="closeCropper"
      />
    </div>
  </div>
</template>

<script>
import VueDropzone from 'nuxt-dropzone'
import Cropper from 'cropperjs'
import LoadingSpinner from '~/components/_new/generic/LoadingSpinner/LoadingSpinner'
import 'cropperjs/dist/cropper.css'

const minAspectRatio = 0.3

export default {
  components: {
    LoadingSpinner,
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
      position: absolute;
      left: $space-x-small;
      top: $space-x-small;
      z-index: $z-index-surface;
    }

    > .crop-cancel {
      position: absolute;
      right: $space-x-small;
      top: $space-x-small;
      z-index: $z-index-surface;
    }
  }

  .delete-image-button {
    position: absolute;
    top: $space-small;
    right: $space-small;
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

    > .base-button {
      position: absolute;
      top: $space-small;
      right: $space-small;
      z-index: $z-index-surface;
    }

    > .supported-formats {
      margin-top: 150px;
      font-weight: bold;
    }
  }
}
</style>

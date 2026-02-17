<template>
  <dropdown class="content-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <os-button
          data-test="content-menu-button"
          variant="primary"
          appearance="outline"
          size="sm"
          circle
          :aria-label="$t('actions.menu')"
          @click.prevent="toggleMenu()"
        >
          <template #icon>
            <os-icon :icon="icons.ellipsisV" />
          </template>
        </os-button>
      </slot>
    </template>
    <template #popover="{ toggleMenu }">
      <div class="content-menu-popover">
        <ds-menu :routes="routes">
          <template #menuitem="item">
            <ds-menu-item
              :route="item.route"
              :parents="item.parents"
              @click.stop.prevent="openItem(item.route, toggleMenu)"
            >
              <os-icon :icon="item.route.icon" />
              {{ item.route.label }}
            </ds-menu-item>
          </template>
        </ds-menu>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'
import PinnedPostsMixin from '~/mixins/pinnedPosts'

export default {
  name: 'ContentMenu',
  components: {
    Dropdown,
    OsButton,
    OsIcon,
  },
  mixins: [PinnedPostsMixin],
  props: {
    placement: { type: String, default: 'top-end' },
    resource: { type: Object, required: true },
    isOwner: { type: Boolean, default: false },
    resourceType: {
      type: String,
      required: true,
      validator: (value) => {
        return value.match(/(contribution|comment|organization|user)/)
      },
    },
    modalsData: {
      type: Object,
      required: false,
      default: () => {
        return {}
      },
    },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    routes() {
      const routes = []

      if (this.resourceType === 'contribution') {
        if (this.isOwner) {
          routes.push({
            label: this.$t(`post.menu.edit`),
            name: 'post-edit-id',
            params: {
              id: this.resource.id,
            },
            icon: this.icons.edit,
          })
          routes.push({
            label: this.$t(`post.menu.delete`),
            callback: () => {
              this.openModal('confirm', 'delete')
            },
            icon: this.icons.trash,
          })
        }

        if (this.isAdmin && (!this.resource.group || this.resource.group.groupType === 'public')) {
          if (!this.resource.pinnedBy && this.canBePinned) {
            routes.push({
              label: this.$t(`post.menu.pin`),
              callback: () => {
                this.$emit('pinPost', this.resource)
              },
              icon: this.icons.link,
            })
          } else {
            if (this.resource.pinnedBy) {
              routes.push({
                label: this.$t(`post.menu.unpin`),
                callback: () => {
                  this.$emit('unpinPost', this.resource)
                },
                icon: this.icons.unlink,
              })
            }
          }
        }

        if (this.isAdmin) {
          routes.push({
            label: this.$t(`post.menu.push`),
            callback: () => {
              this.$emit('pushPost', this.resource)
            },
            icon: this.icons.link,
          })
        }

        if (this.isAdmin && this.resource.sortDate !== this.resource.createdAt) {
          routes.push({
            label: this.$t(`post.menu.unpush`),
            callback: () => {
              this.$emit('unpushPost', this.resource)
            },
            icon: this.icons.unlink,
          })
        }

        if (this.resource.isObservedByMe) {
          routes.push({
            label: this.$t(`post.menu.unobserve`),
            callback: () => {
              this.$emit('toggleObservePost', this.resource.id, false)
            },
            icon: this.icons.bellSlashed,
          })
        } else {
          routes.push({
            label: this.$t(`post.menu.observe`),
            callback: () => {
              this.$emit('toggleObservePost', this.resource.id, true)
            },
            icon: this.icons.bell,
          })
        }
      }

      if (this.isOwner && this.resourceType === 'comment') {
        routes.push({
          label: this.$t(`comment.menu.edit`),
          callback: () => {
            this.$emit('editComment')
          },
          icon: this.icons.edit,
        })
        routes.push({
          label: this.$t(`comment.menu.delete`),
          callback: () => {
            this.openModal('confirm', 'delete')
          },
          icon: this.icons.trash,
        })
      }

      if (!this.isOwner) {
        routes.push({
          label: this.$t(`report.${this.resourceType}.title`),
          callback: () => {
            this.openModal('report')
          },
          icon: this.icons.flag,
        })
      }

      if (!this.isOwner && this.isModerator) {
        if (!this.resource.disabled) {
          routes.push({
            label: this.$t(`disable.${this.resourceType}.title`),
            callback: () => {
              this.openModal('disable')
            },
            icon: this.icons.eyeSlash,
          })
        } else {
          routes.push({
            label: this.$t(`release.${this.resourceType}.title`),
            callback: () => {
              this.openModal('release')
            },
            icon: this.icons.eye,
          })
        }
      }

      if (this.resourceType === 'user') {
        if (this.isOwner) {
          routes.push({
            label: this.$t(`settings.name`),
            path: '/settings',
            icon: this.icons.edit,
          })
        } else {
          if (this.resource.isMuted) {
            routes.push({
              label: this.$t(`settings.muted-users.unmute`),
              callback: () => {
                this.$emit('unmute', this.resource)
              },
              icon: this.icons.microphone,
            })
          } else {
            routes.push({
              label: this.$t(`settings.muted-users.mute`),
              callback: () => {
                this.$emit('mute', this.resource)
              },
              icon: this.icons.microphoneSlash,
            })
          }
          if (this.resource.isBlocked) {
            routes.push({
              label: this.$t(`settings.blocked-users.unblock`),
              callback: () => {
                this.$emit('unblock', this.resource)
              },
              icon: this.icons.userPlus,
            })
          } else {
            routes.push({
              label: this.$t(`settings.blocked-users.block`),
              callback: () => {
                this.$emit('block', this.resource)
              },
              icon: this.icons.userTimes,
            })
          }
          if (this.isAdmin === true) {
            routes.push({
              label: this.$t(`settings.deleteUserAccount.name`),
              callback: () => {
                this.$emit('delete', this.resource)
              },
              icon: this.icons.trash,
            })
          }
        }
      }

      if (
        this.resourceType === 'contribution' &&
        this.resource.group &&
        ['admin', 'owner'].includes(this.resource.group.myRole) &&
        (this.canBeGroupPinned || this.resource.groupPinned)
      ) {
        routes.push({
          label: this.resource.groupPinned
            ? this.$t(`post.menu.groupUnpin`)
            : this.$t(`post.menu.groupPin`),
          callback: () => {
            this.$emit(this.resource.groupPinned ? 'unpinGroupPost' : 'pinGroupPost', this.resource)
          },
          icon: this.resource.groupPinned ? this.icons.unlink : this.icons.link,
        })
      }

      return routes
    },
    isModerator() {
      return this.$store.getters['auth/isModerator']
    },
    isAdmin() {
      return this.$store.getters['auth/isAdmin']
    },
    canBePinned() {
      return (
        this.maxPinnedPosts === 1 ||
        (this.maxPinnedPosts > 1 && this.currentlyPinnedPosts < this.maxPinnedPosts)
      )
    },
    canBeGroupPinned() {
      const maxGroupPinnedPosts = this.$env.MAX_GROUP_PINNED_POSTS
      return (
        maxGroupPinnedPosts === 1 ||
        (maxGroupPinnedPosts > 1 &&
          this.resource.group &&
          this.resource.group.currentlyPinnedPostsCount < maxGroupPinnedPosts)
      )
    },
  },
  methods: {
    openItem(route, toggleMenu) {
      if (route.callback) {
        route.callback()
      } else {
        this.$router.push(route)
      }
      toggleMenu()
    },
    openModal(dialog, modalDataName = null) {
      this.$store.commit('modal/SET_OPEN', {
        name: dialog,
        data: {
          type: this.resourceType,
          resource: this.resource,
          modalData: modalDataName ? this.modalsData[modalDataName] : {},
        },
      })
    },
  },
}
</script>

<style lang="scss">
.content-menu-popover {
  nav {
    margin-top: -$space-xx-small;
    margin-bottom: -$space-xx-small;
    margin-left: -$space-x-small;
    margin-right: -$space-x-small;
  }
}
</style>

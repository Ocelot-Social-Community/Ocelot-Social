<template>
  <div class="content-menu" @click.stop.prevent>
    <dropdown class="group-content-menu" :placement="placement" offset="5">
      <template #default="{ toggleMenu }">
        <slot name="button" :toggleMenu="toggleMenu">
          <os-button
            variant="primary"
            appearance="outline"
            size="sm"
            circle
            :aria-label="$t('group.contentMenu.menuButton')"
            data-test="group-menu-button"
            @click.prevent="toggleMenu()"
          >
            <template #icon>
              <os-icon :icon="icons.ellipsisV" />
            </template>
          </os-button>
        </slot>
      </template>
      <template #popover="{ toggleMenu }">
        <div class="group-menu-popover">
          <os-menu :routes="routes">
            <template #menuitem="item">
              <os-menu-item
                :route="item.route"
                :parents="item.parents"
                @click.stop.prevent="openItem(item.route, toggleMenu)"
              >
                <os-icon :icon="item.route.icon" />
                {{ item.route.label }}
              </os-menu-item>
            </template>
          </os-menu>
        </div>
      </template>
    </dropdown>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'

export default {
  name: 'GroupContentMenu',
  components: {
    Dropdown,
    OsButton,
    OsIcon,
    OsMenu,
    OsMenuItem,
  },
  props: {
    usage: {
      type: String,
      required: true,
      validator: (value) => {
        return value.match(/(groupTeaser|groupProfile)/)
      },
    },
    group: { type: Object, required: true },
    placement: { type: String, default: 'bottom-end' },
  },
  computed: {
    routes() {
      const routes = []

      if (this.usage !== 'groupProfile') {
        routes.push({
          label: this.$t('group.contentMenu.visitGroupPage'),
          icon: this.icons.home,
          path: `/groups/${this.group.id}`,
          params: { id: this.group.id, slug: this.group.slug },
        })
      }

      if (this.usage === 'groupProfile') {
        if (this.group.isMutedByMe) {
          routes.push({
            label: this.$t('group.contentMenu.unmuteGroup'),
            icon: this.icons.volumeUp,
            callback: () => {
              this.$emit('unmute', this.group.id)
            },
          })
        } else {
          routes.push({
            label: this.$t('group.contentMenu.muteGroup'),
            icon: this.icons.volumeOff,
            callback: () => {
              this.$emit('mute', this.group.id)
            },
          })
        }
      }

      if (this.group.myRole === 'owner') {
        routes.push({
          label: this.$t('admin.settings.name'),
          path: `/groups/edit/${this.group.id}`,
          icon: this.icons.edit,
        })
        routes.push({
          label: this.$t('group.contentMenu.inviteLinks'),
          path: `/groups/edit/${this.group.id}/invites`,
          icon: this.icons.link,
        })
      }

      return routes
    },
  },
  created() {
    this.icons = iconRegistry
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
  },
}
</script>

<style lang="scss">
.tooltip-inner.popover-inner .os-menu {
  margin: (-$space-xx-small) (-$space-small) !important;
}
</style>

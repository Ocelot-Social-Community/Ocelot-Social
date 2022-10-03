<template>
  <dropdown class="group-content-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <base-button
          icon="ellipsis-v"
          size="small"
          circle
          @click.prevent="toggleMenu()"
          data-test="group-menu-button"
        />
      </slot>
    </template>
    <template #popover="{ toggleMenu }">
      <div class="group-menu-popover">
        <ds-menu :routes="routes">
          <template #menuitem="item">
            {{ item.parents }}
            <ds-menu-item
              :route="item.route"
              :parents="item.parents"
              @click.stop.prevent="openItem(item.route, toggleMenu)"
            >
              <base-icon :name="item.route.icon" />
              {{ item.route.label }}
            </ds-menu-item>
          </template>
        </ds-menu>
      </div>
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'

export default {
  name: 'GroupContentMenu',
  components: {
    Dropdown,
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
          icon: 'home',
          name: 'group-id-slug',
          params: { id: this.group.id, slug: this.group.slug },
        })
      }
      if (this.isOwner) {
        routes.push({
          label: this.$t('admin.settings.name'),
          path: `/group/edit/${this.group.id}`,
          icon: 'edit',
        })
      }
      if (!this.isOwner) {
        routes.push({
          label: this.$t(`report.${this.resourceType}.title`),
          callback: () => {
            this.openModal('report')
          },
          icon: 'flag',
        })
      }

      return routes
    },
    isOwner() {
      return this.group.myRole === 'owner'
    },
    resourceType() {
      return 'group'
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
          resource: this.group,
          modalData: modalDataName ? this.modalsData[modalDataName] : {},
        },
      })
    },
  },
}
</script>

<style lang="scss">
.group-menu-popover {
  nav {
    margin-top: -$space-xx-small;
    margin-bottom: -$space-xx-small;
    margin-left: -$space-x-small;
    margin-right: -$space-x-small;
  }
}
</style>

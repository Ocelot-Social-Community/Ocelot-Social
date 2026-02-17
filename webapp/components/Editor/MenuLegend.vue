<template>
  <dropdown :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button">
        <os-button
          class="legend-question-button"
          variant="primary"
          appearance="ghost"
          circle
          size="sm"
          @click="toggleMenu"
        >
          <template #icon>
            <os-icon :icon="icons.questionCircle" />
          </template>
        </os-button>
      </slot>
    </template>
    <!-- eslint-disable-next-line vue/no-useless-template-attributes -->
    <template #popover="" class="legend">
      <div class="legend-container">
        <div class="legend-header">{{ $t(`editor.legend.legendTitle`) }}</div>
        <div
          :class="['legend-table', index < legendItems.length - 1 && 'legend-table-split-line']"
          v-for="(item, index) in legendItems"
          :key="item.name"
        >
          <div>
            <os-button size="sm" circle variant="primary" appearance="ghost" class="legend-icon">
              <template v-if="item.iconName" #icon>
                <os-icon :icon="item.iconName" />
              </template>
              <span v-if="item.label">{{ item.label }}</span>
            </os-button>
            <span>{{ $t(item.name) }}</span>
          </div>
          <span class="tool-shortcut">{{ item.shortcut }}</span>
        </div>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    Dropdown,
    OsButton,
    OsIcon,
  },
  props: {
    placement: { type: String, default: 'bottom-start' },
  },
  computed: {
    legendItems() {
      return [
        { iconName: this.icons.bold, name: `editor.legend.bold`, shortcut: 'ctrl + b' },
        { iconName: this.icons.italic, name: `editor.legend.italic`, shortcut: 'ctrl + i' },
        { iconName: this.icons.underline, name: `editor.legend.underline`, shortcut: 'ctrl + u' },
        { iconName: this.icons.link, name: `editor.legend.link`, shortcut: '' },
        { iconName: this.icons.paragraph, name: `editor.legend.paragraph`, shortcut: '' },
        { label: 'H3', name: `editor.legend.heading3`, shortcut: '### + space' },
        { label: 'H4', name: `editor.legend.heading4`, shortcut: '#### + space' },
        { iconName: this.icons.listUl, name: `editor.legend.unorderedList`, shortcut: '* + space' },
        { iconName: this.icons.listOl, name: `editor.legend.orderedList`, shortcut: '1. + space' },
        { iconName: this.icons.quoteRight, name: `editor.legend.quote`, shortcut: '> + space' },
        { iconName: this.icons.minus, name: `editor.legend.ruler`, shortcut: '---' },
      ]
    },
  },
  created() {
    this.icons = ocelotIcons
  },
}
</script>

<style lang="scss" scoped>
.legend-question-button {
  color: #70677e !important;
  font-size: 1.2rem !important;
}
.legend-question-button:hover {
  background: none !important;
  color: #70677e !important;
}
.legend-question-button:focus {
  outline: none !important;
}
.legend {
  padding: 0rem;
  border: 1px solid #e5e3e8;
}
.legend-container {
  display: flex;
  width: 18rem !important;
  flex-direction: column;
}
.legend-header {
  margin-bottom: 0.5em;
  text-align: center;
}

.legend-table {
  display: grid;
  align-items: center;
  grid-template-columns: 1fr 1fr;
  padding: 0.2em;
}
.legend-table-split-line {
  border-bottom: 0.5px solid grey;
}

.legend-table > div {
  display: flex;
  align-items: center;
}
.tool-shortcut {
  padding-left: 2rem;
}
.legend-icon {
  pointer-events: none;
  margin-right: 1rem;
}
</style>

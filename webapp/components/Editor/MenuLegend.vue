<template>
  <dropdown :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button">
        <os-button
          class="legend-question-button"
          appearance="ghost"
          circle
          size="sm"
          @click="toggleMenu"
        >
          <template #icon>
            <base-icon name="question-circle" />
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
                <base-icon :name="item.iconName" />
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
import { OsButton } from '@ocelot-social/ui'
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    Dropdown,
    OsButton,
  },
  props: {
    placement: { type: String, default: 'bottom-start' },
  },
  data() {
    return {
      legendItems: [
        { iconName: 'bold', name: `editor.legend.bold`, shortcut: 'ctrl + b' },
        { iconName: 'italic', name: `editor.legend.italic`, shortcut: 'ctrl + i' },
        { iconName: 'underline', name: `editor.legend.underline`, shortcut: 'ctrl + u' },
        { iconName: 'link', name: `editor.legend.link`, shortcut: '' },
        { iconName: 'paragraph', name: `editor.legend.paragraph`, shortcut: '' },
        { label: 'H3', name: `editor.legend.heading3`, shortcut: '### + space' },
        { label: 'H4', name: `editor.legend.heading4`, shortcut: '#### + space' },
        { iconName: 'list-ul', name: `editor.legend.unorderedList`, shortcut: '* + space' },
        { iconName: 'list-ol', name: `editor.legend.orderedList`, shortcut: '1. + space' },
        { iconName: 'quote-right', name: `editor.legend.quote`, shortcut: '> + space' },
        { iconName: 'minus', name: `editor.legend.ruler`, shortcut: '---' },
      ],
    }
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

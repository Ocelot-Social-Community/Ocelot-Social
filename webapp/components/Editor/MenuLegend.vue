<template>
  <dropdown class="content-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <base-button
          data-test="content-menu-button"
          icon="question-circle"
          size="small"
          circle
          ghost
          @click="toggleMenu()"
        />
      </slot>
    </template>
    <template #popover="" class="legend">
      <div class="legend-container">
        <div class="legend-header">Keyboard shortcuts and markdown code</div>
        <div class="legend-table" v-for="item in legenditems" :key="item.name">
          <base-button size="small" circle ghost :icon="item.iconname" class="legend-icon">
            <span v-if="item.label">{{ item.label }}</span>
          </base-button>
          <span>{{ item.name }}</span>
          <span class="tool-shortcut">{{ item.shortcut }}</span>
        </div>
      </div>
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    Dropdown,
  },
  props: {
    placement: { type: String, default: 'bottom-start' },
  },
  data() {
    return {
      hover: false,
      legenditems: [
        { iconname: 'bold', name: 'bold', shortcut: 'Ctrl+b' },
        { iconname: 'italic', name: 'italic', shortcut: 'Ctrl+i' },
        { iconname: 'underline', name: 'underline', shortcut: 'Ctrl+u' },
        { iconname: 'link', name: 'link', shortcut: '' },
        { iconname: 'paragraph', name: 'paragraph', shortcut: '' },
        { label: 'H3', name: 'heading 3', shortcut: '### + space' },
        { label: 'H4', name: 'heading 4', shortcut: '#### + space' },
        { iconname: 'list-ul', name: 'unordered list', shortcut: '* + space' },
        { iconname: 'list-ol', name: 'ordered list', shortcut: '1. + space' },
        { iconname: 'quote-right', name: 'quote', shortcut: '> + space' },
        { iconname: 'minus', name: 'ruler', shortcut: '---' },
      ],
    }
  },
}
</script>

<style lang="scss">
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
}
.legend-table {
  display: grid;
  align-items: center;
  grid-template-columns: 0.5fr 1fr 2fr;
  border-bottom: 0.5px solid grey;
  padding: 0.2em;
}
.tool-shortcut {
  padding-left: 2rem;
}
.legend-icon {
  pointer-events: none;
}
</style>

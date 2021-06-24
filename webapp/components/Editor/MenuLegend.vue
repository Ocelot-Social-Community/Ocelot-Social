<template>
  <dropdown class="content-menu" :placement="placement" offset="5">
    <template #default="{ openMenu, closeMenu }">
      <slot name="button">
        <base-button
          data-test="content-menu-button"
          icon="question-circle"
          size="small"
          circle
          ghost
          
          @mouseover.native="openMenu()"
          @mouseleave.native="closeMenu()"
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
          <span>{{ $t(item.name)}}</span>
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
      legenditems: [
        { iconname: 'bold', name: `editor.legend.bold`, shortcut: 'Ctrl+b' },
        { iconname: 'italic', name: `editor.legend.italic`, shortcut: 'Ctrl+i' },
        { iconname: 'underline', name:`editor.legend.underline`, shortcut: 'Ctrl+u' },
        { iconname: 'link', name:`editor.legend.link`, shortcut: '' },
        { iconname: 'paragraph', name:`editor.legend.paragraph`, shortcut: '' },
        { label: 'H3', name:`editor.legend.heading3`, shortcut: '### + space' },
        { label: 'H4', name:`editor.legend.heading4`, shortcut: '#### + space' },
        { iconname: 'list-ul', name:`editor.legend.unorderedList`, shortcut: '* + space' },
        { iconname: 'list-ol', name:`editor.legend.orderedList`, shortcut: '1. + space' },
        { iconname: 'quote-right', name:`editor.legend.quote`, shortcut: '> + space' },
        { iconname: 'minus', name:`editor.legend.ruler`, shortcut: '---' },
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

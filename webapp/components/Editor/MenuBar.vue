<template>
  <editor-menu-bar :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
    <div>
      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bold() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.bold')"
        @click="commands.bold"
      >
        <template #icon>
          <os-icon :icon="icons.bold" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.italic() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.italic')"
        @click="commands.italic"
      >
        <template #icon>
          <os-icon :icon="icons.italic" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.underline() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.underline')"
        @click="commands.underline"
      >
        <template #icon>
          <os-icon :icon="icons.underline" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.link() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.link')"
        @click="(event) => toggleLinkInput(getMarkAttrs('link'), event.target.closest('button'))"
      >
        <template #icon>
          <os-icon :icon="icons.link" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.paragraph() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.paragraph')"
        @click="commands.paragraph"
      >
        <template #icon>
          <os-icon :icon="icons.paragraph" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 3 }) ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.heading3')"
        @click="() => commands.heading({ level: 3 })"
      >
        H3
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 4 }) ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.heading4')"
        @click="() => commands.heading({ level: 4 })"
      >
        H4
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bullet_list() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.unorderedList')"
        @click="commands.bullet_list"
      >
        <template #icon>
          <os-icon :icon="icons.listUl" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.ordered_list() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.orderedList')"
        @click="commands.ordered_list"
      >
        <template #icon>
          <os-icon :icon="icons.listOl" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.blockquote() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.quote')"
        @click="commands.blockquote"
      >
        <template #icon>
          <os-icon :icon="icons.quoteRight" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.horizontal_rule() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.ruler')"
        @click="commands.horizontal_rule"
      >
        <template #icon>
          <os-icon :icon="icons.minus" />
        </template>
      </os-button>

      <menu-legend class="legend-button" />
    </div>
  </editor-menu-bar>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import { EditorMenuBar } from 'tiptap'
import MenuLegend from './MenuLegend.vue'

export default {
  components: {
    EditorMenuBar,
    MenuLegend,
    OsButton,
    OsIcon,
  },
  props: {
    editor: { type: Object, required: true },
    toggleLinkInput: { type: Function, required: true },
  },
  created() {
    this.icons = ocelotIcons
  },
}
</script>

<style lang="scss">
.legend-button {
  display: inline;
  position: relative;
}
</style>

<template>
  <editor-menu-bar :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
    <div>
      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bold() ? 'outline' : 'ghost'"
        @click="commands.bold"
      >
        <template #icon>
          <base-icon name="bold" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.italic() ? 'outline' : 'ghost'"
        @click="commands.italic"
      >
        <template #icon>
          <base-icon name="italic" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.underline() ? 'outline' : 'ghost'"
        @click="commands.underline"
      >
        <template #icon>
          <base-icon name="underline" />
        </template>
      </os-button>

      <os-button
        ref="linkButton"
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.link() ? 'outline' : 'ghost'"
        @click="(event) => toggleLinkInput(getMarkAttrs('link'), event.currentTarget)"
      >
        <template #icon>
          <base-icon name="link" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.paragraph() ? 'outline' : 'ghost'"
        @click="commands.paragraph"
      >
        <template #icon>
          <base-icon name="paragraph" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 3 }) ? 'outline' : 'ghost'"
        @click="() => commands.heading({ level: 3 })"
      >
        H3
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 4 }) ? 'outline' : 'ghost'"
        @click="() => commands.heading({ level: 4 })"
      >
        H4
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bullet_list() ? 'outline' : 'ghost'"
        @click="commands.bullet_list"
      >
        <template #icon>
          <base-icon name="list-ul" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.ordered_list() ? 'outline' : 'ghost'"
        @click="commands.ordered_list"
      >
        <template #icon>
          <base-icon name="list-ol" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.blockquote() ? 'outline' : 'ghost'"
        @click="commands.blockquote"
      >
        <template #icon>
          <base-icon name="quote-right" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.horizontal_rule() ? 'outline' : 'ghost'"
        @click="commands.horizontal_rule"
      >
        <template #icon>
          <base-icon name="minus" />
        </template>
      </os-button>

      <menu-legend class="legend-button" />
    </div>
  </editor-menu-bar>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { EditorMenuBar } from 'tiptap'
import MenuLegend from './MenuLegend.vue'

export default {
  components: {
    OsButton,
    EditorMenuBar,
    MenuLegend,
  },
  props: {
    editor: Object,
    toggleLinkInput: Function,
  },
}
</script>

<style lang="scss">
.legend-button {
  display: inline;
  position: relative;
}
</style>

<template>
  <editor-menu-bar :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
    <div>
      <menu-bar-button :isActive="isActive.bold()" :onClick="commands.bold" icon="bold" />

      <menu-bar-button :isActive="isActive.italic()" :onClick="commands.italic" icon="italic" />

      <menu-bar-button
        :isActive="isActive.underline()"
        :onClick="commands.underline"
        icon="underline"
      />

      <menu-bar-button
        ref="linkButton"
        :isActive="isActive.link()"
        :onClick="(event) => toggleLinkInput(getMarkAttrs('link'), event.currentTarget)"
        icon="link"
      />

      <menu-bar-button
        :isActive="isActive.paragraph()"
        :onClick="commands.paragraph"
        icon="paragraph"
      />

      <menu-bar-button
        :isActive="isActive.heading({ level: 3 })"
        :onClick="() => commands.heading({ level: 3 })"
        label="H3"
      />

      <menu-bar-button
        :isActive="isActive.heading({ level: 4 })"
        :onClick="() => commands.heading({ level: 4 })"
        label="H4"
      />

      <menu-bar-button
        :isActive="isActive.bullet_list()"
        :onClick="commands.bullet_list"
        icon="list-ul"
      />

      <menu-bar-button
        :isActive="isActive.ordered_list()"
        :onClick="commands.ordered_list"
        icon="list-ol"
      />

      <menu-bar-button
        :isActive="isActive.blockquote()"
        :onClick="commands.blockquote"
        icon="quote-right"
      />

      <menu-bar-button
        :isActive="isActive.horizontal_rule()"
        :onClick="commands.horizontal_rule"
        icon="minus"
      />

      <menu-bar-button
        @mouseover="hover = true"
        @mouseleave="hover = false"
        :isActive="isActive.horizontal_rule()"
        :onClick="commands.horizontal_rule"
        icon="question-circle"
        class="legend-button"
      />

      <menu-legend>
      </menu-legend>

    </div>
  </editor-menu-bar>
</template>

<script>
import { EditorMenuBar } from 'tiptap'
import MenuBarButton from './MenuBarButton'
import MenuLegend from './MenuLegend.vue'

export default {
  data() {
    return {
      hover: false
    }
  },
  components: {
    EditorMenuBar,
    MenuBarButton,
    MenuLegend,
    
  },
  props: {
    editor: Object,
    toggleLinkInput: Function,
  },
}
</script>

<style lang="scss">
  .legend-button{
    color: #70677e;
    position:relative;

    .base-icon {
      font-size: 1.2rem;
    }
  }
</style>
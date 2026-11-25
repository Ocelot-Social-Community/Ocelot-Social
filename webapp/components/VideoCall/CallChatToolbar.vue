<template>
  <!--
    What can be done with the conference chat, in a toolbar below the tabs, built like the
    participant list's: slim, its controls at the same right edge as the close button above
    them. The tab row then only holds tabs (#11075).
  -->
  <div class="call-chat-toolbar" data-test="call-chat-toolbar">
    <!-- Where the participant list has its filter: a symbol, its name in the tooltip. -->
    <os-button
      v-tooltip="$t('chat.exportChat')"
      data-test="call-chat-export"
      variant="primary"
      appearance="ghost"
      circle
      size="sm"
      :loading="exporting"
      :aria-label="$t('chat.exportChat')"
      @click="$emit('export')"
    >
      <template #icon>
        <os-icon :icon="icons.download" />
      </template>
    </os-button>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

// How high the toolbar is, in px, border included: its small button (26) with a sliver above and
// below (2 each), and its line (1). A host that tells its chat how much room is taken above it
// counts this in.
export const CALL_CHAT_TOOLBAR_HEIGHT = 31

export default {
  name: 'CallChatToolbar',
  components: { OsButton, OsIcon },
  props: {
    // Whether a download asked for is still under way.
    exporting: { type: Boolean, default: false },
  },
  emits: ['export'],
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style scoped>
.call-chat-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-x-small);
  box-sizing: border-box;
  /*  As the participant list's toolbar: no more room above and below than the button needs; on
      the right as far from the edge as the close button above. Fixed, as a host may tell its
      chat how much room it takes (CALL_CHAT_TOOLBAR_HEIGHT). */
  height: 31px;
  padding: 2px var(--space-small) 2px var(--space-x-small);
  border-bottom: 1px solid var(--border-color-softer);
  background: var(--background-color-base);
}
</style>

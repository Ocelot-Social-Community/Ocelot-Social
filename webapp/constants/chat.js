// vue-advanced-chat's light theme with every value on a token — the dark theme comes from the same
// tokens (theme-dark.css), so the library's own dark palette is not used.
const STYLE = {
  general: {
    color: 'var(--text-color-base)',
    colorButtonClear: 'var(--chat-accent)',
    colorButton: 'var(--chat-accent-contrast)',
    backgroundColorButton: 'var(--chat-accent)',
    backgroundInput: 'var(--background-color-base)',
    colorPlaceholder: 'var(--text-color-soft)',
    colorCaret: 'var(--chat-accent)',
    colorSpinner: 'var(--color-primary)',
    borderStyle: '1px solid var(--chat-border-color)',
    backgroundScrollIcon: 'var(--background-color-base)',
  },

  container: {
    border: 'none',
    borderRadius: '0',
    boxShadow: 'none',
  },

  header: {
    background: 'var(--background-color-soft)',
    colorRoomName: 'var(--text-color-base)',
    colorRoomInfo: 'var(--text-color-soft)',
  },

  footer: {
    background: 'var(--background-color-soft)',
    borderStyleInput: '1px solid var(--chat-border-color)',
    borderInputSelected: 'var(--chat-accent)',
    backgroundReply: 'var(--background-color-soft)',
    backgroundTagActive: 'var(--background-color-soft)',
    backgroundTag: 'var(--background-color-base)',
  },

  content: {
    background: 'var(--background-color-base)',
  },

  sidemenu: {
    background: 'var(--chat-sidemenu-bg)',
    backgroundHover: 'var(--chat-sidemenu-background-over)',
    backgroundActive: 'var(--chat-sidemenu-background-active)',
    colorActive: 'var(--chat-accent)',
    borderColorSearch: 'var(--chat-search-border-color)',
  },

  dropdown: {
    background: 'var(--background-color-base)',
    backgroundHover: 'var(--chat-hover-background)',
  },

  message: {
    background: 'var(--chat-message-bg-others)',
    backgroundMe: 'var(--chat-message-bg-me)',
    color: 'var(--text-color-base)',
    colorStarted: 'var(--chat-text-muted)',
    backgroundDeleted: 'var(--chat-deleted-background)',
    backgroundSelected: 'var(--chat-selected-background)',
    colorDeleted: 'var(--chat-text-subtle)',
    colorUsername: 'var(--chat-text-muted)',
    colorTimestamp: 'var(--text-color-soft)',
    backgroundDate: 'var(--chat-notice-background)',
    colorDate: 'var(--chat-notice-color)',
    backgroundSystem: 'var(--chat-notice-background)',
    colorSystem: 'var(--chat-notice-color)',
    backgroundMedia: 'var(--chat-shade-strong)',
    backgroundReply: 'var(--chat-shade)',
    colorReplyUsername: 'var(--chat-text-strong)',
    colorReply: 'var(--chat-reply-color)',
    colorTag: 'var(--chat-tag-color)',
    backgroundImage: 'var(--chat-image-background)',
    colorNewMessages: 'var(--chat-new-message-color)',
    backgroundScrollCounter: 'var(--color-danger)',
    colorScrollCounter: 'var(--text-color-inverse)',
    backgroundReaction: 'var(--chat-reaction-background)',
    borderStyleReaction: '1px solid var(--chat-reaction-background)',
    backgroundReactionHover: 'var(--background-color-base)',
    borderStyleReactionHover: '1px solid var(--chat-reaction-border-hover)',
    colorReactionCounter: 'var(--chat-text-strong)',
    backgroundReactionMe: 'var(--chat-reaction-me-background)',
    borderStyleReactionMe: '1px solid var(--chat-reaction-me-border)',
    backgroundReactionHoverMe: 'var(--chat-reaction-me-background)',
    borderStyleReactionHoverMe: '1px solid var(--chat-reaction-me-border)',
    colorReactionCounterMe: 'var(--chat-reaction-me-color)',
    backgroundAudioRecord: 'var(--chat-record-color)',
    backgroundAudioLine: 'var(--chat-shade-strong)',
    backgroundAudioProgress: 'var(--chat-audio-color)',
    backgroundAudioProgressSelector: 'var(--chat-audio-color)',
    colorFileExtension: 'var(--chat-text-subtle)',
  },

  markdown: {
    background: 'var(--chat-code-background)',
    border: 'var(--chat-code-border)',
    color: 'var(--chat-code-color)',
    colorMulti: 'var(--chat-text-strong)',
  },

  room: {
    colorUsername: 'var(--chat-text-strong)',
    colorMessage: 'var(--chat-room-message-color)',
    colorTimestamp: 'var(--chat-room-timestamp-color)',
    colorStateOnline: 'var(--chat-online-color)',
    colorStateOffline: 'var(--chat-text-muted)',
    backgroundCounterBadge: 'var(--color-danger)',
    colorCounterBadge: 'var(--text-color-inverse)',
  },

  emoji: {
    background: 'var(--background-color-base)',
  },

  icons: {
    search: 'var(--chat-text-muted)',
    add: 'var(--color-primary)',
    toggle: 'var(--color-neutral-30)',
    menu: 'var(--color-neutral-30)',
    close: 'var(--chat-text-muted)',
    closeImage: 'var(--chat-on-media-color)',
    file: 'var(--color-primary)',
    paperclip: 'var(--color-primary)',
    closeOutline: 'var(--chat-icon-strong)',
    closePreview: 'var(--chat-on-media-color)',
    send: 'var(--color-primary)',
    sendDisabled: 'var(--chat-text-muted)',
    emoji: 'var(--color-primary)',
    emojiReaction: 'var(--chat-icon-faint)',
    document: 'var(--color-primary)',
    pencil: 'var(--chat-icon-soft)',
    checkmark: 'var(--text-color-soft)',
    checkmarkSeen: 'var(--text-color-secondary)',
    eye: 'var(--chat-on-media-color)',
    dropdownMessage: 'var(--chat-on-media-color)',
    dropdownMessageBackground: 'var(--chat-icon-backdrop)',
    dropdownRoom: 'var(--chat-icon-soft)',
    dropdownScroll: 'var(--chat-text-strong)',
    microphone: 'var(--color-primary)',
    audioPlay: 'var(--chat-audio-color)',
    audioPause: 'var(--chat-audio-color)',
    audioCancel: 'var(--chat-record-color)',
    audioConfirm: 'var(--chat-confirm-color)',
  },
}

export default {
  STYLE,
}

import tokens from './chatTokens.js'

const styleData = tokens

// vue-advanced-chat's light theme with every value on a token — the dark theme comes from the same
// tokens (theme-dark.css), so the library's own dark palette is not used.
const STYLE = {
  general: {
    color: styleData.textColorBase,
    colorButtonClear: 'var(--chat-accent)',
    colorButton: 'var(--chat-accent-contrast)',
    backgroundColorButton: 'var(--chat-accent)',
    backgroundInput: styleData.backgroundColorBase,
    colorPlaceholder: styleData.textColorSoft,
    colorCaret: 'var(--chat-accent)',
    colorSpinner: styleData.colorPrimary,
    borderStyle: '1px solid var(--chat-border-color)',
    backgroundScrollIcon: styleData.backgroundColorBase,
  },

  container: {
    border: 'none',
    borderRadius: '0',
    boxShadow: 'none',
  },

  header: {
    background: styleData.backgroundColorSoft,
    colorRoomName: styleData.textColorBase,
    colorRoomInfo: styleData.textColorSoft,
  },

  footer: {
    background: styleData.backgroundColorSoft,
    borderStyleInput: '1px solid var(--chat-border-color)',
    borderInputSelected: 'var(--chat-accent)',
    backgroundReply: styleData.backgroundColorSoft,
    backgroundTagActive: styleData.backgroundColorSoft,
    backgroundTag: styleData.backgroundColorBase,
  },

  content: {
    background: styleData.backgroundColorBase,
  },

  sidemenu: {
    background: styleData.chatSidemenuBg,
    backgroundHover: styleData.chatSidemenuBackgroundOver,
    backgroundActive: styleData.chatSidemenuBackgroundActive,
    colorActive: 'var(--chat-accent)',
    borderColorSearch: 'var(--chat-search-border-color)',
  },

  dropdown: {
    background: styleData.backgroundColorBase,
    backgroundHover: 'var(--chat-hover-background)',
  },

  message: {
    background: styleData.chatMessageBgOthers,
    backgroundMe: styleData.chatMessageBgMe,
    color: styleData.chatMessageColor,
    colorStarted: 'var(--chat-text-muted)',
    backgroundDeleted: 'var(--chat-deleted-background)',
    backgroundSelected: 'var(--chat-selected-background)',
    colorDeleted: 'var(--chat-text-subtle)',
    colorUsername: 'var(--chat-text-muted)',
    colorTimestamp: styleData.chatMessageTimestamp,
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
    colorNewMessages: styleData.chatNewMessageColor,
    backgroundScrollCounter: styleData.chatRoomBackgroundCounterBadge,
    colorScrollCounter: styleData.chatRoomColorCounterBadge,
    backgroundReaction: 'var(--chat-reaction-background)',
    borderStyleReaction: '1px solid var(--chat-reaction-background)',
    backgroundReactionHover: styleData.backgroundColorBase,
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
    backgroundCounterBadge: styleData.chatRoomBackgroundCounterBadge,
    colorCounterBadge: styleData.chatRoomColorCounterBadge,
  },

  emoji: {
    background: styleData.backgroundColorBase,
  },

  icons: {
    search: 'var(--chat-text-muted)',
    add: styleData.chatIconAdd,
    toggle: styleData.colorNeutral30,
    menu: styleData.colorNeutral30,
    close: 'var(--chat-text-muted)',
    closeImage: 'var(--chat-on-media-color)',
    file: styleData.colorPrimary,
    paperclip: styleData.colorPrimary,
    closeOutline: 'var(--chat-icon-strong)',
    closePreview: 'var(--chat-on-media-color)',
    send: styleData.chatIconSend,
    sendDisabled: 'var(--chat-text-muted)',
    emoji: styleData.chatIconEmoji,
    emojiReaction: 'var(--chat-icon-faint)',
    document: styleData.colorPrimary,
    pencil: 'var(--chat-icon-soft)',
    checkmark: styleData.chatMessageCheckmark,
    checkmarkSeen: styleData.chatMessageCheckmarkSeen,
    eye: 'var(--chat-on-media-color)',
    dropdownMessage: 'var(--chat-on-media-color)',
    dropdownMessageBackground: 'var(--chat-icon-backdrop)',
    dropdownRoom: 'var(--chat-icon-soft)',
    dropdownScroll: 'var(--chat-text-strong)',
    microphone: styleData.colorPrimary,
    audioPlay: 'var(--chat-audio-color)',
    audioPause: 'var(--chat-audio-color)',
    audioCancel: 'var(--chat-record-color)',
    audioConfirm: 'var(--chat-confirm-color)',
  },
}

export default {
  STYLE,
}

/**
 * Design token values handed to vue-advanced-chat (see constants/chat.js).
 *
 * This used to come out of a `:export` block in the old SCSS token file, which meant
 * importing a stylesheet from JavaScript just to read a handful of values. Since the tokens became
 * CSS custom properties, the "values" ARE these var() strings — the chat sets them as CSS values and
 * the browser resolves them at runtime, so a brand switch re-themes the chat without a rebuild.
 *
 * Keep in sync with assets/css/root-tokens.css when adding a token here.
 */
export default {
  colorPrimary: 'var(--color-primary)',
  colorPrimaryActive: 'var(--color-primary-highlight)',
  colorPrimaryLight: 'var(--color-primary-light)',
  borderColorSoft: 'var(--border-color-soft)',
  borderRadiusBase: 'var(--border-radius-base)',
  textColorBase: 'var(--text-color-base)',
  textColorSoft: 'var(--text-color-soft)',
  textColorInverse: 'var(--text-color-inverse)',
  boxShadowBase: 'var(--box-shadow-base)',
  backgroundColorBase: 'var(--background-color-base)',
  backgroundColorSoft: 'var(--background-color-soft)',
  backgroundColorSoftest: 'var(--background-color-softest)',
  backgroundColorPrimary: 'var(--background-color-primary)',
  colorNeutral30: 'var(--color-neutral-30)',
  chatSidemenuBg: 'var(--chat-sidemenu-bg)',
  chatSidemenuBackgroundOver: 'var(--chat-sidemenu-background-over)',
  chatSidemenuBackgroundActive: 'var(--chat-sidemenu-background-active)',
  chatMessageColor: 'var(--chat-message-color)',
  chatMessageBgMe: 'var(--chat-message-bg-me)',
  chatMessageBgOthers: 'var(--chat-message-bg-others)',
  chatNewMessageColor: 'var(--chat-new-message-color)',
  chatMessageTimestamp: 'var(--chat-message-timestamp)',
  chatMessageCheckmarkSeen: 'var(--chat-message-checkmark-seen)',
  chatMessageCheckmark: 'var(--chat-message-checkmark)',
  chatRoomBackgroundCounterBadge: 'var(--chat-room-background-counter-badge)',
  chatRoomColorCounterBadge: 'var(--chat-room-color-counter-badge)',
  chatIconAdd: 'var(--chat-icon-add)',
  chatIconSend: 'var(--chat-icon-send)',
  chatIconEmoji: 'var(--chat-icon-emoji)',
}

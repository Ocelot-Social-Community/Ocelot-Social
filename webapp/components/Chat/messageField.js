// vue-advanced-chat tells of its message field the text alone (`typing-message`), and takes
// nothing from outside but the text (`room-message`). What else is in the field — the files
// attached, the people picked to mention — stays inside its RoomFooter component. A draft keeps
// all of it, so it is read and put back here, on the footer's own state.
//
// The library is a Vue 3 custom element: its host element carries the Vue instance
// (`_instance`), and the footer is found below it by its component name. That is the library's
// inside, not its interface, and an update of the library may move it. Whatever is not found
// answers null; drafts then keep their text alone, as far as the interface reaches.

const FOOTER = 'RoomFooter'

const footerIn = (vnode) => {
  if (!vnode || typeof vnode !== 'object') return null
  const { component } = vnode
  if (component) {
    return component.type?.name === FOOTER ? component : footerIn(component.subTree)
  }
  if (!Array.isArray(vnode.children)) return null
  for (const child of vnode.children) {
    const found = footerIn(child)
    if (found) return found
  }
  return null
}

/**
 * The message field of the chat whose host element is given, or null.
 *
 * `roomId` is the room it shows; `files` the files attached, as the library keeps them (`blob`
 * once loaded, `localUrl` for the preview); `mentioned` the people picked from the list after
 * an "@", whose "@Name" the library turns into a tag when sending. `watch` is Vue 3's `$watch`
 * on the footer.
 */
export const findMessageField = (host) => {
  const footer = footerIn(host?._instance?.subTree)
  if (!footer?.proxy || footer.isUnmounted) return null
  return {
    get isUnmounted() {
      return footer.isUnmounted
    },
    get roomId() {
      return footer.props.roomId
    },
    get files() {
      return footer.proxy.files
    },
    set files(files) {
      footer.proxy.files = files
    },
    get mentioned() {
      return footer.proxy.selectedUsersTag
    },
    set mentioned(users) {
      footer.proxy.selectedUsersTag = users
    },
    watch: (source, callback, options) => footer.proxy.$watch(source, callback, options),
  }
}

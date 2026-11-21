// vue-advanced-chat keeps some of what it shows to itself, past its interface: the count on its
// button to the newest message, for one. It is a Vue 3 custom element, its host element carries
// the Vue instance (`_instance`), and its components are found below it by their names. That is
// the library's inside, and an update of the library may move it: whatever is not found answers
// null, and what depends on it is left out. libraryComponent.library.spec.js holds this against
// the library as installed.

const componentIn = (vnode, name) => {
  if (!vnode || typeof vnode !== 'object') return null
  const { component } = vnode
  if (component) {
    return component.type?.name === name ? component : componentIn(component.subTree, name)
  }
  if (!Array.isArray(vnode.children)) return null
  for (const child of vnode.children) {
    const found = componentIn(child, name)
    if (found) return found
  }
  return null
}

/** The first component of that name below the chat's host element, mounted, or null. */
export const findLibraryComponent = (host, name) => {
  const component = componentIn(host?._instance?.subTree, name)
  return component?.proxy && !component.isUnmounted ? component : null
}

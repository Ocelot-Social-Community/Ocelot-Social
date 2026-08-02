// Injects `$authCookie` — the runtime-resolved auth cookie accessor (see utils/authCookie.js).
// Store actions run after every plugin, so `this.app.$authCookie` is always there for them; the
// apollo client config cannot use the injection (it is built by a MODULE plugin, before this one)
// and calls createAuthCookie(ctx) itself.
import { createAuthCookie } from '~/utils/authCookie'

export default (context, inject) => {
  inject('authCookie', createAuthCookie(context))
}

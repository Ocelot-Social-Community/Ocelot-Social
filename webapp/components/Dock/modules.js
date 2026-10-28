// The modules the dock can show, and where. A module appears in the dock of its `side` on the
// pages whose route name is in `routes` ('*' = every page), and only while `enabled` says so.
// A module that does not match is not mounted at all — no query, no subscription.
//
// Hard-wired on purpose (docu/dock-konzept.md, E1): one module does not justify a
// configuration layer. The shape leaves room for an instance override later.
//
// `icon` (a key of the icon registry) stands for the module on the flag, and `label` (an i18n
// key, given `count`) says in its tooltip what is counted — one can tell what the dock holds
// before opening it.
//
// A module emits `count` with the number of entries it shows; a dock whose modules show
// nothing takes no room, and on narrow screens shows no flag.
export default [
  {
    id: 'activeVideoCalls',
    side: 'right',
    icon: 'videoCamera',
    label: 'dock.activeVideoCalls.flag',
    component: () => import('./modules/ActiveVideoCalls/ActiveVideoCalls.vue'),
    routes: ['index'],
    enabled: ({ store }) => store.getters['videoCall/enabled'],
  },
]

export const modulesFor = (modules, { side, routeName, store }) =>
  modules.filter(
    (module) =>
      module.side === side &&
      (module.routes.includes('*') || module.routes.includes(routeName)) &&
      module.enabled({ store }),
  )

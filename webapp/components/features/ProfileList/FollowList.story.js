import { storiesOf } from '@storybook/vue'
// import { action } from '@storybook/addon-actions'

import helpers from '~/storybook/helpers'
// import FollowList from './FollowList.vue'

// import fuzzyFilterUser from './FollowList.story.json'

helpers.init()

// Kept as reference/examples — FollowList.vue was refactored to self-fetch via `userId` + $apollo
// instead of taking the connections as a `user` prop, so these fixtures are stale. Rendering the
// real component (with any props) currently hangs the browser tab in Storybook, cause not yet
// found. Restore once that's understood and the fixtures are updated to the current prop API.
//
// const user = {
//   name: 'Jenny Rostock',
//   id: 'u3',
//   followedByCount: 12,
//   followedBy: helpers.fakeUser(7),
//   followingCount: 28,
//   following: helpers.fakeUser(7),
// }
//
// const lessThanSevenUser = {
//   ...user,
//   followedByCount: 3,
//   followedBy: user.followedBy.slice(0, 3),
//   followingCount: 3,
//   following: user.following.slice(0, 3),
// }
//
// const allConnectionsUser = {
//   ...user,
//   followedBy: [...user.followedBy, ...helpers.fakeUser(5)],
//   following: [...user.following, ...helpers.fakeUser(21)],
// }
//
// const noConnectionsUser = {
//   ...user,
//   followedBy: [],
//   followedByCount: 0,
//   following: [],
//   followingCount: 0,
// }
//
// storiesOf('FollowList', module)
//   .addDecorator(helpers.layout)
//   .add('without connections', () => {
//     return {
//       components: { FollowList },
//       store: helpers.store,
//       data() {
//         return { user: noConnectionsUser }
//       },
//       template: '<follow-list :user="user" type="following" />',
//     }
//   })
//   .add('with all connections loaded', () => {
//     return {
//       components: { FollowList },
//       store: helpers.store,
//       data() {
//         return { user: lessThanSevenUser }
//       },
//
//       template: '<follow-list :user="user"/>',
//     }
//   })
//
//   .add('with more connections loadable', () => {
//     return {
//       components: { FollowList },
//       store: helpers.store,
//       data() {
//         return { user: { ...user } }
//       },
//       methods: {
//         fetchAllConnections(type) {
//           this.user[type] = allConnectionsUser[type]
//           action('fetchAllConnections')(type, this.user)
//         },
//       },
//       template: '<follow-list :user="user" @fetchAllConnections="fetchAllConnections"/>',
//     }
//   })
//   .add('with 1000 connections loaded', () => {
//     return {
//       components: { FollowList },
//       store: helpers.store,
//       data() {
//         return {
//           user: {
//             ...user,
//             followedByCount: 1000,
//             followingCount: 1000,
//             followedBy: helpers.fakeUser(1000),
//             following: helpers.fakeUser(1000),
//           },
//         }
//       },
//       template: '<follow-list :user="user" />',
//     }
//   })
//   .add('Fuzzy Filter', () => {
//     return {
//       components: { FollowList },
//       store: helpers.store,
//       data() {
//         return { user: fuzzyFilterUser }
//       },
//       template: '<follow-list :user="user" />',
//     }
//   })

// Placeholder only — rendering the real FollowList.vue (with any props) currently hangs the
// browser tab in Storybook, cause not yet found. This stub is here just so the story doesn't
// silently disappear and we remember to come back to it.
storiesOf('FollowList', module)
  .addDecorator(helpers.layout)
  .add('TODO: fix hang, see commented-out stories above', () => {
    return {
      store: helpers.store,
      template:
        '<p>FollowList rendering currently hangs the browser tab — needs investigation.</p>',
    }
  })

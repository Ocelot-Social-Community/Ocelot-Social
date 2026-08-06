import { storiesOf } from '@storybook/vue'
import helpers from '~/storybook/helpers'
import FollowList from './FollowList.vue'

helpers.init()

// FollowList.vue self-fetches via `userId` + $apollo (see storybook/helpers.js's FollowConnections
// handler) rather than taking the connections as a prop, so each story variant below registers its
// own fake connections under a dedicated userId before the component ever mounts.
helpers.followListConnections['follow-empty'] = []
helpers.followListConnections['follow-small'] = helpers.fakeUser(5)
helpers.followListConnections['follow-many'] = helpers.fakeUser(60)

// On profile pages, FollowList sits in the narrow sidebar column (~1 part vs. the main column's ~3),
// not full-width — wrapping it here at a similar width keeps the story representative of that.
storiesOf('FollowList', module)
  .addDecorator(helpers.layout)
  .add('without connections', () => ({
    components: { FollowList },
    store: helpers.store,
    template:
      '<div style="max-width: 320px"><follow-list user-id="follow-empty" user-name="Jenny Rostock" type="following" /></div>',
  }))
  .add('with connections', () => ({
    components: { FollowList },
    store: helpers.store,
    template:
      '<div style="max-width: 320px"><follow-list user-id="follow-small" user-name="Jenny Rostock" type="following" /></div>',
  }))
  .add('with many connections (paginated, filterable)', () => ({
    components: { FollowList },
    store: helpers.store,
    template:
      '<div style="max-width: 320px"><follow-list user-id="follow-many" user-name="Jenny Rostock" type="following" /></div>',
  }))

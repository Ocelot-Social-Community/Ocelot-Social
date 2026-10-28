<template>
  <section v-if="sortedCalls.length" class="active-video-calls" data-test="active-video-calls">
    <h2 class="active-video-calls__title">{{ $t('dock.activeVideoCalls.title') }}</h2>
    <ul class="active-video-calls__list" data-dock-align>
      <li v-for="call in sortedCalls" :key="call.group.id">
        <active-video-call-card :call="call" :joined="call.group.id === ownCallGroupId" />
      </li>
    </ul>
  </section>
</template>

<script>
import { mapGetters } from 'vuex'
import { activeVideoCallsQuery, activeVideoCallChangedSubscription } from '~/graphql/VideoCalls'
import ActiveVideoCallCard from './ActiveVideoCallCard'

// The running calls the viewer may join (docu/dock-konzept.md, §5). Loaded once, then kept
// up to date by the subscription, which pushes each start, change and end with the call's
// current state — no refetch needed.
export default {
  name: 'ActiveVideoCalls',
  components: { ActiveVideoCallCard },
  data() {
    return {
      activeVideoCalls: [],
    }
  },
  computed: {
    ...mapGetters({
      showVideoCall: 'videoCall/showVideoCall',
      videoCallGroupId: 'videoCall/groupId',
    }),
    ownCallGroupId() {
      return this.showVideoCall ? this.videoCallGroupId : null
    },
    sortedCalls() {
      // The viewer's own call first, then the busiest.
      return [...this.activeVideoCalls].sort(
        (a, b) =>
          (b.group.id === this.ownCallGroupId) - (a.group.id === this.ownCallGroupId) ||
          b.participantCount - a.participantCount,
      )
    },
  },
  watch: {
    activeVideoCalls: {
      immediate: true,
      handler(calls) {
        this.$emit('count', calls.length)
      },
    },
  },
  apollo: {
    activeVideoCalls: {
      query() {
        return activeVideoCallsQuery()
      },
      fetchPolicy: 'network-only',
      error(err) {
        // The dock is an extra; a failed load leaves it empty instead of in the way.
        // eslint-disable-next-line no-console
        console.warn('activeVideoCalls query failed:', err)
      },
      subscribeToMore: {
        document: activeVideoCallChangedSubscription(),
        updateQuery: (previous, { subscriptionData }) => {
          const { groupId, call } = subscriptionData.data.activeVideoCallChanged
          const others = (previous?.activeVideoCalls ?? []).filter(
            ({ group }) => group.id !== groupId,
          )
          return { activeVideoCalls: call ? [...others, call] : others }
        },
      },
    },
  },
}
</script>

<style>
.active-video-calls__title {
  margin: 0 0 var(--space-small);
  font-size: var(--font-size-base);
  color: var(--text-color-soft);
}
.active-video-calls__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>

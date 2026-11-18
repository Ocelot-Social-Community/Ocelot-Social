<template>
  <section class="call-participants" :aria-label="$t('videoCall.participants.label')">
    <ul class="call-participants__list">
      <li
        v-for="person in ordered"
        :key="person.userId"
        :class="['call-participants__row', { 'call-participants__row--speaking': person.speaking }]"
        :data-test="'call-participant-' + person.userId"
      >
        <span class="call-participants__avatar">
          <avatar-image :profile="person.profile" size="small" loading="eager" />
        </span>
        <span class="call-participants__who">
          <span class="call-participants__name">{{ person.name }}</span>
        </span>
        <!-- What is on and what is off, to see: a screen share first, as it is not always there. -->
        <span class="call-participants__state">
          <os-icon
            v-for="device in devicesOf(person)"
            :key="device.kind"
            :icon="device.icon"
            :class="{ 'call-participants__off': !device.on }"
            aria-hidden="true"
            :data-test="'call-participant-device-' + device.kind + '-' + person.userId"
          />
        </span>
        <span class="call-participants__sr-only">{{ stateLabel(person) }}</span>
      </li>
    </ul>
  </section>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'

// The people in a video call, one row each however many devices they are in it with, and what
// they have on.
export default {
  name: 'CallParticipants',
  components: { AvatarImage, OsIcon },
  props: {
    // One entry per person: { userId, name, profile, isMe, micOn, cameraOn, screenSharing,
    // speaking }.
    people: { type: Array, required: true },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    // Who speaks first, then oneself, then everybody else by name. The speaking ones are held a
    // moment by the call (its speaker hold), so nobody jumps about at every word.
    ordered() {
      const rank = (person) => {
        if (person.speaking) return 0
        if (person.isMe) return 1
        return 2
      }
      return [...this.people].sort(
        (a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || ''),
      )
    },
  },
  methods: {
    stateLabel(person) {
      return [
        person.speaking ? this.$t('videoCall.participants.speaking') : null,
        person.micOn
          ? this.$t('videoCall.participants.micOn')
          : this.$t('videoCall.participants.micOff'),
        person.cameraOn
          ? this.$t('videoCall.participants.cameraOn')
          : this.$t('videoCall.participants.cameraOff'),
        person.screenSharing ? this.$t('videoCall.participants.sharing') : null,
      ]
        .filter(Boolean)
        .join(', ')
    },
    // Microphone, camera and a running screen share as the row shows them.
    devicesOf(person) {
      const device = (kind, on, icon, iconOff) => ({ kind, on, icon: on ? icon : iconOff })
      return [
        person.screenSharing && device('screen', true, this.icons.desktop, this.icons.desktop),
        device('mic', person.micOn, this.icons.microphone, this.icons.microphoneSlash),
        device('camera', person.cameraOn, this.icons.videoCamera, this.icons.videoCameraSlash),
      ].filter(Boolean)
    },
  },
}
</script>

<style scoped>
.call-participants {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: var(--background-color-base);
}
.call-participants__list {
  flex: 1 1 auto;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}
.call-participants__row {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  padding: var(--space-xx-small) var(--space-x-small);
}
.call-participants__avatar {
  flex: 0 0 auto;
  border-radius: 50%;
  outline: 2px solid transparent;
  outline-offset: 1px;
}
.call-participants__row--speaking .call-participants__avatar {
  outline-color: var(--color-primary);
}
.call-participants__who {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.call-participants__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.call-participants__state {
  flex: 0 0 auto;
  display: inline-flex;
  gap: var(--space-xx-small);
  color: var(--text-color-soft);
}
.call-participants__off {
  color: var(--color-danger);
}
.call-participants__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>

<template>
  <section class="call-participants" :aria-label="$t('videoCall.participants.label')">
    <!--
      What concerns the whole call: the moderation's own controls, and the search once the list
      is long. Somebody who may step into the moderation is offered that instead.
    -->
    <div v-if="isModerator || mayTakeOver || searchable" class="call-participants__toolbar">
      <input
        v-if="searchable"
        v-model="search"
        type="search"
        class="call-participants__search"
        data-test="call-participants-search"
        :placeholder="$t('videoCall.participants.search')"
        :aria-label="$t('videoCall.participants.search')"
      />
      <div class="call-participants__toolbar-actions">
        <os-button
          v-if="isModerator"
          data-test="call-participants-mute-all"
          variant="primary"
          appearance="outline"
          size="sm"
          @click="openMuteAll"
        >
          <template #icon>
            <os-icon :icon="icons.microphoneSlash" />
          </template>
          {{ $t('videoCall.participants.muteAll') }}
        </os-button>
        <os-button
          v-if="!isModerator && mayTakeOver"
          data-test="call-participants-take-over"
          variant="primary"
          appearance="outline"
          size="sm"
          :loading="busy"
          @click="takeOver"
        >
          <template #icon>
            <os-icon :icon="icons.shield" />
          </template>
          {{ $t('videoCall.participants.takeOver') }}
        </os-button>
        <label
          v-if="isModerator || moderation.everyone"
          class="call-participants__everyone"
          data-test="call-participants-everyone"
        >
          <input
            type="checkbox"
            :checked="moderation.everyone"
            :disabled="busy || !mayToggleEveryone"
            @change="setEveryone($event.target.checked)"
          />
          {{ $t('videoCall.participants.everyoneModerates') }}
        </label>
      </div>
    </div>

    <ul class="call-participants__list">
      <li
        v-for="person in shown"
        :key="person.userId"
        :class="['call-participants__row', { 'call-participants__row--speaking': person.speaking }]"
        :data-test="'call-participant-' + person.userId"
      >
        <span class="call-participants__avatar">
          <avatar-image :profile="person.profile" size="small" loading="eager" />
        </span>
        <span class="call-participants__who">
          <span class="call-participants__name">{{ person.name }}</span>
          <!-- What sets them apart, on one line: "You: Moderator – Has the floor". -->
          <span
            v-if="badgeLine(person)"
            class="call-participants__badges"
            :data-test="'call-participant-badges-' + person.userId"
          >
            {{ badgeLine(person) }}
          </span>
        </span>
        <span class="call-participants__state" aria-hidden="true">
          <os-icon
            :icon="person.micOn ? icons.microphone : icons.microphoneSlash"
            :class="{ 'call-participants__off': !person.micOn }"
          />
          <os-icon
            :icon="person.cameraOn ? icons.videoCamera : icons.videoCameraSlash"
            :class="{ 'call-participants__off': !person.cameraOn }"
          />
          <os-icon v-if="person.screenSharing" :icon="icons.desktop" />
          <os-icon v-if="locallyMuted[person.userId]" :icon="icons.volumeOff" />
        </span>
        <span class="call-participants__sr-only">{{ stateLabel(person) }}</span>
        <dropdown class="call-participants__menu" placement="bottom-end" offset="5">
          <template #default="{ toggleMenu }">
            <os-button
              :data-test="'call-participant-menu-' + person.userId"
              variant="primary"
              appearance="ghost"
              circle
              size="sm"
              :aria-label="$t('videoCall.participants.actionsFor', { name: person.name })"
              @click.prevent="openMenu(person, toggleMenu)"
            >
              <template #icon>
                <os-icon :icon="icons.ellipsisV" />
              </template>
            </os-button>
          </template>
          <template #popover="{ toggleMenu }">
            <os-menu dropdown :routes="actionsFor(person)">
              <template #menuitem="item">
                <os-menu-item
                  :route="item.route"
                  :parents="item.parents"
                  :data-test="'call-participant-action-' + item.route.name"
                  @click.stop.prevent="run(item.route, toggleMenu)"
                >
                  <os-icon :icon="item.route.icon" />
                  {{ item.route.label }}
                </os-menu-item>
              </template>
            </os-menu>
          </template>
        </dropdown>
      </li>
    </ul>

    <!--
      The two questions a moderator is asked before acting on more than a click's worth: whom
      "mute all" spares (and who gets the floor with it), and whether somebody is really to be
      removed. Over the list, inside the sidebar, so the call stays in view.
    -->
    <div
      v-if="dialog"
      class="call-participants__dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="
        dialog === 'muteAll'
          ? $t('videoCall.participants.muteAll')
          : $t('videoCall.participants.remove')
      "
      data-test="call-participants-dialog"
      @keydown.esc="closeDialog"
    >
      <template v-if="dialog === 'muteAll'">
        <h3 class="call-participants__dialog-title">
          {{ $t('videoCall.participants.muteAllExcept') }}
        </h3>
        <ul class="call-participants__choices">
          <li
            v-for="person in ordered"
            :key="person.userId"
            :class="[
              'call-participants__choice',
              { 'call-participants__choice--muted': !person.micOn },
            ]"
          >
            <label class="call-participants__choice-label">
              <input
                v-model="spared"
                type="checkbox"
                :value="person.userId"
                :data-test="'mute-all-spare-' + person.userId"
              />
              <span>{{ person.isMe ? $t('videoCall.you') : person.name }}</span>
              <os-icon
                :icon="person.micOn ? icons.microphone : icons.microphoneSlash"
                :class="[
                  'call-participants__mic',
                  {
                    'call-participants__off': !person.micOn,
                    'call-participants__mic--speaking': person.speaking,
                  },
                ]"
                :aria-label="stateLabel(person)"
              />
            </label>
            <button
              type="button"
              :class="[
                'call-participants__floor',
                { 'call-participants__floor--on': floor.includes(person.userId) },
              ]"
              :aria-pressed="floor.includes(person.userId) ? 'true' : 'false'"
              :data-test="'mute-all-floor-' + person.userId"
              @click="toggleFloor(person.userId)"
            >
              <os-icon :icon="icons.microphone" />
              {{
                floor.includes(person.userId)
                  ? $t('videoCall.participants.hasFloor')
                  : $t('videoCall.participants.giveFloor')
              }}
            </button>
          </li>
        </ul>
        <div class="call-participants__dialog-actions">
          <os-button appearance="outline" variant="primary" @click="closeDialog">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            data-test="mute-all-confirm"
            variant="danger"
            :loading="busy"
            :disabled="muteCount === 0 && floorUnchanged"
            @click="muteAll"
          >
            {{ $t('videoCall.participants.muteCount', { count: muteCount }) }}
          </os-button>
        </div>
      </template>
      <template v-else-if="dialog === 'remove' && removing">
        <h3 class="call-participants__dialog-title">
          {{ $t('videoCall.participants.removeQuestion', { name: removing.name }) }}
        </h3>
        <p class="call-participants__dialog-text">
          {{ $t('videoCall.participants.removeExplanation') }}
        </p>
        <div class="call-participants__dialog-actions">
          <os-button appearance="outline" variant="primary" @click="closeDialog">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            data-test="remove-confirm"
            variant="danger"
            :loading="busy"
            @click="remove(removing)"
          >
            {{ $t('videoCall.participants.remove') }}
          </os-button>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { OsButton, OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { mapGetters } from 'vuex'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import Dropdown from '~/components/Dropdown'
import {
  moderateVideoCallParticipantMutation,
  muteAllInVideoCallMutation,
  setVideoCallEveryoneModeratesMutation,
  setVideoCallFloorMutation,
  setVideoCallModeratorMutation,
  takeOverVideoCallModerationMutation,
  videoCallModerationRightsQuery,
} from '~/graphql/VideoCalls'

// From this many people on, the list can be searched.
export const SEARCH_FROM = 10

// The people in a video call, one row each however many devices they are in it with, and what
// can be done about them. What everybody may do is about themselves (show somebody large, open
// their profile, mute them for oneself); what a moderator may do on top goes to the server,
// which decides it again (backend: videoCallModeration.ts).
export default {
  name: 'CallParticipants',
  components: { AvatarImage, Dropdown, OsButton, OsIcon, OsMenu, OsMenuItem },
  props: {
    // One entry per person: { userId, name, slug, profile, isMe, micOn, cameraOn,
    // screenSharing, speaking, devices }.
    people: { type: Array, required: true },
    // What the room's metadata says: { moderators: [userId], everyone, speakers: [userId] }.
    moderation: {
      type: Object,
      default: () => ({ moderators: [], everyone: false, speakers: [] }),
    },
    // Whether the viewer may step into the moderation (group.videoCall.moderate).
    mayTakeOver: { type: Boolean, default: false },
    // The people muted for the viewer alone, by userId.
    locallyMuted: { type: Object, default: () => ({}) },
  },
  emits: ['spotlight', 'local-mute', 'switch-off'],
  data() {
    return {
      search: '',
      busy: false,
      // The heavier rights over the person whose menu is open, as the server answered them.
      rights: {},
      dialog: null,
      removing: null,
      spared: [],
      floor: [],
    }
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    ...mapGetters({
      groupId: 'videoCall/groupId',
      currentUser: 'auth/user',
    }),
    meId() {
      return this.currentUser && this.currentUser.id
    },
    isModerator() {
      return this.moderation.everyone || this.moderation.moderators.includes(this.meId)
    },
    // Ending "everybody moderates" takes a moderator named as such, or somebody who may step
    // in; whoever moderates only because everybody does cannot end it for the others.
    mayToggleEveryone() {
      if (!this.moderation.everyone) return this.isModerator
      return this.moderation.moderators.includes(this.meId) || this.mayTakeOver
    },
    searchable() {
      return this.people.length >= SEARCH_FROM
    },
    // Who speaks first, then oneself, then the moderation, then everybody else by name. The
    // speaking ones are held a moment by the call (its speaker hold), so nobody jumps about at
    // every word.
    ordered() {
      const rank = (person) => {
        if (person.speaking) return 0
        if (person.isMe) return 1
        if (this.isNamedModerator(person.userId)) return 2
        return 3
      }
      return [...this.people].sort(
        (a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || ''),
      )
    },
    shown() {
      const needle = this.search.trim().toLowerCase()
      if (!needle) return this.ordered
      return this.ordered.filter((person) => (person.name || '').toLowerCase().includes(needle))
    },
    // How many "mute all" would mute: everybody not spared and not given the floor whose
    // microphone is on.
    muteCount() {
      return this.people.filter(
        (person) =>
          person.micOn &&
          !this.spared.includes(person.userId) &&
          !this.floor.includes(person.userId),
      ).length
    },
    floorUnchanged() {
      const before = [...this.moderation.speakers].sort()
      const after = [...this.floor].sort()
      return before.length === after.length && before.every((id, i) => id === after[i])
    },
  },
  methods: {
    isNamedModerator(userId) {
      return this.moderation.moderators.includes(userId)
    },
    hasFloor(userId) {
      return this.moderation.speakers.includes(userId)
    },
    badgeLine(person) {
      const marks = [
        this.isNamedModerator(person.userId) && this.$t('videoCall.participants.moderator'),
        this.hasFloor(person.userId) && this.$t('videoCall.participants.hasFloor'),
        person.devices > 1 && this.$t('videoCall.participants.devices', { count: person.devices }),
      ].filter(Boolean)
      const you = this.$t('videoCall.you')
      if (!person.isMe) return marks.join(' – ')
      return marks.length ? `${you}: ${marks.join(' – ')}` : you
    },
    stateLabel(person) {
      return [
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
    // The heavier rights are the server's to tell: they depend on the ranks in the group. Asked
    // when the menu opens, so the menu offers what will be allowed.
    async openMenu(person, toggleMenu) {
      toggleMenu()
      if (person.isMe || !this.isModerator) return
      try {
        const {
          data: { videoCallModerationRights },
        } = await this.$apollo.query({
          query: videoCallModerationRightsQuery(),
          variables: { groupId: this.groupId, userId: person.userId },
          fetchPolicy: 'no-cache',
        })
        this.rights = { ...this.rights, [person.userId]: videoCallModerationRights }
      } catch {
        // Without an answer the heavier entries stay away; the light ones need none.
      }
    },
    actionsFor(person) {
      const entry = (name, label, icon, callback) => ({ name, label, icon, callback })
      const actions = [
        entry('spotlight', this.$t('videoCall.participants.showLarge'), this.icons.expand, () =>
          this.$emit('spotlight', person.userId),
        ),
      ]
      if (person.slug) {
        actions.push(
          entry('profile', this.$t('videoCall.participants.openProfile'), this.icons.user, () =>
            this.$router.push({
              name: 'profile-id-slug',
              params: { id: person.userId, slug: person.slug },
            }),
          ),
        )
      }
      if (!person.isMe) {
        const muted = !!this.locallyMuted[person.userId]
        actions.push(
          entry(
            'localMute',
            muted
              ? this.$t('videoCall.participants.unmuteForMe')
              : this.$t('videoCall.participants.muteForMe'),
            muted ? this.icons.volumeUp : this.icons.volumeOff,
            () => this.$emit('local-mute', person.userId, !muted),
          ),
        )
      }
      if (person.isMe && this.isNamedModerator(person.userId)) {
        actions.push(
          entry('resign', this.$t('videoCall.participants.resign'), this.icons.shield, () =>
            this.setModerator(person, false),
          ),
        )
      }
      // One's own microphone, camera and screen share are one's own to switch off — here as on
      // the control bar, whose buttons follow (switch-off). Somebody else's are the moderation's,
      // and go through the server.
      const own = person.isMe
      if (own || this.isModerator) {
        const switchOff = (kind, action) =>
          own ? () => this.$emit('switch-off', kind) : () => this.moderate(person, action)
        if (person.micOn) {
          actions.push(
            entry(
              'mute',
              this.$t('videoCall.participants.muteMicrophone'),
              this.icons.microphoneSlash,
              switchOff('mic', 'MUTE_MICROPHONE'),
            ),
          )
        }
        if (person.cameraOn) {
          actions.push(
            entry(
              'camera',
              this.$t('videoCall.participants.cameraOffAction'),
              this.icons.videoCameraSlash,
              switchOff('camera', 'DISABLE_CAMERA'),
            ),
          )
        }
        if (person.screenSharing) {
          actions.push(
            entry(
              'screen',
              this.$t('videoCall.participants.stopSharing'),
              this.icons.desktop,
              switchOff('screen', 'STOP_SCREEN_SHARE'),
            ),
          )
        }
      }
      if (!this.isModerator) return actions
      actions.push(
        this.hasFloor(person.userId)
          ? entry(
              'floor',
              this.$t('videoCall.participants.takeFloor'),
              this.icons.microphoneSlash,
              () => this.setFloor(person, false),
            )
          : entry('floor', this.$t('videoCall.participants.giveFloor'), this.icons.microphone, () =>
              this.setFloor(person, true),
            ),
      )
      if (person.isMe) return actions
      const rights = this.rights[person.userId] || {}
      if (!this.isNamedModerator(person.userId)) {
        actions.push(
          entry('appoint', this.$t('videoCall.participants.makeModerator'), this.icons.shield, () =>
            this.setModerator(person, true),
          ),
        )
      } else if (rights.revokeModeration) {
        actions.push(
          entry(
            'revoke',
            this.$t('videoCall.participants.revokeModerator'),
            this.icons.shield,
            () => this.setModerator(person, false),
          ),
        )
      }
      if (rights.remove) {
        actions.push(
          entry(
            'remove',
            this.$t('videoCall.participants.removeEllipsis'),
            this.icons.userTimes,
            () => {
              this.removing = person
              this.dialog = 'remove'
            },
          ),
        )
      }
      return actions
    },
    run(action, toggleMenu) {
      toggleMenu()
      action.callback()
    },
    async mutate(mutation, variables) {
      this.busy = true
      try {
        await this.$apollo.mutate({
          mutation,
          variables: { groupId: this.groupId, ...variables },
        })
        return true
      } catch (error) {
        this.$toastBackendError(error)
        return false
      } finally {
        this.busy = false
      }
    },
    moderate(person, action) {
      return this.mutate(moderateVideoCallParticipantMutation(), { userId: person.userId, action })
    },
    setFloor(person, floor) {
      return this.mutate(setVideoCallFloorMutation(), { userId: person.userId, floor })
    },
    setModerator(person, moderator) {
      return this.mutate(setVideoCallModeratorMutation(), { userId: person.userId, moderator })
    },
    setEveryone(enabled) {
      return this.mutate(setVideoCallEveryoneModeratesMutation(), { enabled })
    },
    takeOver() {
      return this.mutate(takeOverVideoCallModerationMutation(), {})
    },
    async remove(person) {
      if (await this.moderate(person, 'REMOVE')) this.closeDialog()
    },
    // Spared from the start: oneself, and those with the floor; without anybody given the
    // floor, whoever is speaking right now — the one a moderator usually wants to go on.
    openMuteAll() {
      this.floor = [...this.moderation.speakers]
      const speaking = this.floor.length
        ? []
        : this.people.filter((person) => person.speaking && !person.isMe).map((p) => p.userId)
      this.spared = [this.meId, ...this.floor, ...speaking].filter(Boolean)
      this.dialog = 'muteAll'
    },
    // Giving the floor spares; taking it back leaves the tick for the moderator to clear.
    toggleFloor(userId) {
      if (this.floor.includes(userId)) {
        this.floor = this.floor.filter((id) => id !== userId)
        return
      }
      this.floor = [...this.floor, userId]
      if (!this.spared.includes(userId)) this.spared = [...this.spared, userId]
    },
    async muteAll() {
      const done = await this.mutate(muteAllInVideoCallMutation(), {
        exceptUserIds: this.spared,
        floorUserIds: this.floor,
      })
      if (!done) return
      // Muted along with the others: the own button follows, as nobody tells us about ourselves.
      if (!this.spared.includes(this.meId) && !this.floor.includes(this.meId)) {
        this.$emit('switch-off', 'mic')
      }
      this.closeDialog()
    },
    closeDialog() {
      this.dialog = null
      this.removing = null
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
.call-participants__toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-x-small);
  padding: var(--space-x-small);
  border-bottom: 1px solid var(--border-color-softer);
}
.call-participants__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-x-small);
}
.call-participants__search {
  width: 100%;
  padding: var(--space-xx-small) var(--space-x-small);
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
  color: var(--text-color-base);
}
.call-participants__everyone {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xx-small);
  font-size: var(--font-size-small);
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
.call-participants__badges {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-x-small);
  color: var(--text-color-soft);
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
.call-participants__dialog {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  padding: var(--space-small);
  overflow-y: auto;
  background: var(--background-color-base);
}
.call-participants__dialog-title {
  margin: 0;
  font-size: var(--font-size-base);
}
.call-participants__dialog-text {
  margin: 0;
  color: var(--text-color-soft);
}
.call-participants__choices {
  margin: 0;
  padding: 0;
  list-style: none;
}
.call-participants__choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-x-small);
  padding: var(--space-xx-small) 0;
}
.call-participants__choice--muted {
  color: var(--text-color-soft);
}
.call-participants__choice-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xx-small);
  min-width: 0;
}
.call-participants__mic {
  flex: 0 0 auto;
  color: var(--text-color-soft);
}
.call-participants__mic--speaking {
  color: var(--color-primary);
}
.call-participants__floor {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xxx-small);
  padding: var(--space-xxx-small) var(--space-xx-small);
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-base);
  background: none;
  color: var(--text-color-soft);
  font-size: var(--font-size-small);
  cursor: pointer;
}
.call-participants__floor--on {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.call-participants__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-x-small);
}
</style>

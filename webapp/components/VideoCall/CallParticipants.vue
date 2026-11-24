<template>
  <section
    class="call-participants"
    :aria-label="$t('videoCall.participants.label')"
    @keydown.esc="muting && stopMuting()"
  >
    <!--
      What concerns the whole call: the moderation's own controls, and the filter. Somebody who
      may step into the moderation is offered that instead. While "mute all" is being chosen, the
      line holds only its red button at the front and a cross at the end that cancels it: the ticks
      in the rows tell the rest, and the filter, which shows everybody meanwhile anyway, steps
      aside. While the filter's field is open, the controls step aside for it, and its button
      keeps its place.
    -->
    <!-- As high for everybody, the filter's field open or not, so that nothing jumps. -->
    <div class="call-participants__toolbar" data-test="call-participants-toolbar">
      <!-- The question, for a screen reader: the eye has the ticks in the rows. -->
      <h3 v-if="muting" class="call-participants__sr-only" data-test="call-participants-muting">
        {{ $t('videoCall.participants.muteWhom') }}
      </h3>
      <div
        :class="[
          'call-participants__toolbar-actions',
          { 'call-participants__toolbar-actions--muting': muting },
        ]"
      >
        <template v-if="muting">
          <os-button
            data-test="mute-all-confirm"
            variant="danger"
            size="sm"
            :loading="toolbarBusy"
            :disabled="muteCount === 0"
            @click="muteAll"
          >
            {{ $t('videoCall.participants.muteCount', { count: muteCount }) }}
          </os-button>
          <!--
            Where the filter's button stands otherwise. Ghost, unlike the sidebar's cross right
            above it, which closes the whole sidebar.
          -->
          <os-button
            v-tooltip="$t('videoCall.participants.muteCancel')"
            data-test="mute-all-cancel"
            variant="primary"
            appearance="ghost"
            circle
            size="sm"
            :aria-label="$t('videoCall.participants.muteCancel')"
            @click="stopMuting"
          >
            <template #icon>
              <os-icon :icon="icons.close" />
            </template>
          </os-button>
        </template>
        <os-button
          v-if="isModerator && !muting && !filterOpen"
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
          v-if="!isModerator && mayTakeOver && !muting && !filterOpen"
          data-test="call-participants-take-over"
          variant="primary"
          appearance="outline"
          size="sm"
          :loading="toolbarBusy"
          @click="takeOver"
        >
          <template #icon>
            <os-icon :icon="icons.shield" />
          </template>
          {{ $t('videoCall.participants.takeOver') }}
        </os-button>
        <label
          v-if="(isModerator || moderation.everyone) && !muting && !filterOpen"
          class="call-participants__everyone"
          data-test="call-participants-everyone"
        >
          <input
            type="checkbox"
            :checked="moderation.everyone"
            :disabled="toolbarBusy || !mayToggleEveryone"
            @change="setEveryone($event.target.checked, $event.target)"
          />
          {{ $t('videoCall.participants.everyoneModerates') }}
        </label>
        <!--
          The filter: its field opens to the left of its button, in the same line, with the
          filter's symbol at its front. Closed, it filters no more, but keeps what was typed for
          the next time.
        -->
        <span
          v-if="!muting"
          :class="['call-participants__filter', { 'call-participants__filter--open': filterOpen }]"
          data-test="call-participants-filter"
        >
          <span v-if="filterOpen" class="call-participants__filter-field">
            <!--
              The filter's symbol at the field's front opens, with the small arrow up at its side,
              the rest of what the filter can look for, to tick in a menu: whoever matches all that
              is ticked, and the name, stays. The menu stays open for ticking more than one.
            -->
            <dropdown class="call-participants__filter-more" placement="bottom-start" offset="5">
              <template #default="{ toggleMenu, isOpen }">
                <button
                  v-tooltip="$t('videoCall.participants.filterBy')"
                  type="button"
                  class="call-participants__filter-more-toggle"
                  data-test="call-participants-filter-more"
                  :aria-label="$t('videoCall.participants.filterBy')"
                  aria-haspopup="true"
                  :aria-expanded="isOpen ? 'true' : 'false'"
                  @click.prevent="toggleMenu"
                >
                  <os-icon :icon="icons.filter" class="call-participants__filter-symbol" />
                  <os-icon
                    :icon="isOpen ? icons.angleUp : icons.angleDown"
                    class="call-participants__filter-more-arrow"
                  />
                </button>
              </template>
              <template #popover>
                <div
                  class="call-participants__filter-menu"
                  role="group"
                  :aria-label="$t('videoCall.participants.filterBy')"
                  data-test="call-participants-filter-menu"
                >
                  <label
                    v-for="chip in filterChips"
                    :key="chip.key"
                    class="call-participants__filter-option"
                  >
                    <input
                      type="checkbox"
                      :checked="filterKeys.includes(chip.key)"
                      :data-test="'call-participants-filter-chip-' + chip.key"
                      @change="toggleChip(chip.key)"
                    />
                    <os-icon :icon="chip.icon" aria-hidden="true" />
                    {{ chip.label }}
                  </label>
                </div>
              </template>
            </dropdown>
            <!--
              What the filter looks for besides the name, at a glance, each as a badge with a cross:
              a click on it lets go of it.
            -->
            <button
              v-for="chip in chosenChips"
              :key="chip.key"
              v-tooltip="$t('videoCall.participants.filterChipRemove', { name: chip.label })"
              type="button"
              class="call-participants__filter-chosen"
              :aria-label="$t('videoCall.participants.filterChipRemove', { name: chip.label })"
              :data-test="'call-participants-filter-chosen-' + chip.key"
              @click="toggleChip(chip.key)"
            >
              <os-badge variant="primary" class="call-participants__filter-chosen-badge">
                <os-icon :icon="chip.icon" />
                <os-icon :icon="icons.close" class="call-participants__filter-chosen-cross" />
              </os-badge>
            </button>
            <input
              ref="filterName"
              v-model="filterName"
              type="text"
              class="call-participants__filter-name"
              data-test="call-participants-filter-name"
              :placeholder="$t('videoCall.participants.filterNamePlaceholder')"
              :aria-label="$t('videoCall.participants.filterName')"
              @keydown.esc.stop="clearFilterName"
            />
            <span
              v-if="filtering"
              class="call-participants__filter-count"
              data-test="call-participants-filter-count"
              aria-live="polite"
            >
              {{
                $t('videoCall.participants.filterCount', {
                  shown: shown.length,
                  total: people.length,
                })
              }}
            </span>
            <button
              v-if="filterName"
              v-tooltip="$t('videoCall.participants.filterNameClear')"
              type="button"
              class="call-participants__filter-clear"
              data-test="call-participants-filter-clear"
              :aria-label="$t('videoCall.participants.filterNameClear')"
              @click="clearFilterName"
            >
              <os-icon :icon="icons.close" />
            </button>
          </span>
          <os-button
            v-tooltip="$t('videoCall.participants.filter')"
            data-test="call-participants-filter-toggle"
            variant="primary"
            :appearance="filterOpen ? 'filled' : 'ghost'"
            circle
            size="sm"
            :aria-label="$t('videoCall.participants.filter')"
            :aria-expanded="filterOpen ? 'true' : 'false'"
            @click="toggleFilter"
          >
            <template #icon>
              <os-icon :icon="icons.filter" />
            </template>
          </os-button>
        </span>
      </div>
    </div>

    <!-- Focusable for the keyboard to land on where what it was on is gone. -->
    <ul
      ref="list"
      class="call-participants__list"
      tabindex="-1"
      @pointermove="noteActivity"
      @pointerdown="noteActivity"
      @keydown="noteActivity"
      @focusin="noteActivity"
      @pointerleave="$event.pointerType === 'mouse' && restOrder()"
      @focusout="!$el.contains($event.relatedTarget) && restOrder()"
    >
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
            <template v-for="(mark, index) in badges(person)">
              <!-- v-text: no white space may come between a mark and what follows it. -->
              <span v-if="index > 0" :key="'sep-' + index" v-text="mark.after" />
              <span
                :key="mark.key"
                :class="{ 'call-participants__mark--role': mark.role }"
                :data-test="'call-participant-' + mark.key"
                v-text="mark.text"
              />
            </template>
          </span>
        </span>
        <!--
          A moderator switches a microphone, a camera or a screen share that is on off with a click
          on it, and gives or takes the floor with the speech bubble, which everybody else sees only
          on whoever has the floor. What is not always there comes first, so that the devices stay
          in line: whether one muted somebody for oneself, the bubble, a screen share.
        -->
        <span class="call-participants__state">
          <!-- Muted for oneself alone: a click lets one hear them again. -->
          <button
            v-if="locallyMuted[person.userId]"
            v-tooltip="$t('videoCall.participants.unmuteForMe')"
            type="button"
            class="call-participants__switch call-participants__unmute"
            :aria-label="$t('videoCall.participants.unmuteForMe')"
            :data-test="'call-participant-unmute-for-me-' + person.userId"
            @click="$emit('local-mute', person.userId, false)"
          >
            <os-icon :icon="icons.volumeOff" />
          </button>
          <button
            v-if="isModerator && !muting"
            type="button"
            :class="[
              'call-participants__switch',
              'call-participants__give-floor',
              { 'call-participants__give-floor--on': hasFloor(person.userId) },
            ]"
            v-tooltip="floorLabel(person)"
            :aria-label="floorLabel(person)"
            :aria-pressed="hasFloor(person.userId) ? 'true' : 'false'"
            :disabled="busy"
            :data-test="'call-participant-floor-toggle-' + person.userId"
            @click="setFloor(person, !hasFloor(person.userId))"
          >
            <os-icon :icon="icons.comment" />
          </button>
          <!-- Everybody else sees the bubble only on whoever has the floor. -->
          <os-icon
            v-else-if="!isModerator && hasFloor(person.userId)"
            :icon="icons.comment"
            class="call-participants__give-floor--on call-participants__inert"
            aria-hidden="true"
            :data-test="'call-participant-has-floor-' + person.userId"
          />
          <template v-for="device in devicesOf(person)">
            <button
              v-if="device.toggle"
              :key="device.kind"
              type="button"
              :class="[
                'call-participants__switch',
                { 'call-participants__switch-on call-participants__off': !device.on },
              ]"
              v-tooltip="device.label"
              :aria-label="device.label"
              :disabled="busy"
              :data-test="'call-participant-switch-' + device.kind + '-' + person.userId"
              @click="device.toggle"
            >
              <os-icon :icon="device.icon" />
            </button>
            <os-icon
              v-else
              :key="device.kind"
              :icon="device.icon"
              :class="['call-participants__inert', { 'call-participants__off': !device.on }]"
              aria-hidden="true"
              :data-test="'call-participant-device-' + device.kind + '-' + person.userId"
            />
          </template>
        </span>
        <span class="call-participants__sr-only">{{ stateLabel(person) }}</span>
        <button
          v-if="muting"
          type="button"
          :class="[
            'call-participants__floor',
            { 'call-participants__floor--on': floor.includes(person.userId) },
          ]"
          :aria-pressed="floor.includes(person.userId) ? 'true' : 'false'"
          :disabled="busy"
          :data-test="'mute-all-floor-' + person.userId"
          @click="toggleFloor(person.userId)"
        >
          <os-icon :icon="icons.comment" />
          {{
            floor.includes(person.userId)
              ? $t('videoCall.participants.hasFloor')
              : $t('videoCall.participants.giveFloor')
          }}
        </button>
        <dropdown
          v-else
          class="call-participants__menu"
          placement="bottom-end"
          offset="5"
          @open-change="holdOrder"
        >
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
        <!--
          Ticked: muted by "mute all"; whoever is not ticked is spared. Whoever is given the floor
          is spared: their tick is free again once the floor is taken back.
        -->
        <input
          v-if="muting"
          type="checkbox"
          class="call-participants__pick"
          :checked="!spared.includes(person.userId)"
          :disabled="busy || floor.includes(person.userId)"
          :aria-label="$t('videoCall.participants.muteName', { name: person.name })"
          :data-test="'mute-all-pick-' + person.userId"
          @change="spare(person.userId, !$event.target.checked)"
        />
      </li>
      <li
        v-if="filtering && !shown.length"
        class="call-participants__none"
        data-test="call-participants-filter-none"
      >
        {{ $t('videoCall.participants.filterNone') }}
        <os-button
          data-test="call-participants-filter-reset"
          variant="primary"
          appearance="outline"
          size="sm"
          @click="resetFilter"
        >
          {{ $t('videoCall.participants.filterReset') }}
        </os-button>
      </li>
    </ul>

    <!--
      The question before removing somebody, over the list, inside the sidebar, so the call stays
      in view.
    -->
    <div
      v-if="removalOpen"
      ref="dialog"
      class="call-participants__dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="$t('videoCall.participants.remove')"
      data-test="call-participants-dialog"
      @keydown.esc="closeDialog"
      @keydown="trapFocus($refs.dialog, $event)"
    >
      <h3 class="call-participants__dialog-title">
        {{ $t('videoCall.participants.removeQuestion', { name: removing.name }) }}
      </h3>
      <p class="call-participants__dialog-text">
        {{ $t('videoCall.participants.removeExplanation') }}
      </p>
      <div class="call-participants__dialog-actions">
        <!-- The keyboard starts on the harmless answer. -->
        <os-button
          appearance="outline"
          variant="primary"
          data-test="remove-cancel"
          data-autofocus
          @click="closeDialog"
        >
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
    </div>
  </section>
</template>

<script>
import { OsBadge, OsButton, OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
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
import { takeFocus, trapFocus } from './dialogFocus'

// A name as the filter compares it: whatever the case, and without accents, so that "jose"
// finds José.
const fold = (text) =>
  (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// How long the rows stay where they are after the last move, click or key in the list. Whoever
// aims at a switch, or has just pressed one, is not to see the row jump away under the pointer.
export const ORDER_REST = 5000

// The people in a video call, one row each however many devices they are in it with, and what
// can be done about them. What everybody may do is about themselves (show somebody large, open
// their profile, mute them for oneself); what a moderator may do on top goes to the server,
// which decides it again (backend: videoCallModeration.ts).
export default {
  name: 'CallParticipants',
  components: { AvatarImage, Dropdown, OsBadge, OsButton, OsIcon, OsMenu, OsMenuItem },
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
  emits: ['spotlight', 'local-mute', 'switch-off', 'switch-on'],
  data() {
    return {
      // The requests to the server still on their way: while any is, the controls in the rows
      // wait. Those of the toolbar wait only for their own: a row worked meanwhile does not make
      // them flicker.
      pending: 0,
      toolbarPending: 0,
      // The filter: whether its row is unfolded, the part of a name it looks for, and the chips
      // chosen, by key.
      filterOpen: false,
      filterName: '',
      filterKeys: [],
      // The heavier rights over the person whose menu is open, as the server answered them.
      rights: {},
      dialog: null,
      removing: null,
      // The order of the rows as it was when it was stopped, by userId; null while it is live.
      heldOrder: null,
      // What stops it: an open menu, or somebody busy in the list a moment ago.
      menuOpen: false,
      active: false,
      // Whether "mute all" is being chosen, right in the list.
      muting: false,
      spared: [],
      floor: [],
      // Those ticked only because they were given the floor here: taking it back unticks them.
      sparedForFloor: [],
    }
  },
  created() {
    this.icons = iconRegistry
    // Not shown, only compared: which question about somebody's rights is the latest.
    this.rightsAsked = {}
    // Not shown either: how often the room has told of somebody's floor changing, by userId.
    this.floorTold = {}
  },
  beforeDestroy() {
    clearTimeout(this.restTimer)
  },
  computed: {
    busy() {
      return this.pending > 0
    },
    toolbarBusy() {
      return this.toolbarPending > 0
    },
    removalOpen() {
      return this.dialog === 'remove' && !!this.removing
    },
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
      const live = [...this.people].sort(
        (a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || ''),
      )
      if (!this.heldOrder) return live
      // While the order is held nobody moves; whoever joins meanwhile comes last.
      const place = (person) => {
        const index = this.heldOrder.indexOf(person.userId)
        return index === -1 ? Infinity : index
      }
      return live.sort((a, b) => place(a) - place(b))
    },
    // What the filter can look for besides a name. "Speaking" comes and goes with every word, but
    // shows where a background noise comes from.
    filterChips() {
      const chip = (key, icon, label, matches) => ({ key, icon, label, matches })
      return [
        chip(
          'micOn',
          this.icons.microphone,
          this.$t('videoCall.participants.filterChip.micOn'),
          (person) => person.micOn,
        ),
        chip(
          'cameraOn',
          this.icons.videoCamera,
          this.$t('videoCall.participants.filterChip.cameraOn'),
          (person) => person.cameraOn,
        ),
        chip(
          'speaking',
          this.icons.volumeUp,
          this.$t('videoCall.participants.filterChip.speaking'),
          (person) => person.speaking,
        ),
        chip(
          'floor',
          this.icons.comment,
          this.$t('videoCall.participants.filterChip.floor'),
          (person) => this.hasFloor(person.userId),
        ),
        chip(
          'moderator',
          this.icons.shield,
          this.$t('videoCall.participants.filterChip.moderator'),
          (person) => this.moderation.everyone || this.isNamedModerator(person.userId),
        ),
        chip(
          'sharing',
          this.icons.desktop,
          this.$t('videoCall.participants.filterChip.sharing'),
          (person) => person.screenSharing,
        ),
        chip(
          'mutedForMe',
          this.icons.volumeOff,
          this.$t('videoCall.participants.filterChip.mutedForMe'),
          (person) => !!this.locallyMuted[person.userId],
        ),
      ]
    },
    chosenChips() {
      return this.filterChips.filter((chip) => this.filterKeys.includes(chip.key))
    },
    // Only while its field is open: closed, the filter keeps name and chips but filters no more.
    // Not while "mute all" is being chosen: whoever it mutes is to be seen, with their tick. The
    // name and the chips stay, and filter again once the choice is over.
    filtering() {
      return (
        !this.muting &&
        this.filterOpen &&
        (fold(this.filterName) !== '' || this.filterKeys.length > 0)
      )
    },
    shown() {
      if (!this.filtering) return this.ordered
      const needle = fold(this.filterName)
      return this.ordered.filter(
        (person) =>
          fold(person.name).includes(needle) &&
          this.chosenChips.every((chip) => chip.matches(person)),
      )
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
  },
  watch: {
    // The keyboard goes with the question, and comes back once it is answered: to where it was,
    // or, as the menu that asked is gone by then, to the menu of whoever it was about.
    removalOpen(open) {
      if (open) {
        // Removed, their row and menu may be gone as well: then the row that took its place —
        // the next one, else the one before — as in the list of chats; the list only once
        // nobody else is left in it.
        // Who took it is asked of the rows shown by then, which may have changed meanwhile;
        // only the place is kept from now. Shown: with the filter on, a row it hides is no
        // place for the keyboard.
        const removed = this.removing.userId
        const at = Math.max(
          this.shown.findIndex((person) => person.userId === removed),
          0,
        )
        const menuOf = (userId) =>
          this.$el.querySelector(`[data-test="call-participant-menu-${userId}"]`)
        const replacement = () => {
          const rows = this.shown.map((person) => person.userId)
          if (rows.includes(removed)) return menuOf(removed)
          return rows.length ? menuOf(rows[Math.min(at, rows.length - 1)]) : null
        }
        this.$nextTick(() => {
          // Gone again before it was drawn: nothing to take the focus to.
          if (!this.$refs.dialog) return
          this.giveRemovalFocusBack = takeFocus(
            this.$refs.dialog,
            () => replacement() || this.$refs.list,
          )
        })
        return
      }
      const giveBack = this.giveRemovalFocusBack
      this.giveRemovalFocusBack = null
      if (giveBack) giveBack()
    },
    // Whoever no longer moderates has nothing left to choose.
    isModerator(moderating) {
      if (!moderating) this.stopMuting()
    },
    // The floor given or taken back by another moderator while "mute all" is being chosen
    // counts here as well, as if given or taken here: a tick it locked is free again.
    'moderation.speakers'(speakers, before = []) {
      ;[...speakers, ...before]
        .filter((id) => speakers.includes(id) !== before.includes(id))
        .forEach((id) => {
          this.floorTold[id] = (this.floorTold[id] || 0) + 1
        })
      if (!this.muting) return
      this.floor.filter((id) => !speakers.includes(id)).forEach(this.floorTaken)
      speakers.filter((id) => !this.floor.includes(id)).forEach(this.floorGiven)
    },
    // Whoever joins while the order is held comes last, in the order they came, and stays
    // there until the order is live again. Whoever leaves gives up their place: back again,
    // they come last as well. A second device of somebody there changes nothing.
    people(people) {
      if (!this.heldOrder) return
      const present = [...new Set(people.map((person) => person.userId))]
      const kept = this.heldOrder.filter((userId) => present.includes(userId))
      const newcomers = present.filter((userId) => !kept.includes(userId))
      if (kept.length !== this.heldOrder.length || newcomers.length) {
        this.heldOrder = [...kept, ...newcomers]
      }
    },
  },
  methods: {
    trapFocus,
    isNamedModerator(userId) {
      return this.moderation.moderators.includes(userId)
    },
    hasFloor(userId) {
      return this.moderation.speakers.includes(userId)
    },
    // What sets somebody apart, in order; the roles in the call stand out in colour. Each knows
    // what goes before it: ": " after "you", " – " between the others. While everybody
    // moderates, everybody is marked as moderating, and those named as such, who alone can end
    // it, as leading the moderation.
    badges(person) {
      const marks = [
        person.isMe && { key: 'you', text: this.$t('videoCall.you') },
        (this.moderation.everyone || this.isNamedModerator(person.userId)) && {
          key: 'moderator',
          text:
            this.moderation.everyone && this.isNamedModerator(person.userId)
              ? this.$t('videoCall.participants.leadModerator')
              : this.$t('videoCall.participants.moderator'),
          role: true,
        },
        this.hasFloor(person.userId) && {
          key: 'floor',
          text: this.$t('videoCall.participants.hasFloor'),
          role: true,
        },
        person.devices > 1 && {
          key: 'devices',
          text: this.$t('videoCall.participants.devices', { count: person.devices }),
        },
      ].filter(Boolean)
      return marks.map((mark, index) => ({
        ...mark,
        after: index === 1 && marks[0].key === 'you' ? ': ' : ' – ',
      }))
    },
    // The same, as one line of text: what a screen reader and the tests read.
    badgeLine(person) {
      return this.badges(person)
        .map((mark, index) => (index > 0 ? mark.after : '') + mark.text)
        .join('')
    },
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
    // Closing the filter keeps the name for the next time it opens.
    toggleFilter() {
      this.filterOpen = !this.filterOpen
      if (this.filterOpen)
        this.$nextTick(() => this.$refs.filterName && this.$refs.filterName.focus())
    },
    // Esc empties the name, and folds the filter away once it is empty.
    clearFilterName(event) {
      if (event && event.type === 'keydown' && !this.filterName) this.filterOpen = false
      this.filterName = ''
    },
    toggleChip(key) {
      this.filterKeys = this.filterKeys.includes(key)
        ? this.filterKeys.filter((chosen) => chosen !== key)
        : [...this.filterKeys, key]
    },
    resetFilter() {
      this.filterName = ''
      this.filterKeys = []
    },
    // A menu holds the order for as long as it is open, and a moment longer, like a click does.
    holdOrder(open) {
      this.menuOpen = open
      if (open) this.updateHold()
      else this.noteActivity()
    },
    // Somebody moves, clicks or types in the list: the order stays until it has been quiet there
    // for a while, so that the pointer resting somewhere does not stop it for good.
    noteActivity() {
      this.active = true
      clearTimeout(this.restTimer)
      this.restTimer = setTimeout(this.restOrder, ORDER_REST)
      this.updateHold()
    },
    // Quiet for long enough, or gone from the list: the rows may move again, unless a menu is open.
    restOrder() {
      this.active = false
      clearTimeout(this.restTimer)
      this.updateHold()
    },
    updateHold() {
      if (!this.menuOpen && !this.active) this.heldOrder = null
      else if (!this.heldOrder) this.heldOrder = this.ordered.map((person) => person.userId)
    },
    // The heavier rights are the server's to tell: they depend on the ranks in the group. Asked
    // when the menu opens, so the menu offers what will be allowed.
    async openMenu(person, toggleMenu) {
      toggleMenu()
      if (person.isMe || !this.isModerator) return
      // What was allowed last time may no longer be: the heavier entries wait for the new answer,
      // and stay away without one. Only the latest question about somebody counts.
      this.rights = Object.fromEntries(
        Object.entries(this.rights).filter(([userId]) => userId !== person.userId),
      )
      const asked = {}
      this.rightsAsked = { ...this.rightsAsked, [person.userId]: asked }
      try {
        const {
          data: { videoCallModerationRights },
        } = await this.$apollo.query({
          query: videoCallModerationRightsQuery(),
          variables: { groupId: this.groupId, userId: person.userId },
          fetchPolicy: 'no-cache',
        })
        if (this.rightsAsked[person.userId] !== asked) return
        this.rights = { ...this.rights, [person.userId]: videoCallModerationRights }
      } catch {
        // Without an answer the heavier entries stay away; the light ones need none.
      }
    },
    // Microphone, camera and a running screen share as the row shows them. One that is on can be
    // switched off right there, as from the menu: one's own by everybody, anybody's by a moderator.
    // One's own can be switched on again there too.
    devicesOf(person) {
      // One's own row switches this device: with another one of one's own on, the row would say
      // "on" for a microphone that is off here, and offer switching off what is off already.
      const own = (kind, all) => {
        const here = person.here && person.here[kind]
        return person.isMe && typeof here === 'boolean' ? here : all
      }
      const device = (kind, on, icon, iconOff, label, action, labelOn) => {
        let toggle = null
        if (on && (person.isMe || this.isModerator)) toggle = this.switchOff(person, kind, action)
        else if (!on && person.isMe) toggle = () => this.$emit('switch-on', kind)
        return {
          kind,
          on,
          icon: on ? icon : iconOff,
          label: on ? label : labelOn,
          toggle,
        }
      }
      return [
        person.screenSharing &&
          device(
            'screen',
            true,
            this.icons.desktop,
            this.icons.desktop,
            this.$t('videoCall.participants.stopSharing'),
            'STOP_SCREEN_SHARE',
          ),
        device(
          'mic',
          own('mic', person.micOn),
          this.icons.microphone,
          this.icons.microphoneSlash,
          this.$t('videoCall.participants.muteMicrophone'),
          'MUTE_MICROPHONE',
          this.$t('videoCall.participants.micOnAction'),
        ),
        device(
          'camera',
          own('camera', person.cameraOn),
          this.icons.videoCamera,
          this.icons.videoCameraSlash,
          this.$t('videoCall.participants.cameraOffAction'),
          'DISABLE_CAMERA',
          this.$t('videoCall.participants.cameraOnAction'),
        ),
      ].filter(Boolean)
    },
    floorLabel(person) {
      return this.hasFloor(person.userId)
        ? this.$t('videoCall.participants.takeFloor')
        : this.$t('videoCall.participants.giveFloor')
    },
    // One's own goes off right here, for everybody; somebody else's is asked of the server.
    switchOff(person, kind, action) {
      return person.isMe
        ? () => this.$emit('switch-off', kind)
        : () => this.moderate(person, action)
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
          entry('resign', this.$t('videoCall.participants.resign'), this.icons.shieldSlash, () =>
            this.setModerator(person, false),
          ),
        )
      }
      // One's own microphone, camera and screen share are one's own to switch off — here as on
      // the control bar, whose buttons follow (switch-off). Somebody else's are the moderation's,
      // and go through the server.
      const own = person.isMe
      if (own || this.isModerator) {
        const switchOff = (kind, action) => this.switchOff(person, kind, action)
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
              this.icons.desktopSlash,
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
              this.icons.commentSlash,
              () => this.setFloor(person, false),
            )
          : entry('floor', this.$t('videoCall.participants.giveFloor'), this.icons.comment, () =>
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
            this.icons.shieldSlash,
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
              // Each question counts on its own, also when asked again about the same person.
              this.removalAsked = (this.removalAsked || 0) + 1
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
    async mutate(mutation, variables, { toolbar = false } = {}) {
      this.pending++
      if (toolbar) this.toolbarPending++
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
        this.pending--
        if (toolbar) this.toolbarPending--
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
    // Failed, the box shows what holds again. Vue would not: the value bound to it has not
    // changed, only the box, by the click.
    async setEveryone(enabled, checkbox) {
      const done = await this.mutate(
        setVideoCallEveryoneModeratesMutation(),
        { enabled },
        { toolbar: true },
      )
      if (!done && checkbox) checkbox.checked = this.moderation.everyone
      return done
    },
    takeOver() {
      return this.mutate(takeOverVideoCallModerationMutation(), {}, { toolbar: true })
    },
    // Closes its own question only: dismissed meanwhile, and another one asked — about somebody
    // else or the same one again — that one stays.
    async remove(person) {
      const asked = this.removalAsked
      if ((await this.moderate(person, 'REMOVE')) && this.removalAsked === asked && this.removing) {
        this.closeDialog()
      }
    },
    // Spared from the start: oneself, and those with the floor; without anybody given the
    // floor, whoever is speaking right now — the one a moderator usually wants to go on.
    // Those with the floor are spared only for it: taking it back ticks them at once.
    openMuteAll() {
      this.floor = [...this.moderation.speakers]
      const speaking = this.floor.length
        ? []
        : this.people.filter((person) => person.speaking && !person.isMe).map((p) => p.userId)
      this.spared = [this.meId, ...this.floor, ...speaking].filter(Boolean)
      this.sparedForFloor = this.floor.filter((id) => id !== this.meId)
      // A floor given in an earlier choice and answered only now must not change this one.
      this.selection = (this.selection || 0) + 1
      this.muting = true
      // The button that opened it is gone: the keyboard goes on to the harmless answer.
      this.$nextTick(() => {
        const cancel = this.$el.querySelector('[data-test="mute-all-cancel"]')
        if (cancel) cancel.focus()
      })
    },
    stopMuting() {
      if (!this.muting) return
      // Back to the button that opens it again, or to the list where it is gone — but only for
      // a keyboard that was here: ended by the moderation passing on, focus elsewhere stays put.
      const here =
        this.$el.contains(document.activeElement) || document.activeElement === document.body
      this.muting = false
      this.$nextTick(() => {
        if (!here) return
        const target =
          this.$el.querySelector('[data-test="call-participants-mute-all"]') || this.$refs.list
        if (target) target.focus()
      })
    },
    spare(userId, spared) {
      this.spared = spared ? [...this.spared, userId] : this.spared.filter((id) => id !== userId)
    },
    // Giving or taking back the floor counts at once, not only with "mute all". Giving it
    // spares; taking it back unticks again whoever was ticked only by giving it, and leaves a
    // tick set before.
    async toggleFloor(userId) {
      const giving = !this.floor.includes(userId)
      const selection = this.selection
      const told = this.floorTold[userId] || 0
      if (!(await this.mutate(setVideoCallFloorMutation(), { userId, floor: giving }))) return
      // Closed or opened anew meanwhile: given or taken all the same, which the room's metadata
      // shows; the choice it was made in is gone.
      if (!this.muting || this.selection !== selection) return
      // The room has told of this floor since it was asked for — this answer, or another
      // moderator after it, also one undoing it again: the room is newer than this answer, and
      // already counted (see the watcher of moderation.speakers).
      if ((this.floorTold[userId] || 0) !== told) return
      if (giving) this.floorGiven(userId)
      else this.floorTaken(userId)
    },
    floorGiven(userId) {
      if (this.floor.includes(userId)) return
      this.floor = [...this.floor, userId]
      if (!this.spared.includes(userId)) {
        this.spared = [...this.spared, userId]
        this.sparedForFloor = [...this.sparedForFloor, userId]
      }
    },
    floorTaken(userId) {
      if (!this.floor.includes(userId)) return
      this.floor = this.floor.filter((id) => id !== userId)
      if (this.sparedForFloor.includes(userId)) {
        this.spared = this.spared.filter((id) => id !== userId)
        this.sparedForFloor = this.sparedForFloor.filter((id) => id !== userId)
      }
    },
    async muteAll() {
      // Closes its own choice only: cancelled meanwhile and opened anew, that one stays.
      const selection = this.selection
      // What was sent counts, not what is ticked while it is on its way. Who has the floor is
      // not sent: the server spares whoever has it when the request arrives, as given and taken
      // at once (toggleFloor) — by this moderator or by another one meanwhile.
      // Whether oneself is muted along with the others is the server's to say, too: given the
      // floor meanwhile, one is spared. It tells one's own devices as it tells everybody else's,
      // and the buttons follow (VideoCall: microphoneMuted, self).
      // Those spared only for having the floor are not named either: taken back meanwhile, the
      // server would spare them all the same.
      const done = await this.mutate(
        muteAllInVideoCallMutation(),
        { exceptUserIds: this.spared.filter((userId) => !this.sparedForFloor.includes(userId)) },
        { toolbar: true },
      )
      if (!done || this.selection !== selection) return
      this.stopMuting()
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
  /*  As high as a small OsButton: the filter's field open is no higher than its button closed. */
  --call-participants-control-height: 26px;
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
  /*  Above and below no more room than its controls need, for everybody, the filter's field open
      or not: it takes little room, also on a phone, and nothing jumps. On the right as far from
      the edge as the sidebar's close button above it, and the rows' menus below: the three line
      up. */
  padding: var(--space-xxx-small) var(--space-small) var(--space-xxx-small) var(--space-x-small);
  border-bottom: 1px solid var(--border-color-softer);
}
.call-participants__toolbar-actions {
  min-height: var(--call-participants-control-height);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-x-small);
}
.call-participants__filter {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-xx-small);
  min-width: 0;
  margin-left: auto;
}
/*  Closed, only the button: it fits behind the moderation's controls. Open, the controls step
    aside and the field takes the line. */
.call-participants__filter--open {
  flex: 1 1 auto;
}
.call-participants__filter-field {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: var(--space-xx-small);
  min-width: 0;
  box-sizing: border-box;
  height: var(--call-participants-control-height);
  padding: 0 var(--space-x-small);
  border: 1px solid var(--border-color-soft);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}
.call-participants__filter-field:focus-within {
  border-color: var(--border-color-active);
}
.call-participants__filter-symbol {
  flex: 0 0 auto;
}
/*  The small arrow sits up at the symbol's side, like an exponent: both are the menu's button. */
.call-participants__filter-more-toggle {
  align-items: flex-start;
}
.call-participants__filter-more-arrow {
  flex: 0 0 auto;
  font-size: 0.45em;
}
.call-participants__filter-name {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: none;
  color: var(--text-color-base);
}
.call-participants__filter-clear,
.call-participants__filter-more-toggle {
  flex: 0 0 auto;
  display: inline-flex;
  padding: 2px;
  margin: -2px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--text-color-soft);
  cursor: pointer;
}
/*  The menu's button stands in the dropdown's trigger, an inline block: inline itself, it would
    sit on that line's baseline, with room for descenders below, and so above the field's middle.
    A block of its own has no line to sit on. */
.call-participants__filter-more-toggle {
  display: flex;
}
/*  Under the pointer, both get a grey ground, the same as the menu's options. */
.call-participants__filter-clear:hover,
.call-participants__filter-clear:focus-visible,
.call-participants__filter-more-toggle:hover,
.call-participants__filter-more-toggle:focus-visible {
  color: var(--text-color-base);
  background: var(--background-color-softer);
}
.call-participants__filter-count {
  flex: 0 0 auto;
  font-size: var(--font-size-x-small);
  color: var(--text-color-soft);
  white-space: nowrap;
}
.call-participants__filter-chosen {
  flex: 0 0 auto;
  display: inline-flex;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
}
.call-participants__filter-chosen:focus-visible {
  outline: none;
}
/*  The badge's own colours come as utilities that outweigh plain component rules: to turn it
    to danger under the pointer, the override needs !important. */
.call-participants__filter-chosen:hover .call-participants__filter-chosen-badge,
.call-participants__filter-chosen:focus-visible .call-participants__filter-chosen-badge {
  color: var(--color-danger-contrast) !important;
  background: var(--color-danger-fill, var(--color-danger)) !important;
}
.call-participants__filter-chosen-cross {
  font-size: 0.8em;
}
.call-participants__filter-more {
  flex: 0 0 auto;
  display: inline-flex;
}
/*  The popover has its own padding: the options keep to it, only their hover reaches a little
    beyond. */
.call-participants__filter-menu {
  display: flex;
  flex-direction: column;
  margin: 0 calc(-1 * var(--space-x-small));
}
.call-participants__filter-option {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  padding: var(--space-xx-small) var(--space-x-small);
  border-radius: var(--border-radius-base);
  white-space: nowrap;
  cursor: pointer;
}
.call-participants__filter-option:hover {
  background: var(--background-color-softer);
}
.call-participants__none {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-x-small);
  padding: var(--space-small);
  color: var(--text-color-soft);
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

/* Focused only as a landing place for the keyboard (see the removal and "mute all"), not a
   control: no ring around the whole list for a click; for the keyboard a fine one inside, so
   it is seen where it went, without moving anything. */
.call-participants__list:focus {
  outline: none;
}
.call-participants__list:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.call-participants__row {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  /*  On the right as the toolbar (see there). */
  padding: var(--space-xx-small) var(--space-small) var(--space-xx-small) var(--space-x-small);
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
.call-participants__mark--role {
  color: var(--color-primary);
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
.call-participants__switch {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}
.call-participants__switch:hover,
.call-participants__switch:focus-visible {
  color: var(--color-danger);
}
.call-participants__switch-on:hover,
.call-participants__switch-on:focus-visible {
  color: var(--color-primary);
}
.call-participants__unmute {
  color: var(--video-call-participant-locally-muted-color);
}
.call-participants__unmute:hover,
.call-participants__unmute:focus-visible {
  color: var(--color-primary);
}
.call-participants__give-floor--on {
  color: var(--color-primary);
}
.call-participants__give-floor:hover,
.call-participants__give-floor:focus-visible {
  color: var(--color-primary);
}
.call-participants__switch:disabled {
  cursor: default;
}
.call-participants__off {
  color: var(--color-danger);
}
/*  What the viewer can work in a row is shown in full; whatever else steps back a little. */
.call-participants__inert {
  color: var(--video-call-participant-inert-on-color);
}
.call-participants__off.call-participants__inert {
  color: var(--video-call-participant-inert-off-color);
}
.call-participants__give-floor--on.call-participants__inert {
  color: var(--video-call-participant-inert-floor-color);
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
/*  The red button at the front, the cross at the end, where the filter's button stands
    otherwise. Set on the line, not on the cross: a scoped rule does not reach an OsButton's root. */
.call-participants__toolbar-actions--muting {
  justify-content: space-between;
}
.call-participants__pick {
  flex: 0 0 auto;
}
.call-participants__floor {
  flex: 0 0 auto;
}
.call-participants__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-x-small);
}
</style>

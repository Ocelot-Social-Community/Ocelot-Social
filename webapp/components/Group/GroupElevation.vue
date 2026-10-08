<template>
  <!--
    The deliberate half of holding a network right: a moderator or admin can READ into a group
    they are not in, but editing its roles, settings or memberships waits for them to say they
    are doing it. The ask is recorded with the group and lapses on its own.
  -->
  <os-card v-if="group && (elevation || mayElevate)" class="elevation" data-test="group-elevation">
    <template v-if="elevation">
      <p class="elevation__active" data-test="elevation-active">
        <strong>{{ $t('group.elevation.activeTitle') }}</strong>
        {{ $t('group.elevation.activeUntil', { time: expiresAt }) }}
      </p>
      <os-button appearance="outline" :disabled="working" data-test="elevation-end" @click="end">
        {{ $t('group.elevation.end') }}
      </os-button>
    </template>

    <template v-else>
      <p class="elevation__offer" data-test="elevation-offer">
        <strong>{{ actingAs }}</strong>
        {{ $t('group.elevation.offerBody') }}
      </p>
      <ocelot-input
        v-model="reason"
        class="elevation__reason"
        :aria-label="$t('group.elevation.reasonPlaceholder')"
        :placeholder="$t('group.elevation.reasonPlaceholder')"
        :disabled="working"
        :maxlength="maxReasonLength"
        data-test="elevation-reason"
      />
      <!-- A reason is required: the elevation is the record of an intervention, and the why is
           what tells a repair from an abuse when somebody reads it later. -->
      <os-button
        variant="primary"
        :disabled="working || !trimmedReason"
        data-test="elevation-start"
        @click="start"
      >
        {{ $t('group.elevation.start') }}
      </os-button>
    </template>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import OcelotInput from '~/components/OcelotInput/OcelotInput'
import { elevateInGroupMutation, endGroupElevationMutation } from '~/graphql/groupRoles.js'
import groupRights from '~/mixins/groupRights'

export default {
  name: 'GroupElevation',
  mixins: [groupRights],
  components: { OcelotInput, OsButton, OsCard },
  props: {
    /** The group as the page already has it: `myGroupElevation` and `mayElevateInGroup`. */
    group: { type: Object, default: null },
  },
  data() {
    // The limit the server holds the reason to (groupRoles.ts, MAX_REASON_LENGTH), so typing
    // stops where it would be refused rather than after the click.
    return { reason: '', working: false, maxReasonLength: 280 }
  },
  mounted() {
    this.scheduleLapse()
  },
  beforeDestroy() {
    this.clearLapse()
  },
  watch: {
    /**
     * The window closes on its own after an hour, and nothing pushes that moment to the client.
     * Without this the card keeps offering actions the backend has already stopped allowing, and
     * the viewer finds out through a failed mutation.
     */
    'elevation.expiresAt'() {
      this.scheduleLapse()
    },
  },
  computed: {
    elevation() {
      return this.group?.myGroupElevation ?? null
    },
    mayElevate() {
      return this.group?.mayElevateInGroup === true
    },
    /**
     * What the viewer is right now — which is NOT "elevated": until they ask, they act on their
     * membership, and for a member saying otherwise is simply wrong.
     */
    actingAs() {
      const role = this.group?.myGroupRole
      if (!role) {
        return this.$t('group.elevation.actingAsNonMember')
      }
      return this.$t('group.elevation.actingAsMember', { role: this.roleLabel(role) })
    },
    /** Sent trimmed: the server refuses a padded reason like a padded role label. */
    trimmedReason() {
      return this.reason.trim()
    },
    expiresAt() {
      const at = this.elevation?.expiresAt
      if (!at) return ''
      // Only the time of day: the window is an hour, so the date would say nothing.
      return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    },
  },
  methods: {
    scheduleLapse() {
      this.clearLapse()
      const at = this.elevation?.expiresAt
      if (!at || typeof window === 'undefined') return
      const remaining = new Date(at).getTime() - Date.now()
      // Already past: ask straight away rather than waiting out a negative delay, which
      // setTimeout would fire immediately anyway but less obviously.
      this._lapseTimer = window.setTimeout(
        () => {
          this._lapseTimer = null
          this.$emit('changed')
        },
        Math.max(remaining, 0),
      )
    },
    clearLapse() {
      if (this._lapseTimer) {
        window.clearTimeout(this._lapseTimer)
        this._lapseTimer = null
      }
    },
    async start() {
      await this.run(elevateInGroupMutation(), {
        groupId: this.group.id,
        reason: this.trimmedReason,
      })
    },
    async end() {
      await this.run(endGroupElevationMutation(), { groupId: this.group.id })
    },
    async run(mutation, variables) {
      this.working = true
      try {
        await this.$apollo.mutate({ mutation, variables })
        // The page holds the group; what the viewer may do here just changed, so it refetches
        // rather than this component guessing the new answer.
        this.$emit('changed')
      } catch (error) {
        this.$toastBackendError(error)
      } finally {
        this.working = false
      }
    },
  },
}
</script>

<style scoped>
.elevation {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  align-items: center;
  margin-bottom: var(--space-small);
  border-left: 4px solid var(--color-warning, var(--color-primary));
}

.elevation__reason {
  flex: 1 1 14rem;
}

.elevation__active,
.elevation__offer {
  flex: 1 1 20rem;
  margin: 0;
}
</style>

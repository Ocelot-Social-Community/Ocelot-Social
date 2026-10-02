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
        <strong>{{ $t('group.elevation.offerTitle') }}</strong>
        {{ $t('group.elevation.offerBody') }}
      </p>
      <input
        v-model="reason"
        type="text"
        :placeholder="$t('group.elevation.reasonPlaceholder')"
        :disabled="working"
        data-test="elevation-reason"
      />
      <os-button variant="primary" :disabled="working" data-test="elevation-start" @click="start">
        {{ $t('group.elevation.start') }}
      </os-button>
    </template>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { elevateInGroupMutation, endGroupElevationMutation } from '~/graphql/groupRoles.js'

export default {
  name: 'GroupElevation',
  components: { OsButton, OsCard },
  props: {
    /** The group as the page already has it: `myGroupElevation` and `mayElevateInGroup`. */
    group: { type: Object, default: null },
  },
  data() {
    return { reason: '', working: false }
  },
  computed: {
    elevation() {
      return this.group?.myGroupElevation ?? null
    },
    mayElevate() {
      return this.group?.mayElevateInGroup === true
    },
    expiresAt() {
      const at = this.elevation?.expiresAt
      if (!at) return ''
      // Only the time of day: the window is an hour, so the date would say nothing.
      return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    },
  },
  methods: {
    async start() {
      await this.run(elevateInGroupMutation(), {
        groupId: this.group.id,
        reason: this.reason || null,
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
        this.$toast.error(error.message)
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

.elevation__active,
.elevation__offer {
  flex: 1 1 20rem;
  margin: 0;
}
</style>

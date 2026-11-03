// Watches the audio of every remote participant and repairs a single
// subscription that went silent on us while everyone else still hears it.
//
// The server tells us who is speaking — it measures that on the speaker's
// upload, independent of what reaches us. Someone the server hears speaking,
// whose microphone is subscribed and not muted, but whose audio delivers no
// new bytes or no sound here, is lost somewhere between the server and our
// speakers. Observed in the field for 1–2 minutes at a time, for one listener
// and one speaker, while video and all other audio kept running.

// How often the audio of the speakers is looked at.
export const AUDIO_WATCH_INTERVAL_MS = 2000
// Checks in a row a speaker must stay inaudible before we act. The speaker list
// lags the audio a little, so a single silent window right as someone starts
// talking proves nothing; three of them (~6 s) do.
export const AUDIO_STALL_CHECKS = 3
// After a repair a speaker is left alone this long, so a cause the repair does
// not cure cannot keep us resubscribing in a loop.
export const AUDIO_HEAL_COOLDOWN_MS = 30000
// Gap between dropping and taking up the subscription again, so the server
// tears the old forwarding down before it sets up the new one.
export const AUDIO_RESUBSCRIBE_DELAY_MS = 500
// Decoded audio energy per check below which a speaker counts as inaudible.
// Speech, even quiet, lands orders of magnitude above; concealment of missing
// packets fades to (near) digital silence below it.
export const AUDIO_SILENT_ENERGY = 1e-6

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// A counter the browser does not report says nothing — taking it for zero
// would make every speaker look silent and get them resubscribed in a loop.
const counter = (value) => (typeof value === 'number' ? value : null)

export function createAudioWatchdog({ room, Track, isPaused = () => false, logger = console }) {
  // identity -> { track, bytes, energy, stalls }
  const watched = new Map()
  // identity -> time of the last repair. Kept apart from the counters, which a
  // repair itself resets (unsubscribed for a moment, then a new track) — the
  // cooldown has to outlast exactly that.
  const healedAt = new Map()
  let timer = null
  let running = false
  let stopped = false

  const micPublication = (participant) => {
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.source === Track.Source.Microphone) return pub
    }
    return null
  }

  const replayPausedElements = (track) => {
    // An <audio> element that stopped on its own plays nothing even though the
    // track keeps delivering. Only worth a try while the browser lets the page
    // play — otherwise the autoplay notice is the way back.
    if (!room.canPlaybackAudio) return
    for (const el of track.attachedElements || []) {
      if (el.paused) el.play().catch(() => {})
    }
  }

  const heal = async (participant, pub, cause, stats) => {
    logger.warn(
      `[video-call] audio of ${participant.identity} does not reach us (${cause}), resubscribing`,
      stats,
    )
    // Unsubscribing and subscribing again gets us a fresh forwarding on the
    // server and a fresh receiver (jitter buffer included) in the browser — the
    // two places left once speaker, network and our output are known to work.
    pub.setSubscribed(false)
    await wait(AUDIO_RESUBSCRIBE_DELAY_MS)
    if (stopped) return
    // The participant may have left, or unpublished, meanwhile.
    if (room.remoteParticipants.get(participant.identity) !== participant) return
    if (micPublication(participant) !== pub) return
    pub.setSubscribed(true)
  }

  const check = async (participant, now) => {
    const pub = micPublication(participant)
    const track = pub && pub.track
    if (!track || !pub.isSubscribed || pub.isMuted) {
      watched.delete(participant.identity)
      return
    }
    replayPausedElements(track)
    let stats
    try {
      stats = await track.getReceiverStats()
    } catch (_e) {
      stats = null
    }
    if (!stats) return
    const prev = watched.get(participant.identity)
    const entry = {
      track,
      bytes: counter(stats.bytesReceived),
      energy: counter(stats.totalAudioEnergy),
      stalls: 0,
    }
    watched.set(participant.identity, entry)
    // A new track (resubscribed, republished) starts its counters at zero.
    if (!prev || prev.track !== track || !participant.isSpeaking) return

    const noBytes = entry.bytes !== null && prev.bytes !== null && entry.bytes <= prev.bytes
    const silent =
      entry.energy !== null &&
      prev.energy !== null &&
      entry.energy - prev.energy < AUDIO_SILENT_ENERGY
    if (!noBytes && !silent) return
    entry.stalls = prev.stalls + 1
    if (entry.stalls < AUDIO_STALL_CHECKS) return
    const lastHeal = healedAt.get(participant.identity)
    if (lastHeal !== undefined && now - lastHeal < AUDIO_HEAL_COOLDOWN_MS) return
    entry.stalls = 0
    healedAt.set(participant.identity, now)
    // The cause goes along with the log line: no bytes means the server stopped
    // forwarding, bytes without sound means the browser drops what it gets.
    // Not awaited: the other speakers' checks need not wait for this repair.
    heal(participant, pub, noBytes ? 'no-packets' : 'no-sound', stats)
  }

  const tick = async () => {
    // getStats() is asynchronous; a slow one must not overlap the next tick.
    if (running || stopped || isPaused()) return
    running = true
    try {
      const now = Date.now()
      const present = new Set()
      for (const participant of room.remoteParticipants.values()) {
        present.add(participant.identity)
        await check(participant, now)
        if (stopped) return
      }
      for (const map of [watched, healedAt]) {
        for (const identity of map.keys()) {
          if (!present.has(identity)) map.delete(identity)
        }
      }
    } finally {
      running = false
    }
  }

  return {
    tick,
    start() {
      if (timer || stopped) return
      timer = setInterval(tick, AUDIO_WATCH_INTERVAL_MS)
    },
    stop() {
      stopped = true
      if (timer) clearInterval(timer)
      timer = null
      watched.clear()
      healedAt.clear()
    },
  }
}

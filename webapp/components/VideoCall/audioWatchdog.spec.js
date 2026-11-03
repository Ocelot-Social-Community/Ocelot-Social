import {
  createAudioWatchdog,
  AUDIO_WATCH_INTERVAL_MS,
  AUDIO_STALL_CHECKS,
  AUDIO_HEAL_COOLDOWN_MS,
  AUDIO_RESUBSCRIBE_DELAY_MS,
} from './audioWatchdog'

const Track = { Source: { Microphone: 'microphone', ScreenShare: 'screen_share_audio' } }

// A remote audio track whose receiver stats tests advance by hand.
const audioTrack = () => {
  const track = {
    stats: { bytesReceived: 0, totalAudioEnergy: 0 },
    attachedElements: [],
    getReceiverStats: jest.fn(async () => ({ ...track.stats })),
  }
  return track
}

const micPublication = (track = audioTrack()) => ({
  source: Track.Source.Microphone,
  track,
  isSubscribed: true,
  isMuted: false,
  setSubscribed: jest.fn(),
})

const participant = (identity, pubs) => ({
  identity,
  isSpeaking: true,
  audioTrackPublications: new Map(pubs.map((pub, i) => [`${identity}-${i}`, pub])),
})

const roomWith = (...participants) => ({
  canPlaybackAudio: true,
  remoteParticipants: new Map(participants.map((p) => [p.identity, p])),
})

const setup = (opts = {}) => {
  const pub = opts.pub || micPublication()
  const bob = participant('bob', [pub])
  const room = roomWith(bob)
  const logger = { warn: jest.fn() }
  const watchdog = createAudioWatchdog({ room, Track, logger, isPaused: opts.isPaused })
  return { pub, track: pub.track, bob, room, logger, watchdog }
}

// The first check only takes a baseline; every further one compares with it.
const stalledChecks = async (watchdog, n = AUDIO_STALL_CHECKS) => {
  for (let i = 0; i <= n; i++) await watchdog.tick()
}

const flushResubscribe = async () => {
  jest.advanceTimersByTime(AUDIO_RESUBSCRIBE_DELAY_MS)
  await Promise.resolve()
  await Promise.resolve()
}

describe('audioWatchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('a speaker whose audio keeps arriving', () => {
    it('is left alone', async () => {
      const { watchdog, track, pub } = setup()
      for (let i = 0; i < AUDIO_STALL_CHECKS * 2; i++) {
        track.stats.bytesReceived += 5000
        track.stats.totalAudioEnergy += 0.01
        await watchdog.tick()
      }
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })
  })

  describe('a speaker whose bytes stop arriving', () => {
    it('is resubscribed after the stall checks', async () => {
      const { watchdog, pub, logger } = setup()
      await stalledChecks(watchdog)
      expect(pub.setSubscribed).toHaveBeenCalledWith(false)
      expect(pub.setSubscribed).not.toHaveBeenCalledWith(true)
      await flushResubscribe()
      expect(pub.setSubscribed).toHaveBeenLastCalledWith(true)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('bob does not reach us (no-packets)'),
        expect.any(Object),
      )
    })

    it('is not resubscribed one check too early', async () => {
      const { watchdog, pub } = setup()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 1)
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })
  })

  describe('a speaker whose bytes arrive but stay silent', () => {
    it('is resubscribed, reported as no-sound', async () => {
      const { watchdog, track, pub, logger } = setup()
      for (let i = 0; i <= AUDIO_STALL_CHECKS; i++) {
        track.stats.bytesReceived += 5000
        await watchdog.tick()
      }
      expect(pub.setSubscribed).toHaveBeenCalledWith(false)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('(no-sound)'),
        expect.any(Object),
      )
    })
  })

  describe('stall checks that are not in a row', () => {
    it('start counting anew once audio comes through', async () => {
      const { watchdog, track, pub } = setup()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 1)
      track.stats.bytesReceived += 5000
      track.stats.totalAudioEnergy += 0.01
      await watchdog.tick()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 2)
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it('start counting anew when the speaker pauses', async () => {
      const { watchdog, bob, pub } = setup()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 1)
      bob.isSpeaking = false
      await watchdog.tick()
      bob.isSpeaking = true
      await watchdog.tick()
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })
  })

  describe('silence that is no stall', () => {
    it.each([
      ['not speaking', ({ bob }) => (bob.isSpeaking = false)],
      ['muted', ({ pub }) => (pub.isMuted = true)],
      ['not subscribed', ({ pub }) => (pub.isSubscribed = false)],
      ['without a track', ({ pub }) => (pub.track = null)],
    ])('is ignored while %s', async (_label, arrange) => {
      const ctx = setup()
      arrange(ctx)
      await stalledChecks(ctx.watchdog, AUDIO_STALL_CHECKS * 2)
      expect(ctx.pub.setSubscribed).not.toHaveBeenCalled()
    })

    it('is ignored for audio other than the microphone', async () => {
      const pub = { ...micPublication(), source: Track.Source.ScreenShare }
      const { watchdog } = setup({ pub })
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it('is ignored while paused', async () => {
      const { watchdog, track, pub } = setup({ isPaused: () => true })
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(track.getReceiverStats).not.toHaveBeenCalled()
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it.each([
      ['no stats', async () => undefined],
      ['failing stats', async () => Promise.reject(new Error('closed'))],
    ])('is ignored with %s', async (_label, impl) => {
      const { watchdog, track, pub } = setup()
      track.getReceiverStats.mockImplementation(impl)
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it.each([
      ['bytes', 'bytesReceived'],
      ['audio energy', 'totalAudioEnergy'],
    ])('is not inferred from %s the browser does not report', async (_label, missing) => {
      const { watchdog, track, pub } = setup()
      track.getReceiverStats.mockImplementation(async () => {
        // The other counter keeps moving, so only the missing one could stall.
        const stats = { bytesReceived: (track.n = (track.n || 0) + 1) * 5000 }
        stats.totalAudioEnergy = track.n * 0.01
        delete stats[missing]
        return stats
      })
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it('starts over on a new track', async () => {
      const { watchdog, pub } = setup()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 1)
      pub.track = audioTrack()
      await watchdog.tick()
      await watchdog.tick()
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })

    it('starts over after the participant was gone', async () => {
      const { watchdog, room, bob, pub } = setup()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS - 1)
      room.remoteParticipants.delete('bob')
      await watchdog.tick()
      room.remoteParticipants.set('bob', bob)
      await watchdog.tick()
      await watchdog.tick()
      expect(pub.setSubscribed).not.toHaveBeenCalled()
    })
  })

  describe('after a repair', () => {
    it('waits out the cooldown before the next one', async () => {
      const { watchdog, pub } = setup()
      await stalledChecks(watchdog)
      await flushResubscribe()
      expect(pub.setSubscribed).toHaveBeenCalledTimes(2)
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(pub.setSubscribed).toHaveBeenCalledTimes(2)
      jest.setSystemTime(Date.now() + AUDIO_HEAL_COOLDOWN_MS)
      await watchdog.tick()
      expect(pub.setSubscribed).toHaveBeenCalledTimes(3)
    })

    it('keeps the cooldown across the moment the repair is unsubscribed', async () => {
      const { watchdog, pub } = setup()
      await stalledChecks(watchdog)
      pub.isSubscribed = false
      await watchdog.tick()
      await flushResubscribe()
      pub.isSubscribed = true
      await watchdog.tick()
      pub.track = audioTrack()
      await stalledChecks(watchdog, AUDIO_STALL_CHECKS * 2)
      expect(pub.setSubscribed).toHaveBeenCalledTimes(2)
    })

    it('forgets the cooldown once the participant left', async () => {
      const { watchdog, room, bob, pub } = setup()
      await stalledChecks(watchdog)
      await flushResubscribe()
      room.remoteParticipants.delete('bob')
      await watchdog.tick()
      room.remoteParticipants.set('bob', bob)
      await stalledChecks(watchdog)
      expect(pub.setSubscribed).toHaveBeenCalledTimes(3)
    })

    it('does not subscribe again when the participant left meanwhile', async () => {
      const { watchdog, room, pub } = setup()
      await stalledChecks(watchdog)
      room.remoteParticipants.delete('bob')
      await flushResubscribe()
      expect(pub.setSubscribed).toHaveBeenCalledTimes(1)
    })

    it('does not subscribe again when the microphone was unpublished meanwhile', async () => {
      const { watchdog, bob, pub } = setup()
      await stalledChecks(watchdog)
      bob.audioTrackPublications.clear()
      await flushResubscribe()
      expect(pub.setSubscribed).toHaveBeenCalledTimes(1)
    })

    it('does not subscribe again once stopped', async () => {
      const { watchdog, pub } = setup()
      await stalledChecks(watchdog)
      watchdog.stop()
      await flushResubscribe()
      expect(pub.setSubscribed).toHaveBeenCalledTimes(1)
    })
  })

  describe('paused audio elements', () => {
    const element = (paused) => ({ paused, play: jest.fn().mockResolvedValue() })

    it('are played again', async () => {
      const { watchdog, track } = setup()
      const stuck = element(true)
      const playing = element(false)
      track.attachedElements = [stuck, playing]
      await watchdog.tick()
      expect(stuck.play).toHaveBeenCalled()
      expect(playing.play).not.toHaveBeenCalled()
    })

    it('swallow a refused play()', async () => {
      const { watchdog, track } = setup()
      const stuck = { paused: true, play: jest.fn().mockRejectedValue(new Error('NotAllowed')) }
      track.attachedElements = [stuck]
      await expect(watchdog.tick()).resolves.toBeUndefined()
    })

    it('are left to the autoplay notice while playback is blocked', async () => {
      const { watchdog, track, room } = setup()
      room.canPlaybackAudio = false
      const stuck = element(true)
      track.attachedElements = [stuck]
      await watchdog.tick()
      expect(stuck.play).not.toHaveBeenCalled()
    })

    it('copes with a track that has none', async () => {
      const { watchdog, track } = setup()
      track.attachedElements = undefined
      await expect(watchdog.tick()).resolves.toBeUndefined()
    })
  })

  describe('start / stop', () => {
    it('checks on every interval until stopped', async () => {
      const { watchdog, track } = setup()
      watchdog.start()
      watchdog.start()
      jest.advanceTimersByTime(AUDIO_WATCH_INTERVAL_MS)
      await Promise.resolve()
      expect(track.getReceiverStats).toHaveBeenCalledTimes(1)
      watchdog.stop()
      jest.advanceTimersByTime(AUDIO_WATCH_INTERVAL_MS * 3)
      expect(track.getReceiverStats).toHaveBeenCalledTimes(1)
    })

    it('cannot be started again once stopped', () => {
      const { watchdog } = setup()
      watchdog.stop()
      watchdog.start()
      expect(jest.getTimerCount()).toBe(0)
    })

    it('does not overlap a check that is still running', async () => {
      const { watchdog, track } = setup()
      let release
      track.getReceiverStats.mockImplementationOnce(
        () => new Promise((resolve) => (release = resolve)),
      )
      const first = watchdog.tick()
      await watchdog.tick()
      expect(track.getReceiverStats).toHaveBeenCalledTimes(1)
      release({ bytesReceived: 0, totalAudioEnergy: 0 })
      await first
      await watchdog.tick()
      expect(track.getReceiverStats).toHaveBeenCalledTimes(2)
    })

    it('stops looking at further participants once stopped mid-check', async () => {
      const first = participant('bob', [micPublication()])
      const second = participant('carol', [micPublication()])
      const room = roomWith(first, second)
      const watchdog = createAudioWatchdog({ room, Track, logger: { warn: jest.fn() } })
      first.audioTrackPublications.values().next().value.track.getReceiverStats = jest.fn(
        async () => {
          watchdog.stop()
          return { bytesReceived: 0, totalAudioEnergy: 0 }
        },
      )
      await watchdog.tick()
      expect(
        second.audioTrackPublications.values().next().value.track.getReceiverStats,
      ).not.toHaveBeenCalled()
    })

    it('logs to the console by default', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const pub = micPublication()
      const room = roomWith(participant('bob', [pub]))
      const watchdog = createAudioWatchdog({ room, Track })
      await stalledChecks(watchdog)
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})

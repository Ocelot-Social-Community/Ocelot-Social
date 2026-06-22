import Vuex from 'vuex'
import { mount, createLocalVue } from '@vue/test-utils'
import VideoCall from './VideoCall.vue'

// connect() does `await import('livekit-client')` — mock it with a fake Room that
// records its event handlers (so tests can fire them) and resolves connect/disconnect.
jest.mock('livekit-client', () => {
  const RoomEvent = {
    ParticipantConnected: 'ParticipantConnected',
    ParticipantDisconnected: 'ParticipantDisconnected',
    TrackSubscribed: 'TrackSubscribed',
    TrackUnsubscribed: 'TrackUnsubscribed',
    TrackMuted: 'TrackMuted',
    TrackUnmuted: 'TrackUnmuted',
    ParticipantMetadataChanged: 'ParticipantMetadataChanged',
    ActiveSpeakersChanged: 'ActiveSpeakersChanged',
    LocalTrackPublished: 'LocalTrackPublished',
    LocalTrackUnpublished: 'LocalTrackUnpublished',
    Disconnected: 'Disconnected',
  }
  const Track = {
    Source: { Microphone: 'microphone', Camera: 'camera', ScreenShare: 'screen_share' },
  }
  const DisconnectReason = { CLIENT_INITIATED: 'CLIENT_INITIATED' }
  class Room {
    constructor(opts) {
      this.opts = opts
      this.handlers = {}
      this.localParticipant = {
        isScreenShareEnabled: false,
        isMicrophoneEnabled: true,
        isCameraEnabled: false,
        audioTrackPublications: new Map(),
        videoTrackPublications: new Map(),
        setMicrophoneEnabled: jest.fn().mockResolvedValue(),
        setCameraEnabled: jest.fn().mockResolvedValue(),
        setScreenShareEnabled: jest.fn().mockResolvedValue(),
      }
      this.remoteParticipants = new Map()
      this.connect = jest.fn().mockResolvedValue()
      this.disconnect = jest.fn().mockResolvedValue()
    }

    on(evt, cb) {
      this.handlers[evt] = cb
      return this
    }
  }
  return { __esModule: true, Room, RoomEvent, Track, DisconnectReason }
})

const localVue = createLocalVue()
localVue.use(Vuex)

const Stub = (name, opts = {}) => ({
  name,
  props: opts.props || [],
  template: opts.template || `<div class="stub-${name.toLowerCase()}"><slot /></div>`,
})

const stubs = {
  OsButton: Stub('OsButton', {
    template: '<button class="stub-button" @click="$emit(\'click\')"><slot /></button>',
  }),
  OsIcon: Stub('OsIcon'),
  ProfileAvatar: Stub('ProfileAvatar'),
  PreJoin: Stub('PreJoin'),
  VideoTile: Stub('VideoTile'),
  Chat: Stub('Chat'),
  RoomTitleLink: Stub('RoomTitleLink'),
  ClientOnly: Stub('ClientOnly'),
}

const buildStore = (state = {}) => {
  const setMinimized = jest.fn()
  const close = jest.fn()
  const setStorePhase = jest.fn()
  const showChat = jest.fn()
  return {
    store: new Vuex.Store({
      getters: {
        'videoCall/showVideoCall': () => state.show ?? false,
        'videoCall/minimized': () => state.minimized ?? false,
        'videoCall/groupId': () => state.groupId ?? null,
        'videoCall/groupName': () => state.groupName ?? null,
        'videoCall/groupSlug': () => state.groupSlug ?? null,
        'videoCall/groupAvatar': () => state.groupAvatar ?? null,
        'chat/showChat': () => state.chat ?? { showChat: false, chatUserId: null, groupId: null },
        'auth/user': () => state.user ?? { id: 'u1', name: 'Alice', avatar: { url: 'a.png' } },
      },
      mutations: {
        'videoCall/SET_MINIMIZED': setMinimized,
        'videoCall/CLOSE': close,
        'videoCall/SET_PHASE': setStorePhase,
        'videoCall/SET_PARTICIPANT_COUNT': jest.fn(),
        'chat/SET_OPEN_CHAT': showChat,
      },
    }),
    setMinimized,
    close,
    setStorePhase,
  }
}

const factory = (state = {}) => {
  const built = buildStore(state)
  const $route = { name: state.routeName || 'groups-id-slug' }
  const $router = { push: jest.fn(), replace: jest.fn() }
  const wrapper = mount(VideoCall, {
    localVue,
    store: built.store,
    mocks: {
      $route,
      $router,
      $t: (k, vars) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
    },
    stubs,
  })
  return { wrapper, ...built }
}

describe('VideoCall', () => {
  describe('groupProfile', () => {
    it('reflects the active group from the store', () => {
      const { wrapper } = factory({
        show: true,
        groupId: 'g1',
        groupName: 'Yoga',
        groupSlug: 'yoga',
        groupAvatar: { url: 'a.png' },
      })
      expect(wrapper.vm.groupProfile).toEqual({
        id: 'g1',
        name: 'Yoga',
        avatar: { url: 'a.png' },
      })
    })

    it('falls back to slug when no name is set', () => {
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
      expect(wrapper.vm.groupProfile.name).toBe('yoga')
    })
  })

  describe('titleLabel', () => {
    it('uses prejoin headerTitle during prejoin', () => {
      const { wrapper } = factory({ show: true, groupName: 'Yoga' })
      wrapper.setData({ phase: 'prejoin' })
      expect(wrapper.vm.titleLabel).toContain('videoCall.prejoin.headerTitle')
    })

    it('returns just the group name otherwise', () => {
      const { wrapper } = factory({ show: true, groupName: 'Yoga' })
      wrapper.setData({ phase: 'in-call' })
      expect(wrapper.vm.titleLabel).toBe('Yoga')
    })

    it('falls back to videoCall.title when name is empty', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ phase: 'in-call' })
      expect(wrapper.vm.titleLabel).toBe('videoCall.title')
    })
  })

  describe('groupRoute', () => {
    it('returns null when id or slug missing', () => {
      const { wrapper } = factory({ show: true })
      expect(wrapper.vm.groupRoute).toBeNull()
    })

    it('returns the groups route when both are set', () => {
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
      expect(wrapper.vm.groupRoute).toEqual({
        name: 'groups-id-slug',
        params: { id: 'g1', slug: 'yoga' },
      })
    })
  })

  describe('modeClass / isFullscreen / isPreJoinModal', () => {
    it('reports modal during prejoin', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ phase: 'prejoin' })
      expect(wrapper.vm.isPreJoinModal).toBe(true)
      expect(wrapper.vm.modeClass).toBe('video-call--modal')
      expect(wrapper.vm.isFullscreen).toBe(false)
    })

    it('reports maximized when in-call and not minimized', () => {
      const { wrapper } = factory({ show: true, minimized: false })
      wrapper.setData({ phase: 'in-call' })
      expect(wrapper.vm.modeClass).toBe('video-call--maximized')
    })

    it('reports minimized when in-call and minimized', () => {
      const { wrapper } = factory({ show: true, minimized: true })
      wrapper.setData({ phase: 'in-call' })
      expect(wrapper.vm.modeClass).toBe('video-call--minimized')
    })
  })

  describe('uniqueParticipantCount + activeSpeakers + activeSpeakerSet', () => {
    it('counts distinct identities, not tiles', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({
        tiles: [
          { identity: 'u1', name: 'Alice', key: 'a' },
          { identity: 'u1', name: 'Alice', key: 'b' },
          { identity: 'u2', name: 'Bob', key: 'c' },
        ],
      })
      expect(wrapper.vm.uniqueParticipantCount).toBe(2)
    })

    it('dedupes active speakers and resolves names from tiles', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({
        tiles: [
          { identity: 'u1', name: 'Alice', key: 'a', isLocal: false },
          { identity: 'u2', name: 'Bob', key: 'b', isLocal: true },
        ],
        activeSpeakerIds: ['u1', 'u2', 'u1'],
      })
      const speakers = wrapper.vm.activeSpeakers
      expect(speakers.map((s) => s.identity)).toEqual(['u1', 'u2'])
      expect(wrapper.vm.activeSpeakerSet.has('u1')).toBe(true)
    })
  })

  describe('backToPrejoin', () => {
    it('clears the error and resets phase to prejoin', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ error: 'boom', phase: 'error' })
      wrapper.vm.backToPrejoin()
      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.phase).toBe('prejoin')
    })
  })

  describe('showDeviceErrorToast', () => {
    it('maps NotAllowedError to denied', () => {
      const $toast = { error: jest.fn() }
      const ctx = {
        $t: (k) => k,
        $toast,
      }
      VideoCall.methods.showDeviceErrorToast.call(ctx, 'mic', { name: 'NotAllowedError' })
      expect($toast.error).toHaveBeenCalledWith('videoCall.errors.mic.denied')
    })

    it.each([
      ['SecurityError', 'denied'],
      ['NotFoundError', 'noDevice'],
      ['OverconstrainedError', 'noDevice'],
      ['NotReadableError', 'busy'],
      ['SomethingWeird', 'generic'],
    ])('maps %s to the matching toast key', (name, key) => {
      const $toast = { error: jest.fn() }
      const ctx = { $t: (k) => k, $toast }
      VideoCall.methods.showDeviceErrorToast.call(ctx, 'camera', { name })
      expect($toast.error).toHaveBeenCalledWith(`videoCall.errors.camera.${key}`)
    })

    it('is a no-op when $toast.error is not a function', () => {
      const ctx = { $t: (k) => k, $toast: {} }
      expect(() =>
        VideoCall.methods.showDeviceErrorToast.call(ctx, 'mic', { name: 'NotAllowedError' }),
      ).not.toThrow()
    })
  })

  describe('toggleChat', () => {
    it('opens chat for this group when not yet open', () => {
      const setShowChat = jest.fn()
      const ctx = { chatOpenForThisGroup: false, groupId: 'g1', setShowChat }
      VideoCall.methods.toggleChat.call(ctx)
      expect(setShowChat).toHaveBeenCalledWith({
        showChat: true,
        chatUserId: null,
        groupId: 'g1',
      })
    })

    it('closes chat when already open for this group', () => {
      const setShowChat = jest.fn()
      const ctx = { chatOpenForThisGroup: true, groupId: 'g1', setShowChat }
      VideoCall.methods.toggleChat.call(ctx)
      expect(setShowChat).toHaveBeenCalledWith({
        showChat: false,
        chatUserId: null,
        groupId: null,
      })
    })

    it('closeInCallChat clears the open chat', () => {
      const setShowChat = jest.fn()
      VideoCall.methods.closeInCallChat.call({ setShowChat })
      expect(setShowChat).toHaveBeenCalledWith({
        showChat: false,
        chatUserId: null,
        groupId: null,
      })
    })
  })

  describe('tileAvatarSize', () => {
    it('returns small for non-spotlight tiles when a spotlight exists', () => {
      const ctx = { spotlightTile: { key: 'a' } }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('small')
    })

    it('returns large for the spotlight tile itself', () => {
      const ctx = { spotlightTile: { key: 'a' } }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'a' })).toBe('large')
    })

    it('returns large when no spotlight tile exists', () => {
      const ctx = { spotlightTile: null }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('large')
    })
  })

  describe('onTileSelect', () => {
    it('toggles the spotlight on the same tile', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ phase: 'in-call', spotlightKey: 'a' })
      const ctx = wrapper.vm
      ctx.onTileSelect({ key: 'a' })
      // Re-run via direct method to check toggle behavior off
      // (calling onTileSelect mutates spotlightKey)
      expect(ctx.spotlightKey).toBeNull()
    })

    it('sets a new spotlight when clicking a different tile', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ phase: 'in-call', spotlightKey: 'a' })
      wrapper.vm.onTileSelect({ key: 'b' })
      expect(wrapper.vm.spotlightKey).toBe('b')
    })

    it('is a no-op for falsy tile', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ phase: 'in-call', spotlightKey: 'a' })
      wrapper.vm.onTileSelect(null)
      expect(wrapper.vm.spotlightKey).toBe('a')
    })

    it('is a no-op when not fullscreen', () => {
      const { wrapper } = factory({ show: true, minimized: true })
      wrapper.setData({ phase: 'in-call', spotlightKey: 'a' })
      wrapper.vm.onTileSelect({ key: 'b' })
      expect(wrapper.vm.spotlightKey).toBe('a')
    })
  })

  describe('toggleMinimize', () => {
    it('flips minimized via the store and pushes the matching route', () => {
      const { wrapper, setMinimized } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      wrapper.vm.$router.push = jest.fn().mockResolvedValue()
      wrapper.vm.toggleMinimize()
      expect(setMinimized).toHaveBeenCalled()
      // Target route after toggle is groups-id-slug; differs from current.
      expect(wrapper.vm.$router.push).toHaveBeenCalled()
    })

    it('does not push when no groupId/groupSlug', () => {
      const { wrapper } = factory({ show: true })
      wrapper.vm.$router.push = jest.fn()
      wrapper.vm.toggleMinimize()
      expect(wrapper.vm.$router.push).not.toHaveBeenCalled()
    })

    it('swallows navigation rejection without breaking the store update', async () => {
      const { wrapper, setMinimized } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      const push = jest.fn().mockRejectedValue(new Error('aborted'))
      wrapper.vm.$router.push = push
      // Trigger the toggle and let the rejected push promise settle.
      const result = wrapper.vm.toggleMinimize()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      // 1. Store mutation ran — minimize state is updated despite the
      //    failed route push (so the UI doesn't lock up).
      expect(setMinimized).toHaveBeenCalled()
      // 2. The router.push was actually attempted.
      expect(push).toHaveBeenCalled()
      // 3. toggleMinimize is sync but kicks off an async .catch; the
      //    method itself returns undefined and must not reject.
      expect(result).toBeUndefined()
    })
  })

  describe('onGroupLinkClick', () => {
    it('is a callable no-op', () => {
      expect(() => VideoCall.methods.onGroupLinkClick()).not.toThrow()
    })
  })

  describe('onPreJoinReady', () => {
    it('captures the device payload and triggers connect', async () => {
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
      wrapper.setData({ phase: 'prejoin' })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      wrapper.vm.$router.push = jest.fn().mockResolvedValue()
      wrapper.vm.$route.name = 'groups-id-slug'
      await wrapper.vm.onPreJoinReady({
        cameraDeviceId: 'cam-1',
        micDeviceId: 'mic-1',
        speakerDeviceId: 'spk-1',
        micEnabled: true,
        cameraEnabled: true,
      })
      expect(wrapper.vm.cameraDeviceId).toBe('cam-1')
      expect(wrapper.vm.micDeviceId).toBe('mic-1')
      expect(wrapper.vm.speakerDeviceId).toBe('spk-1')
      expect(wrapper.vm.phase).toBe('connecting')
      expect(wrapper.vm.connect).toHaveBeenCalled()
      expect(wrapper.vm.$router.push).toHaveBeenCalled()
    })

    it('swallows router push errors', async () => {
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
      wrapper.setData({ phase: 'prejoin' })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      wrapper.vm.$router.push = jest.fn().mockRejectedValue(new Error('aborted'))
      wrapper.vm.$route.name = 'groups-id-slug'
      await expect(
        wrapper.vm.onPreJoinReady({
          cameraDeviceId: null,
          micDeviceId: null,
          speakerDeviceId: null,
          micEnabled: false,
          cameraEnabled: false,
        }),
      ).resolves.toBeUndefined()
    })

    it('skips router push if already on the call route', async () => {
      const { wrapper } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      wrapper.setData({ phase: 'prejoin' })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      wrapper.vm.$router.push = jest.fn().mockResolvedValue()
      await wrapper.vm.onPreJoinReady({
        cameraDeviceId: null,
        micDeviceId: null,
        speakerDeviceId: null,
        micEnabled: true,
        cameraEnabled: true,
      })
      expect(wrapper.vm.$router.push).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('disconnects an active room and resets state', async () => {
      const { wrapper } = factory({ show: true })
      const room = { disconnect: jest.fn().mockResolvedValue() }
      wrapper.setData({
        room,
        tiles: [{}],
        activeSpeakerIds: ['x'],
        spotlightKey: 'a',
        micEnabled: false,
        cameraEnabled: false,
        screenShareEnabled: true,
      })
      wrapper.setData({ error: 'old error' })
      await wrapper.vm.cleanup()
      expect(room.disconnect).toHaveBeenCalled()
      expect(wrapper.vm.room).toBeNull()
      expect(wrapper.vm.tiles).toEqual([])
      expect(wrapper.vm.activeSpeakerIds).toEqual([])
      expect(wrapper.vm.spotlightKey).toBeNull()
      expect(wrapper.vm.micEnabled).toBe(true)
      expect(wrapper.vm.cameraEnabled).toBe(true)
      expect(wrapper.vm.screenShareEnabled).toBe(false)
      // cleanup() now parks the dialog in 'idle' instead of 'prejoin' so the
      // template can't briefly re-mount <pre-join> (which would re-acquire
      // camera/mic via initDevices() right after we just stopped them).
      // The show watcher sets phase back to 'prejoin' on the next open.
      expect(wrapper.vm.phase).toBe('idle')
      expect(wrapper.vm.error).toBeNull()
    })

    it('is safe when no room exists', async () => {
      const { wrapper } = factory({ show: true })
      await expect(wrapper.vm.cleanup()).resolves.toBeUndefined()
    })

    it('swallows disconnect errors', async () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ room: { disconnect: jest.fn().mockRejectedValue(new Error('boom')) } })
      await expect(wrapper.vm.cleanup()).resolves.toBeUndefined()
    })
  })

  describe('leave', () => {
    it('navigates away from the call route, cleans up and closes', async () => {
      const { wrapper, close } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      wrapper.vm.$router.replace = jest.fn().mockResolvedValue()
      wrapper.vm.cleanup = jest.fn().mockResolvedValue()
      await wrapper.vm.leave()
      expect(wrapper.vm.$router.replace).toHaveBeenCalled()
      expect(wrapper.vm.cleanup).toHaveBeenCalled()
      expect(close).toHaveBeenCalled()
    })

    it('skips navigation when not on the call route', async () => {
      const { wrapper } = factory({ show: true, routeName: 'groups-id-slug' })
      wrapper.vm.$router.replace = jest.fn().mockResolvedValue()
      wrapper.vm.cleanup = jest.fn().mockResolvedValue()
      await wrapper.vm.leave()
      expect(wrapper.vm.$router.replace).not.toHaveBeenCalled()
    })

    it('swallows navigation rejection', async () => {
      const { wrapper } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      wrapper.vm.$router.replace = jest.fn().mockRejectedValue(new Error('aborted'))
      wrapper.vm.cleanup = jest.fn().mockResolvedValue()
      await expect(wrapper.vm.leave()).resolves.toBeUndefined()
    })
  })

  describe('retryConnect', () => {
    it('disconnects the existing room and calls connect', async () => {
      const { wrapper } = factory({ show: true })
      const disconnect = jest.fn().mockResolvedValue()
      wrapper.setData({ room: { disconnect }, error: 'boom' })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      await wrapper.vm.retryConnect()
      expect(disconnect).toHaveBeenCalled()
      expect(wrapper.vm.room).toBeNull()
      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.connect).toHaveBeenCalled()
    })

    it('swallows disconnect errors', async () => {
      const { wrapper } = factory({ show: true })
      const disconnect = jest.fn().mockRejectedValue(new Error('boom'))
      wrapper.setData({ room: { disconnect } })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      await expect(wrapper.vm.retryConnect()).resolves.toBeUndefined()
    })

    it('works when no room is set', async () => {
      const { wrapper } = factory({ show: true })
      wrapper.vm.connect = jest.fn().mockResolvedValue()
      await wrapper.vm.retryConnect()
      expect(wrapper.vm.connect).toHaveBeenCalled()
    })
  })

  describe('toggle mic/camera/screen', () => {
    const buildRoom = (overrides = {}) => ({
      localParticipant: {
        isMicrophoneEnabled: overrides.isMicrophoneEnabled ?? true,
        isCameraEnabled: overrides.isCameraEnabled ?? true,
        isScreenShareEnabled: overrides.isScreenShareEnabled ?? false,
        setMicrophoneEnabled: jest.fn().mockResolvedValue(),
        setCameraEnabled: jest.fn().mockResolvedValue(),
        setScreenShareEnabled: jest.fn().mockResolvedValue(),
      },
    })

    it('toggleMic is a no-op when no room', async () => {
      const { wrapper } = factory({ show: true })
      await expect(wrapper.vm.toggleMic()).resolves.toBeUndefined()
    })

    it('toggleMic flips micEnabled on success', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom({ isMicrophoneEnabled: false })
      wrapper.setData({ room, micEnabled: true })
      await wrapper.vm.toggleMic()
      expect(wrapper.vm.micEnabled).toBe(false)
    })

    it('toggleMic re-syncs micEnabled from the participant on failure', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom({ isMicrophoneEnabled: true })
      room.localParticipant.setMicrophoneEnabled = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error(), { name: 'NotAllowedError' }))
      wrapper.setData({ room, micEnabled: true })
      await wrapper.vm.toggleMic()
      expect(wrapper.vm.micEnabled).toBe(true)
    })

    it('toggleCamera flips cameraEnabled on success', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom({ isCameraEnabled: false })
      wrapper.setData({ room, cameraEnabled: true })
      wrapper.vm.refreshTiles = jest.fn()
      await wrapper.vm.toggleCamera()
      expect(wrapper.vm.cameraEnabled).toBe(false)
    })

    it('toggleCamera re-syncs cameraEnabled from the participant on failure', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom({ isCameraEnabled: true })
      room.localParticipant.setCameraEnabled = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error(), { name: 'NotReadableError' }))
      wrapper.setData({ room, cameraEnabled: true })
      wrapper.vm.refreshTiles = jest.fn()
      await wrapper.vm.toggleCamera()
      expect(wrapper.vm.cameraEnabled).toBe(true)
    })

    it('toggleScreenShare is a no-op without screenShareSupported', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom()
      wrapper.setData({ room })
      // screenShareSupported is computed; force its falsy state by leaving
      // navigator.mediaDevices.getDisplayMedia unset.
      const originalDD = Object.getOwnPropertyDescriptor(global.navigator, 'mediaDevices')
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {},
        configurable: true,
      })
      await wrapper.vm.toggleScreenShare()
      expect(room.localParticipant.setScreenShareEnabled).not.toHaveBeenCalled()
      if (originalDD) Object.defineProperty(global.navigator, 'mediaDevices', originalDD)
    })

    it('toggleScreenShare swallows NotAllowedError silently and re-syncs state', async () => {
      const { wrapper } = factory({ show: true })
      const room = buildRoom({ isScreenShareEnabled: false })
      const setScreenShareEnabled = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error(), { name: 'NotAllowedError' }))
      room.localParticipant.setScreenShareEnabled = setScreenShareEnabled
      const $toast = { error: jest.fn() }
      // Pin a $toast on the instance so we can assert it was *not* called
      // for the user-dismissed-picker case. The factory's default mocks
      // don't include $toast.
      wrapper.vm.$toast = $toast
      // Force the `screenShareSupported` computed to truthy via the env probe.
      const originalDD = Object.getOwnPropertyDescriptor(global.navigator, 'mediaDevices')
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getDisplayMedia: jest.fn() },
        configurable: true,
      })
      wrapper.setData({ room, screenShareEnabled: false })
      const refreshTiles = jest.fn()
      wrapper.vm.refreshTiles = refreshTiles
      try {
        await wrapper.vm.toggleScreenShare()
        // 1. The toggle attempt was actually issued against LiveKit.
        expect(setScreenShareEnabled).toHaveBeenCalledWith(true, { audio: true })
        // 2. NotAllowedError means the user dismissed the OS picker —
        //    no toast should fire.
        expect($toast.error).not.toHaveBeenCalled()
        // 3. State is re-synced from the participant (still false) instead
        //    of the optimistic `next=true`.
        expect(wrapper.vm.screenShareEnabled).toBe(false)
        // 4. Tiles are refreshed so the avatar fallback can re-render.
        expect(refreshTiles).toHaveBeenCalled()
      } finally {
        if (originalDD) Object.defineProperty(global.navigator, 'mediaDevices', originalDD)
      }
    })
  })

  describe('refreshTiles minimal', () => {
    it('returns early when no room is set', () => {
      const { wrapper } = factory({ show: true })
      wrapper.setData({ tiles: [{ key: 'x' }] })
      wrapper.vm.refreshTiles()
      // Early return — tiles remain untouched.
      expect(wrapper.vm.tiles).toEqual([{ key: 'x' }])
    })
  })

  describe('store-driven phase mirror', () => {
    it('syncs the local phase to the store via SET_PHASE', () => {
      const { wrapper, setStorePhase } = factory({ show: true })
      setStorePhase.mockClear()
      wrapper.setData({ phase: 'connecting' })
      return wrapper.vm.$nextTick().then(() => {
        expect(setStorePhase).toHaveBeenCalled()
        const arg = setStorePhase.mock.calls[setStorePhase.mock.calls.length - 1][1]
        expect(arg).toBe('connecting')
      })
    })
  })

  describe('connect (livekit handshake)', () => {
    const withApollo = (wrapper, payload = { url: 'ws://lk', token: 'tok' }) => {
      wrapper.vm.$apollo = {
        mutate: jest.fn().mockResolvedValue({ data: { joinGroupVideoCall: payload } }),
      }
    }

    it('joins the room, enables devices and wires event handlers', async () => {
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      await wrapper.vm.connect()
      expect(wrapper.vm.phase).toBe('in-call')
      const room = wrapper.vm.room
      expect(room.connect).toHaveBeenCalled()
      expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true)
      expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true)
      expect(() => room.handlers.ParticipantConnected()).not.toThrow()
      room.localParticipant.isScreenShareEnabled = true
      room.handlers.LocalTrackPublished()
      expect(wrapper.vm.screenShareEnabled).toBe(true)
      room.localParticipant.isScreenShareEnabled = false
      room.handlers.LocalTrackUnpublished()
      expect(wrapper.vm.screenShareEnabled).toBe(false)
    })

    it('throttles active-speaker updates', () => {
      jest.useFakeTimers()
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      return wrapper.vm.connect().then(() => {
        const room = wrapper.vm.room
        room.handlers.ActiveSpeakersChanged([{ identity: 'a' }, { identity: 'b' }])
        jest.advanceTimersByTime(200)
        expect(wrapper.vm.activeSpeakerIds).toEqual(['a', 'b'])
        // Identical set within the next window is a no-op.
        room.handlers.ActiveSpeakersChanged([{ identity: 'a' }, { identity: 'b' }])
        jest.advanceTimersByTime(200)
        expect(wrapper.vm.activeSpeakerIds).toEqual(['a', 'b'])
        jest.useRealTimers()
      })
    })

    it('routes a server-side disconnect through leave(), ignoring our own disconnect', async () => {
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      await wrapper.vm.connect()
      const room = wrapper.vm.room
      const leave = jest.spyOn(wrapper.vm, 'leave').mockResolvedValue()
      room.handlers.Disconnected('CLIENT_INITIATED')
      expect(leave).not.toHaveBeenCalled()
      room.handlers.Disconnected('SERVER_SHUTDOWN')
      expect(leave).toHaveBeenCalled()
    })

    it('enters the error phase without a group id', async () => {
      const { wrapper } = factory({ show: false, groupId: null })
      withApollo(wrapper)
      await wrapper.vm.connect()
      expect(wrapper.vm.phase).toBe('error')
      expect(wrapper.vm.error).toBe('Missing group id')
    })

    it('enters the error phase when no token is returned', async () => {
      const { wrapper } = factory({ show: false, groupId: 'g1' })
      wrapper.vm.$apollo = { mutate: jest.fn().mockResolvedValue({ data: {} }) }
      await wrapper.vm.connect()
      expect(wrapper.vm.phase).toBe('error')
    })
  })

  describe('refreshTiles (full tile build)', () => {
    it('builds local + remote tiles and sanitises avatar metadata', () => {
      const { wrapper } = factory({ show: false })
      const Track = {
        Source: { Microphone: 'microphone', Camera: 'camera', ScreenShare: 'screen_share' },
      }
      const localP = {
        identity: 'u1',
        name: 'Alice',
        isCameraEnabled: true,
        isScreenShareEnabled: true,
        metadata: null,
        audioTrackPublications: new Map([['a', { source: 'microphone', track: { id: 'at' } }]]),
        videoTrackPublications: new Map([
          ['c', { source: 'camera', track: { id: 'ct' } }],
          ['s', { source: 'screen_share', track: { id: 'st' } }],
        ]),
      }
      const remote = (identity, metadata) => ({
        identity,
        name: identity,
        isCameraEnabled: false,
        isScreenShareEnabled: false,
        metadata,
        audioTrackPublications: new Map(),
        videoTrackPublications: new Map(),
      })
      wrapper.vm.Track = Track
      wrapper.vm.room = {
        localParticipant: localP,
        remoteParticipants: new Map([
          ['r1', remote('r1', JSON.stringify({ userId: 'bob', avatarUrl: 'https://x.org/a.png' }))],
          ['r2', remote('r2', '{not json')],
          ['r3', remote('r3', JSON.stringify({ avatarUrl: 'javascript:alert(1)' }))],
          ['r4', remote('r4', JSON.stringify({ avatarUrl: 'http://[' }))],
        ]),
      }
      wrapper.vm.refreshTiles()
      const tiles = wrapper.vm.tiles
      expect(tiles.filter((t) => t.isLocal && !t.isScreen)).toHaveLength(1)
      expect(tiles.filter((t) => t.isLocal && t.isScreen)).toHaveLength(1)
      expect(tiles.filter((t) => !t.isLocal)).toHaveLength(4)
      expect(tiles.find((t) => t.identity === 'r1').profile.avatar.url).toBe('https://x.org/a.png')
      expect(tiles.find((t) => t.identity === 'r3').profile.avatar).toBeNull()
      expect(tiles.find((t) => t.identity === 'r4').profile.avatar).toBeNull()
    })
  })

  describe('cleanup (track teardown)', () => {
    it('stops local tracks (tolerating stop errors) and clears the speaker timer', async () => {
      const { wrapper } = factory({ show: false })
      const stop = jest.fn(() => {
        throw new Error('stop')
      })
      const mediaStop = jest.fn(() => {
        throw new Error('mstop')
      })
      const track = { stop, mediaStreamTrack: { stop: mediaStop } }
      const lp = {
        audioTrackPublications: new Map([['a', { track }]]),
        videoTrackPublications: new Map([['v', { track: null }]]),
      }
      wrapper.vm.room = { localParticipant: lp, disconnect: jest.fn().mockResolvedValue() }
      wrapper.vm._activeSpeakersTimer = 123
      const clearSpy = jest.spyOn(global, 'clearTimeout')
      await wrapper.vm.cleanup()
      expect(stop).toHaveBeenCalled()
      expect(mediaStop).toHaveBeenCalled()
      expect(clearSpy).toHaveBeenCalledWith(123)
      expect(wrapper.vm.room).toBeNull()
      clearSpy.mockRestore()
    })

    it('swallows errors while enumerating local tracks', async () => {
      const { wrapper } = factory({ show: false })
      wrapper.vm.room = {
        get localParticipant() {
          throw new Error('boom')
        },
        disconnect: jest.fn().mockResolvedValue(),
      }
      await expect(wrapper.vm.cleanup()).resolves.toBeUndefined()
      expect(wrapper.vm.room).toBeNull()
    })
  })

  describe('toggleScreenShare', () => {
    const enableScreenShare = () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getDisplayMedia: jest.fn() },
        configurable: true,
      })
    }
    const roomWith = (setScreenShareEnabled) => ({
      localParticipant: {
        setScreenShareEnabled,
        isScreenShareEnabled: false,
        isCameraEnabled: false,
        audioTrackPublications: new Map(),
        videoTrackPublications: new Map(),
      },
      remoteParticipants: new Map(),
    })

    it('enables screen share and refreshes tiles', async () => {
      enableScreenShare()
      const { wrapper } = factory({ show: false })
      const setScreenShareEnabled = jest.fn().mockResolvedValue()
      wrapper.vm.room = roomWith(setScreenShareEnabled)
      wrapper.setData({ screenShareEnabled: false })
      await wrapper.vm.toggleScreenShare()
      expect(setScreenShareEnabled).toHaveBeenCalledWith(true, { audio: true })
      expect(wrapper.vm.screenShareEnabled).toBe(true)
    })

    it('surfaces a toast on a non-cancel screen-share error', async () => {
      enableScreenShare()
      const { wrapper } = factory({ show: false })
      const err = Object.assign(new Error('x'), { name: 'NotReadableError' })
      wrapper.vm.room = roomWith(jest.fn().mockRejectedValue(err))
      wrapper.vm.$toast = { error: jest.fn() }
      await wrapper.vm.toggleScreenShare()
      expect(wrapper.vm.$toast.error).toHaveBeenCalled()
    })

    it('stays silent when the user cancels the picker', async () => {
      enableScreenShare()
      const { wrapper } = factory({ show: false })
      const err = Object.assign(new Error('x'), { name: 'NotAllowedError' })
      wrapper.vm.room = roomWith(jest.fn().mockRejectedValue(err))
      wrapper.vm.$toast = { error: jest.fn() }
      await wrapper.vm.toggleScreenShare()
      expect(wrapper.vm.$toast.error).not.toHaveBeenCalled()
    })
  })

  describe('primaryTile', () => {
    it('prioritises screen share, then remote camera, then any remote, then the first tile', () => {
      const { wrapper } = factory({ show: false })
      expect(wrapper.vm.primaryTile).toBeNull()
      wrapper.setData({ tiles: [{ key: 'a', isLocal: true, isScreen: false, videoTrack: null }] })
      expect(wrapper.vm.primaryTile.key).toBe('a')
      wrapper.setData({
        tiles: [
          { key: 'local', isLocal: true, isScreen: false, videoTrack: null },
          { key: 'remote', isLocal: false, isScreen: false, videoTrack: null },
        ],
      })
      expect(wrapper.vm.primaryTile.key).toBe('remote')
      wrapper.setData({
        tiles: [
          { key: 'local', isLocal: true, isScreen: false, videoTrack: null },
          { key: 'rcam', isLocal: false, isScreen: false, videoTrack: {} },
        ],
      })
      expect(wrapper.vm.primaryTile.key).toBe('rcam')
      wrapper.setData({
        tiles: [
          { key: 'screen', isLocal: true, isScreen: true, videoTrack: {} },
          { key: 'rcam', isLocal: false, isScreen: false, videoTrack: {} },
        ],
      })
      expect(wrapper.vm.primaryTile.key).toBe('screen')
    })
  })

  describe('watchers', () => {
    it('tears down when show flips from open to closed', () => {
      const { wrapper } = factory({ show: false })
      const cleanup = jest.spyOn(wrapper.vm, 'cleanup').mockResolvedValue()
      wrapper.vm.$options.watch.show.handler.call(wrapper.vm, false, true)
      expect(cleanup).toHaveBeenCalled()
    })

    it('$route watcher minimises / maximises with the call URL', () => {
      const min = factory({ show: true, minimized: true })
      min.wrapper.setData({ phase: 'in-call' })
      min.wrapper.vm.$options.watch.$route.call(min.wrapper.vm, { name: 'call-id-slug' })
      // Mutation handler receives (state, payload) — assert the payload.
      expect(min.setMinimized.mock.calls[0][1]).toBe(false)

      const max = factory({ show: true, minimized: false })
      max.wrapper.setData({ phase: 'in-call' })
      max.wrapper.vm.$options.watch.$route.call(max.wrapper.vm, { name: 'groups-id-slug' })
      expect(max.setMinimized.mock.calls[0][1]).toBe(true)
    })

    it('$route watcher ignores changes outside an active call', () => {
      const { wrapper, setMinimized } = factory({ show: false })
      wrapper.vm.$options.watch.$route.call(wrapper.vm, { name: 'call-id-slug' })
      expect(setMinimized).not.toHaveBeenCalled()
    })
  })

  describe('beforeDestroy', () => {
    it('runs cleanup on destroy', () => {
      const { wrapper } = factory({ show: false })
      const cleanup = jest.spyOn(wrapper.vm, 'cleanup').mockResolvedValue()
      wrapper.destroy()
      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('computed edge cases', () => {
    it('chatOpenForThisGroup matches the active group chat', () => {
      const { wrapper } = factory({
        show: true,
        groupId: 'g1',
        chat: { showChat: true, chatUserId: null, groupId: 'g1' },
      })
      expect(wrapper.vm.chatOpenForThisGroup).toBe(true)
    })

    it('onCallRoute reflects the call route name', () => {
      expect(factory({ show: true, routeName: 'call-id-slug' }).wrapper.vm.onCallRoute).toBe(true)
      expect(factory({ show: true, routeName: 'groups-id-slug' }).wrapper.vm.onCallRoute).toBe(
        false,
      )
    })
  })
})

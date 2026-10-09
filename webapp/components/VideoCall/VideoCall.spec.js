import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import { mount, createLocalVue } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import VideoCall from './VideoCall.vue'

// connect() does `await import('livekit-client')` — mock it with a fake Room that
// records its event handlers (so tests can fire them) and resolves connect/disconnect.
jest.mock('livekit-client', () => {
  const RoomEvent = {
    ParticipantConnected: 'ParticipantConnected',
    ParticipantDisconnected: 'ParticipantDisconnected',
    TrackSubscribed: 'TrackSubscribed',
    TrackUnsubscribed: 'TrackUnsubscribed',
    TrackUnpublished: 'TrackUnpublished',
    TrackMuted: 'TrackMuted',
    TrackUnmuted: 'TrackUnmuted',
    ParticipantMetadataChanged: 'ParticipantMetadataChanged',
    ActiveSpeakersChanged: 'ActiveSpeakersChanged',
    LocalTrackPublished: 'LocalTrackPublished',
    LocalTrackUnpublished: 'LocalTrackUnpublished',
    Disconnected: 'Disconnected',
    AudioPlaybackStatusChanged: 'AudioPlaybackStatusChanged',
    Reconnecting: 'Reconnecting',
    Reconnected: 'Reconnected',
    MediaDevicesChanged: 'MediaDevicesChanged',
    ActiveDeviceChanged: 'ActiveDeviceChanged',
    TrackPublished: 'TrackPublished',
    ConnectionQualityChanged: 'ConnectionQualityChanged',
  }
  const TrackEvent = {
    UpstreamPaused: 'upstreamPaused',
    UpstreamResumed: 'upstreamResumed',
    AudioSilenceDetected: 'audioSilenceDetected',
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
        getTrackPublication: jest.fn(),
      }
      // Tests flip the static to start a room whose audio is already blocked.
      this.canPlaybackAudio = Room.initialCanPlaybackAudio
      this.startAudio = jest.fn().mockResolvedValue()
      this.remoteParticipants = new Map()
      this.connect = jest.fn().mockResolvedValue()
      this.disconnect = jest.fn().mockResolvedValue()
      this.switchActiveDevice = jest.fn().mockResolvedValue(true)
    }

    on(evt, cb) {
      this.handlers[evt] = cb
      return this
    }
  }
  Room.initialCanPlaybackAudio = true
  return { __esModule: true, Room, RoomEvent, Track, TrackEvent, DisconnectReason }
})

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(VTooltip)

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
  AvatarImage: Stub('AvatarImage'),
  PreJoin: Stub('PreJoin'),
  DeviceSettings: Stub('DeviceSettings', { props: ['cameraStarting', 'micStarting'] }),
  VideoTile: Stub('VideoTile', { props: ['tile', 'cameraStarting', 'micStarting'] }),
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
      ...(state.apollo ? { $apollo: state.apollo } : {}),
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
    // A cell with room to spare for the 114px avatar plus its caption.
    const roomy = { width: 640, height: 360 }

    it('returns small for non-spotlight tiles when a spotlight exists', () => {
      const ctx = { spotlightTile: { key: 'a' }, cellSize: roomy }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('small')
    })

    it('returns large for the spotlight tile itself', () => {
      const ctx = { spotlightTile: { key: 'a' }, cellSize: roomy }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'a' })).toBe('large')
    })

    it('returns large when no spotlight tile exists', () => {
      const ctx = { spotlightTile: null, cellSize: roomy }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('large')
    })

    it('returns small in a cell too short for the large avatar', () => {
      const ctx = { spotlightTile: null, cellSize: { width: 640, height: 150 } }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('small')
    })

    it('returns small in a cell too narrow for the large avatar', () => {
      const ctx = { spotlightTile: null, cellSize: { width: 120, height: 360 } }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('small')
    })

    it('returns large while the stage is still unmeasured', () => {
      // No ResizeObserver / pre-paint: zero sizes must not be read as "tiny".
      const ctx = { spotlightTile: null, cellSize: { width: 0, height: 0 } }
      expect(VideoCall.methods.tileAvatarSize.call(ctx, { key: 'b' })).toBe('large')
    })
  })

  describe('gridDimensions', () => {
    const dimensions = (tileCount, stageWidth, stageHeight) =>
      VideoCall.computed.gridDimensions.call({
        tiles: Array.from({ length: tileCount }, (_, i) => ({ key: `t${i}` })),
        stageWidth,
        stageHeight,
      })

    it('falls back to a square-ish grid while the stage is unmeasured', () => {
      expect(dimensions(4, 0, 0)).toEqual({ columns: 2, rows: 2 })
      expect(dimensions(3, 0, 0)).toEqual({ columns: 2, rows: 2 })
    })

    it('puts two participants side by side on a wide stage', () => {
      expect(dimensions(2, 1600, 900)).toEqual({ columns: 2, rows: 1 })
    })

    it('stacks two participants on a tall, narrow stage', () => {
      // Phone in portrait: side by side would leave two slivers, and cover
      // would crop each face down to a vertical strip.
      expect(dimensions(2, 400, 700)).toEqual({ columns: 1, rows: 2 })
    })

    it('arranges four participants two by two on a wide stage', () => {
      expect(dimensions(4, 1600, 900)).toEqual({ columns: 2, rows: 2 })
    })

    it('gives three participants a 2x2 grid rather than one long row', () => {
      expect(dimensions(3, 1600, 900)).toEqual({ columns: 2, rows: 2 })
    })

    it('treats an empty tile list as a single cell', () => {
      expect(dimensions(0, 1600, 900)).toEqual({ columns: 1, rows: 1 })
    })
  })

  describe('cellSize / gridStyle', () => {
    it('reports nothing while the stage is unmeasured', () => {
      const ctx = { stageWidth: 0, stageHeight: 0 }
      expect(VideoCall.computed.cellSize.call(ctx)).toEqual({ width: 0, height: 0 })
    })

    it('gives the whole stage to the single tile of the parked window', () => {
      const ctx = { stageWidth: 355, stageHeight: 200, isFullscreen: false, spotlightTile: null }
      expect(VideoCall.computed.cellSize.call(ctx)).toEqual({ width: 355, height: 200 })
    })

    it('gives the whole stage to a spotlighted tile', () => {
      const ctx = {
        stageWidth: 1600,
        stageHeight: 900,
        isFullscreen: true,
        spotlightTile: { key: 'a' },
      }
      expect(VideoCall.computed.cellSize.call(ctx)).toEqual({ width: 1600, height: 900 })
    })

    it('divides the stage by the grid in the regular view', () => {
      const ctx = {
        stageWidth: 1600,
        stageHeight: 900,
        isFullscreen: true,
        spotlightTile: null,
        gridDimensions: { columns: 2, rows: 2 },
      }
      expect(VideoCall.computed.cellSize.call(ctx)).toEqual({ width: 800, height: 450 })
    })

    it('spells out rows as well as columns', () => {
      const style = VideoCall.computed.gridStyle.call({
        gridDimensions: { columns: 3, rows: 2 },
      })
      expect(style).toEqual({
        'grid-template-columns': 'repeat(3, 1fr)',
        // Without explicit rows the implicit ones size to content and the
        // tiles never share the stage height evenly.
        'grid-template-rows': 'repeat(2, 1fr)',
      })
    })
  })

  describe('stage measurement', () => {
    const withResizeObserver = () => {
      const observe = jest.fn()
      const disconnect = jest.fn()
      let trigger = null
      global.ResizeObserver = class {
        constructor(cb) {
          trigger = cb
          this.observe = observe
          this.disconnect = disconnect
        }
      }
      return { observe, disconnect, fire: () => trigger && trigger() }
    }

    afterEach(() => {
      delete global.ResizeObserver
    })

    it('measures the stage and re-measures on resize', () => {
      const { observe, fire } = withResizeObserver()
      const { wrapper } = factory({ show: true })
      const el = { clientWidth: 1600, clientHeight: 900 }
      wrapper.vm.$refs.stageEl = el
      wrapper.vm.observeStage()
      expect(observe).toHaveBeenCalledWith(el)
      expect(wrapper.vm.stageWidth).toBe(1600)

      // The chat sidebar opening narrows the stage without a window resize.
      el.clientWidth = 1200
      fire()
      expect(wrapper.vm.stageWidth).toBe(1200)
    })

    it('re-observes only when the element actually changed', () => {
      const { observe } = withResizeObserver()
      const { wrapper } = factory({ show: true })
      wrapper.vm.$refs.stageEl = { clientWidth: 800, clientHeight: 600 }
      wrapper.vm.observeStage()
      wrapper.vm.observeStage()
      // Guards against the observer's own updates re-entering through updated().
      expect(observe).toHaveBeenCalledTimes(1)
    })

    it('clears the measurements when the stage goes away', () => {
      const { disconnect } = withResizeObserver()
      const { wrapper } = factory({ show: true })
      wrapper.vm.$refs.stageEl = { clientWidth: 800, clientHeight: 600 }
      wrapper.vm.observeStage()
      wrapper.vm.$refs.stageEl = null
      wrapper.vm.observeStage()
      expect(disconnect).toHaveBeenCalled()
      expect(wrapper.vm.stageWidth).toBe(0)
      expect(wrapper.vm.stageHeight).toBe(0)
    })

    it('still measures once without ResizeObserver support', () => {
      const { wrapper } = factory({ show: true })
      wrapper.vm.$refs.stageEl = { clientWidth: 640, clientHeight: 480 }
      wrapper.vm.observeStage()
      expect(wrapper.vm.stageWidth).toBe(640)
      expect(wrapper.vm.stageHeight).toBe(480)
    })

    it('measureStage is a no-op without an observed element', () => {
      const { wrapper } = factory({ show: true })
      wrapper.vm.measureStage()
      expect(wrapper.vm.stageWidth).toBe(0)
    })

    it('treats missing client dimensions as zero', () => {
      const { wrapper } = factory({ show: true })
      wrapper.vm.$refs.stageEl = {}
      wrapper.vm.observeStage()
      expect(wrapper.vm.stageWidth).toBe(0)
    })
  })

  describe('button labels and tooltips', () => {
    it('names each control after its current effect', () => {
      const { wrapper } = factory({ show: true, groupId: 'g1' })
      wrapper.setData({ micEnabled: true, cameraEnabled: true, screenShareEnabled: false })
      expect(wrapper.vm.micLabel).toBe('videoCall.muteMic')
      expect(wrapper.vm.cameraLabel).toBe('videoCall.disableCamera')
      expect(wrapper.vm.screenShareLabel).toBe('videoCall.startScreenShare')
      expect(wrapper.vm.chatLabel).toBe('videoCall.openChat')
      expect(wrapper.vm.leaveLabel).toBe('videoCall.leave')

      wrapper.setData({ micEnabled: false, cameraEnabled: false, screenShareEnabled: true })
      expect(wrapper.vm.micLabel).toBe('videoCall.unmuteMic')
      expect(wrapper.vm.cameraLabel).toBe('videoCall.enableCamera')
      expect(wrapper.vm.screenShareLabel).toBe('videoCall.stopScreenShare')
    })

    it('labels the header buttons by call state', () => {
      const parked = factory({ show: true, minimized: true })
      expect(parked.wrapper.vm.minimizeLabel).toBe('videoCall.maximize')
      const open = factory({ show: true, minimized: false })
      expect(open.wrapper.vm.minimizeLabel).toBe('videoCall.minimize')

      open.wrapper.setData({ phase: 'in-call' })
      expect(open.wrapper.vm.closeLabel).toBe('videoCall.leave')
      open.wrapper.setData({ phase: 'prejoin' })
      expect(open.wrapper.vm.closeLabel).toBe('videoCall.prejoin.cancel')
    })

    it('shows the chat button as closing while that chat is open', () => {
      const { wrapper } = factory({
        show: true,
        groupId: 'g1',
        chat: { showChat: true, chatUserId: null, groupId: 'g1' },
      })
      expect(wrapper.vm.chatLabel).toBe('videoCall.closeChat')
    })

    it('tooltips only the buttons that lost their caption', () => {
      const { wrapper } = factory({ show: true, minimized: true })
      wrapper.setData({ phase: 'in-call' })
      expect(wrapper.vm.iconOnly).toBe(true)
      expect(wrapper.vm.iconOnlyTooltip('Mute')).toBe('Mute')

      const open = factory({ show: true, minimized: false })
      open.wrapper.setData({ phase: 'in-call' })
      // Caption is right there next to the icon — a tooltip would just repeat it.
      expect(open.wrapper.vm.iconOnlyTooltip('Mute')).toBe('')
    })
  })

  describe('device names on the buttons', () => {
    const DEVICES = [
      { kind: 'videoinput', deviceId: 'cam-1', label: 'Built-in camera' },
      { kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
      { kind: 'audioinput', deviceId: 'mic-2', label: 'Headset' },
      { kind: 'audiooutput', deviceId: 'spk-1', label: 'Built-in speaker' },
    ]
    const originalMediaDevices = Object.getOwnPropertyDescriptor(global.navigator, 'mediaDevices')
    const setMediaDevices = (value) =>
      Object.defineProperty(global.navigator, 'mediaDevices', { value, configurable: true })

    afterEach(() => {
      if (originalMediaDevices) {
        Object.defineProperty(global.navigator, 'mediaDevices', originalMediaDevices)
      } else {
        delete global.navigator.mediaDevices
      }
    })

    const inCall = (state = {}) => {
      const built = factory({ show: true, groupId: 'g1', ...state })
      built.wrapper.setData({ phase: 'in-call', knownDevices: DEVICES })
      return built
    }

    it('names the devices in use', () => {
      const { wrapper } = inCall()
      wrapper.setData({ cameraDeviceId: 'cam-2', micDeviceId: 'mic-2', speakerDeviceId: 'spk-1' })
      expect(wrapper.vm.deviceNames).toEqual({
        camera: 'Webcam',
        mic: 'Headset',
        speaker: 'Built-in speaker',
      })
    })

    it('reads an unknown device as the first of its kind, like the device settings do', () => {
      const { wrapper } = inCall()
      wrapper.setData({ cameraDeviceId: 'unplugged', micDeviceId: null })
      expect(wrapper.vm.deviceNames).toMatchObject({
        camera: 'Built-in camera',
        mic: 'Built-in microphone',
      })
    })

    it('has no names before the browser listed any device', () => {
      const { wrapper } = factory({ show: true })
      expect(wrapper.vm.deviceNames).toEqual({ camera: '', mic: '', speaker: '' })
      wrapper.setData({ knownDevices: [{ kind: 'videoinput', deviceId: 'cam-1', label: '' }] })
      expect(wrapper.vm.deviceNames.camera).toBe('')
    })

    it('shows the device alone next to a captioned button', () => {
      const { wrapper } = inCall()
      expect(wrapper.vm.deviceTooltip('Mute', ['Headset'])).toEqual({
        content: 'Headset',
        html: false,
        classes: 'tooltip--multiline',
      })
    })

    it('shows the caption and the device on a button that lost its caption', () => {
      const { wrapper } = inCall({ minimized: true })
      expect(wrapper.vm.deviceTooltip('Mute', ['Headset']).content).toBe('Mute\nHeadset')
      // Still the plain caption when there is no device to name.
      expect(wrapper.vm.deviceTooltip('Mute', ['']).content).toBe('Mute')
    })

    it('shows nothing when there is neither a caption to repeat nor a device to name', () => {
      const { wrapper } = inCall()
      expect(wrapper.vm.deviceTooltip('Mute', [''])).toBe('')
    })

    it('lists all devices in use on the device settings button', () => {
      const { wrapper } = inCall()
      wrapper.setData({ cameraDeviceId: 'cam-2', micDeviceId: 'mic-2' })
      expect(wrapper.vm.deviceSettingsTooltip.content).toBe(
        [
          'videoCall.prejoin.camera: Webcam',
          'videoCall.prejoin.microphone: Headset',
          'videoCall.prejoin.speaker: Built-in speaker',
        ].join('\n'),
      )
    })

    it('leaves out what has no name, and steps aside for the open panel', () => {
      const { wrapper } = inCall()
      wrapper.setData({ knownDevices: DEVICES.filter((d) => d.kind !== 'audiooutput') })
      expect(wrapper.vm.deviceSettingsTooltip.content).not.toContain('videoCall.prejoin.speaker')

      wrapper.setData({ showDeviceSettings: true })
      expect(wrapper.vm.deviceSettingsTooltip).toBe('')
    })

    describe('refreshKnownDevices', () => {
      it('takes over what the browser lists', async () => {
        setMediaDevices({ enumerateDevices: jest.fn().mockResolvedValue(DEVICES) })
        const { wrapper } = factory({ show: true })
        await wrapper.vm.refreshKnownDevices()
        expect(wrapper.vm.knownDevices).toEqual(DEVICES)
      })

      it('goes without names in a browser that cannot list devices, or fails to', async () => {
        const { wrapper } = factory({ show: true })
        setMediaDevices(undefined)
        await expect(wrapper.vm.refreshKnownDevices()).resolves.toBeUndefined()
        setMediaDevices({})
        await expect(wrapper.vm.refreshKnownDevices()).resolves.toBeUndefined()
        setMediaDevices({ enumerateDevices: jest.fn().mockRejectedValue(new Error('boom')) })
        await expect(wrapper.vm.refreshKnownDevices()).resolves.toBeUndefined()
        expect(wrapper.vm.knownDevices).toEqual([])
      })

      it('drops a list that arrives after the call ended', async () => {
        const { wrapper } = factory({ show: true })
        wrapper.setData({ room: { name: 'the call' } })
        setMediaDevices({
          enumerateDevices: jest.fn(async () => {
            wrapper.setData({ room: null })
            return DEVICES
          }),
        })
        await wrapper.vm.refreshKnownDevices()
        expect(wrapper.vm.knownDevices).toEqual([])
      })

      it('runs once the call is connected, and again when devices come or go', async () => {
        const enumerateDevices = jest.fn().mockResolvedValue(DEVICES)
        setMediaDevices({ enumerateDevices })
        const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
        wrapper.vm.$apollo = {
          mutate: jest.fn().mockResolvedValue({
            data: { joinGroupVideoCall: { url: 'ws://lk', token: 'tok' } },
          }),
        }
        await wrapper.vm.connect()
        await flushPromises()
        expect(wrapper.vm.knownDevices).toEqual(DEVICES)

        wrapper.vm.room.handlers.MediaDevicesChanged()
        expect(enumerateDevices).toHaveBeenCalledTimes(2)

        await wrapper.vm.cleanup()
        expect(wrapper.vm.knownDevices).toEqual([])
      })

      it('runs when a device is switched on during the call, not when it is switched off', async () => {
        const enumerateDevices = jest.fn().mockResolvedValue(DEVICES)
        setMediaDevices({ enumerateDevices })
        const { wrapper } = factory({ show: true })
        const room = {
          localParticipant: {
            isMicrophoneEnabled: true,
            isCameraEnabled: true,
            setMicrophoneEnabled: jest.fn().mockResolvedValue(),
            setCameraEnabled: jest.fn().mockResolvedValue(),
          },
        }
        wrapper.vm.refreshTiles = jest.fn()
        wrapper.setData({ room, micEnabled: true, cameraEnabled: true })
        await wrapper.vm.toggleMic()
        await wrapper.vm.toggleCamera()
        expect(enumerateDevices).not.toHaveBeenCalled()

        await wrapper.vm.toggleMic()
        await wrapper.vm.toggleCamera()
        expect(enumerateDevices).toHaveBeenCalledTimes(2)
      })
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

    it('does not park the window on its way out', async () => {
      const { wrapper, setMinimized } = factory({
        show: true,
        groupId: 'g1',
        groupSlug: 'yoga',
        routeName: 'call-id-slug',
      })
      wrapper.setData({ phase: 'in-call' })
      const navigatedTo = () =>
        wrapper.vm.$options.watch.$route.call(wrapper.vm, { name: 'groups-id-slug' })
      // The navigation of leave() reaches the route watcher while the call
      // is still up.
      wrapper.vm.$router.replace = jest.fn(async () => {
        await navigatedTo()
      })
      wrapper.vm.cleanup = jest.fn().mockResolvedValue()
      await wrapper.vm.leave()
      expect(setMinimized).not.toHaveBeenCalled()

      // Any other navigation away from the call parks it as before.
      await navigatedTo()
      expect(setMinimized).toHaveBeenCalled()
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

    it('rebuilds the tiles when a remote participant withdraws a track', async () => {
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      await wrapper.vm.connect()
      const room = wrapper.vm.room
      const refreshTiles = jest.spyOn(wrapper.vm, 'refreshTiles')
      // Ending a screen share is the visible case: without this the tile can
      // outlive its track and keep showing the last decoded frame.
      room.handlers.TrackUnpublished()
      expect(refreshTiles).toHaveBeenCalled()
    })

    it('holds the speaking highlight across the pauses between words', () => {
      jest.useFakeTimers()
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      return (
        wrapper.vm
          .connect()
          .then(() => {
            const room = wrapper.vm.room
            room.handlers.ActiveSpeakersChanged([{ identity: 'a' }, { identity: 'b' }])
            // Picking someone up is immediate — only letting go is delayed.
            expect(wrapper.vm.activeSpeakerIds).toEqual(['a', 'b'])

            // LiveKit drops 'b' mid-sentence. Reflecting that straight away is
            // what made the chip row strobe, so the hold keeps them listed.
            room.handlers.ActiveSpeakersChanged([{ identity: 'a' }])
            jest.advanceTimersByTime(1000)
            room.handlers.ActiveSpeakersChanged([{ identity: 'a' }])
            expect(wrapper.vm.activeSpeakerIds).toEqual(['a', 'b'])

            // Only real silence past the hold window drops them.
            jest.advanceTimersByTime(600)
            expect(wrapper.vm.activeSpeakerIds).toEqual(['a'])
          })
          // Restore real timers even if an assertion above throws, so leaked fake
          // timers can't make later tests flaky.
          .finally(() => {
            jest.useRealTimers()
          })
      )
    })

    it('leaves the speaker array untouched when nothing changed', () => {
      jest.useFakeTimers()
      const { wrapper } = factory({ show: false, groupId: 'g1', groupSlug: 'yoga' })
      withApollo(wrapper)
      return wrapper.vm
        .connect()
        .then(() => {
          const room = wrapper.vm.room
          room.handlers.ActiveSpeakersChanged([{ identity: 'a' }])
          const first = wrapper.vm.activeSpeakerIds
          room.handlers.ActiveSpeakersChanged([{ identity: 'a' }])
          // Same identity, same order — reassigning would re-render every
          // tile several times a second for nothing.
          expect(wrapper.vm.activeSpeakerIds).toBe(first)
        })
        .finally(() => {
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

    it('stringifies a rejection that carries no message', async () => {
      const { wrapper } = factory({ show: false, groupId: 'g1' })
      wrapper.vm.$apollo = { mutate: jest.fn().mockRejectedValue('websocket closed') }
      await wrapper.vm.connect()
      expect(wrapper.vm.error).toBe('websocket closed')
      expect(wrapper.vm.phase).toBe('error')
    })

    it('toasts and closes instead of erroring full screen when parked mid-handshake', async () => {
      // The user navigated away while the handshake was still running, so the
      // window is minimized. The error phase would blow it back up to full
      // screen over the page they moved to.
      const { wrapper, close } = factory({ show: true, minimized: true, groupId: null })
      const $toast = { error: jest.fn() }
      wrapper.vm.$toast = $toast
      await wrapper.vm.connect()
      expect($toast.error).toHaveBeenCalledWith('Missing group id')
      expect(wrapper.vm.phase).toBe('idle')
      expect(close).toHaveBeenCalled()
    })

    it('still closes when parked mid-handshake without a $toast plugin', async () => {
      const { wrapper, close } = factory({ show: true, minimized: true, groupId: null })
      await wrapper.vm.connect()
      expect(wrapper.vm.phase).toBe('idle')
      expect(close).toHaveBeenCalled()
    })
  })

  describe('audio that silently goes missing', () => {
    const connected = async (state = {}) => {
      const built = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', ...state })
      built.wrapper.vm.$apollo = {
        mutate: jest
          .fn()
          .mockResolvedValue({ data: { joinGroupVideoCall: { url: 'ws://lk', token: 'tok' } } }),
      }
      await built.wrapper.vm.connect()
      return { ...built, room: built.wrapper.vm.room }
    }

    const fakeMicTrack = (overrides = {}) => {
      const handlers = {}
      return {
        handlers,
        on: jest.fn((evt, cb) => {
          handlers[evt] = cb
        }),
        restartTrack: jest.fn().mockResolvedValue(),
        checkForSilence: jest.fn().mockResolvedValue(false),
        ...overrides,
      }
    }

    describe('blocked playback', () => {
      it('offers to enable the sound once the browser refuses to play it', async () => {
        const { wrapper, room } = await connected()
        expect(wrapper.find('[data-test="video-call-audio-blocked"]').exists()).toBe(false)

        room.canPlaybackAudio = false
        room.handlers.AudioPlaybackStatusChanged(false)
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-test="video-call-audio-blocked"]').exists()).toBe(true)

        // The gesture: startAudio() replays the elements and LiveKit flips back.
        room.startAudio.mockImplementation(async () => {
          room.canPlaybackAudio = true
        })
        await wrapper.find('[data-test="video-call-enable-audio"]').trigger('click')
        await flushPromises()
        expect(room.startAudio).toHaveBeenCalled()
        expect(wrapper.find('[data-test="video-call-audio-blocked"]').exists()).toBe(false)
      })

      it('picks up a block that happened during the handshake', async () => {
        const { Room } = await import('livekit-client')
        Room.initialCanPlaybackAudio = false
        try {
          const { wrapper } = await connected()
          expect(wrapper.vm.audioBlocked).toBe(true)
        } finally {
          Room.initialCanPlaybackAudio = true
        }
      })

      it('keeps the notice when the browser still refuses', async () => {
        const { wrapper, room } = await connected()
        room.canPlaybackAudio = false
        room.handlers.AudioPlaybackStatusChanged(false)
        room.startAudio.mockRejectedValue(new Error('NotAllowedError'))
        await wrapper.vm.enableAudio()
        expect(wrapper.vm.audioBlocked).toBe(true)
      })

      it('enableAudio is a no-op without a room', async () => {
        const { wrapper } = factory({ show: true })
        await expect(wrapper.vm.enableAudio()).resolves.toBeUndefined()
      })
    })

    describe('reconnects', () => {
      it('shows the reconnect, then rebuilds the tiles and re-reads the playback state', async () => {
        const { wrapper, room } = await connected()
        room.handlers.Reconnecting()
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-test="video-call-reconnecting"]').exists()).toBe(true)

        const refreshTiles = jest.spyOn(wrapper.vm, 'refreshTiles')
        // Re-attaching the re-subscribed tracks ran play() outside a gesture.
        room.canPlaybackAudio = false
        room.handlers.Reconnected()
        await wrapper.vm.$nextTick()
        expect(refreshTiles).toHaveBeenCalled()
        expect(wrapper.find('[data-test="video-call-reconnecting"]').exists()).toBe(false)
        expect(wrapper.vm.audioBlocked).toBe(true)
      })
    })

    describe('a microphone that delivers nothing', () => {
      it('warns when the published microphone only yields silence', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack()
        room.handlers.LocalTrackPublished({ source: 'microphone', track })
        track.handlers.audioSilenceDetected()
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-test="video-call-mic-problem"]').exists()).toBe(true)
      })

      it('ignores silence while the microphone is muted on purpose', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack()
        room.handlers.LocalTrackPublished({ source: 'microphone', track })
        wrapper.setData({ micEnabled: false })
        track.handlers.audioSilenceDetected()
        expect(wrapper.vm.micProblem).toBe(false)
      })

      it('follows LiveKit pausing and resuming the microphone upstream', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack()
        room.handlers.LocalTrackPublished({ source: 'microphone', track })

        track.handlers.upstreamPaused()
        expect(wrapper.vm.micProblem).toBe(true)
        track.handlers.upstreamResumed()
        expect(wrapper.vm.micProblem).toBe(false)

        // A deliberately muted mic has no problem to report.
        wrapper.setData({ micEnabled: false })
        track.handlers.upstreamPaused()
        expect(wrapper.vm.micProblem).toBe(false)
      })

      it('does not watch tracks other than the microphone', async () => {
        const { room } = await connected()
        const track = fakeMicTrack()
        room.handlers.LocalTrackPublished({ source: 'camera', track })
        room.handlers.LocalTrackPublished({ source: 'microphone', track: null })
        expect(track.on).not.toHaveBeenCalled()
      })

      it('restarts the capture on request and drops the warning once it carries sound', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack()
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        wrapper.setData({ micProblem: true })
        await wrapper.vm.$nextTick()

        await wrapper.find('[data-test="video-call-restart-mic"]').trigger('click')
        await flushPromises()
        expect(room.localParticipant.getTrackPublication).toHaveBeenCalledWith('microphone')
        expect(track.restartTrack).toHaveBeenCalled()
        expect(track.checkForSilence).toHaveBeenCalled()
        expect(wrapper.vm.micProblem).toBe(false)
      })

      it('keeps the warning when the new capture is just as silent', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack({ checkForSilence: jest.fn().mockResolvedValue(true) })
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        wrapper.setData({ micProblem: true })
        await wrapper.vm.restartMic()
        expect(wrapper.vm.micProblem).toBe(true)
      })

      it('reports no problem when the user muted while the capture restarted', async () => {
        const { wrapper, room } = await connected()
        const track = fakeMicTrack({ checkForSilence: jest.fn().mockResolvedValue(true) })
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        wrapper.setData({ micProblem: true, micEnabled: false })
        await wrapper.vm.restartMic()
        expect(wrapper.vm.micProblem).toBe(false)
      })

      it('runs one restart at a time, sharing it with callers who ask meanwhile', async () => {
        const { wrapper, room } = await connected()
        let finish
        const track = fakeMicTrack({
          restartTrack: jest.fn(
            () =>
              new Promise((resolve) => {
                finish = resolve
              }),
          ),
        })
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        const first = wrapper.vm.restartMic()
        const second = wrapper.vm.restartMic()
        expect(second).toBe(first)
        finish()
        await first
        expect(track.restartTrack).toHaveBeenCalledTimes(1)
        // Once settled, the next request starts a fresh attempt.
        const third = wrapper.vm.restartMic()
        finish()
        await third
        expect(track.restartTrack).toHaveBeenCalledTimes(2)
      })

      it('keeps the warning and toasts when the capture cannot be restarted', async () => {
        const { wrapper, room } = await connected()
        const $toast = { error: jest.fn() }
        wrapper.vm.$toast = $toast
        const track = fakeMicTrack({
          restartTrack: jest
            .fn()
            .mockRejectedValue(Object.assign(new Error(), { name: 'NotReadableError' })),
        })
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        wrapper.setData({ micProblem: true })
        await wrapper.vm.restartMic()
        expect($toast.error).toHaveBeenCalledWith('videoCall.errors.mic.busy')
        expect(wrapper.vm.micProblem).toBe(true)
      })

      it('lets a restart outlived by its call change nothing', async () => {
        const { wrapper, room } = await connected()
        const $toast = { error: jest.fn() }
        wrapper.vm.$toast = $toast
        let finish
        const track = fakeMicTrack({
          restartTrack: jest.fn(
            () =>
              new Promise((resolve, reject) => {
                finish = { resolve, reject }
              }),
          ),
          checkForSilence: jest.fn().mockResolvedValue(true),
        })
        room.localParticipant.getTrackPublication.mockReturnValue({ track })
        const pending = wrapper.vm.restartMic()
        await wrapper.vm.cleanup()
        finish.resolve()
        await pending
        // cleanup() reset micEnabled to true — a stale result would read as
        // "silent mic" and warn in the next call.
        expect(wrapper.vm.micProblem).toBe(false)

        // Same for a failure: no toast about a call that is gone.
        wrapper.setData({ room })
        const failing = wrapper.vm.restartMic()
        await wrapper.vm.cleanup()
        finish.reject(Object.assign(new Error(), { name: 'NotReadableError' }))
        await failing
        expect($toast.error).not.toHaveBeenCalled()
      })

      it('starts a fresh restart after a retry while the old one still runs', async () => {
        // retryConnect() disconnects the failed room without going through cleanup().
        const { wrapper, room } = await connected()
        const oldTrack = fakeMicTrack({ restartTrack: jest.fn(() => new Promise(() => {})) })
        room.localParticipant.getTrackPublication.mockReturnValue({ track: oldTrack })
        const stale = wrapper.vm.restartMic()

        await wrapper.vm.retryConnect()
        const newTrack = fakeMicTrack()
        wrapper.vm.room.localParticipant.getTrackPublication.mockReturnValue({ track: newTrack })
        const fresh = wrapper.vm.restartMic()
        expect(fresh).not.toBe(stale)
        await fresh
        expect(newTrack.restartTrack).toHaveBeenCalled()
      })

      it('starts a fresh restart in a new call while the old one still runs', async () => {
        const { wrapper, room } = await connected()
        let finishOld
        const oldTrack = fakeMicTrack({
          restartTrack: jest.fn(
            () =>
              new Promise((resolve) => {
                finishOld = resolve
              }),
          ),
        })
        room.localParticipant.getTrackPublication.mockReturnValue({ track: oldTrack })
        const stale = wrapper.vm.restartMic()
        await wrapper.vm.cleanup()

        await wrapper.vm.connect()
        const newTrack = fakeMicTrack()
        wrapper.vm.room.localParticipant.getTrackPublication.mockReturnValue({ track: newTrack })
        let finishNew
        newTrack.restartTrack.mockImplementation(
          () =>
            new Promise((resolve) => {
              finishNew = resolve
            }),
        )
        const fresh = wrapper.vm.restartMic()
        expect(fresh).not.toBe(stale)
        expect(newTrack.restartTrack).toHaveBeenCalled()

        // The old attempt settling must not release the new one's lock.
        finishOld()
        await stale
        expect(wrapper.vm.restartMic()).toBe(fresh)
        finishNew()
        await fresh
      })

      it('restartMic is a no-op without a room or a published microphone', async () => {
        const { wrapper, room } = await connected()
        room.localParticipant.getTrackPublication.mockReturnValue(undefined)
        await expect(wrapper.vm.restartMic()).resolves.toBeUndefined()
        wrapper.setData({ room: null })
        await expect(wrapper.vm.restartMic()).resolves.toBeUndefined()
      })

      it('retries a dead microphone when the devices change', async () => {
        const { wrapper, room } = await connected()
        const restartMic = jest.spyOn(wrapper.vm, 'restartMic').mockResolvedValue()
        room.handlers.MediaDevicesChanged()
        expect(restartMic).not.toHaveBeenCalled()
        wrapper.setData({ micProblem: true })
        room.handlers.MediaDevicesChanged()
        expect(restartMic).toHaveBeenCalled()
      })

      it('drops the warning when the user mutes the microphone', async () => {
        const { wrapper } = await connected()
        wrapper.setData({ micProblem: true })
        await wrapper.vm.toggleMic()
        expect(wrapper.vm.micEnabled).toBe(false)
        expect(wrapper.vm.micProblem).toBe(false)
        // Unmuting again does not invent a problem.
        await wrapper.vm.toggleMic()
        expect(wrapper.vm.micProblem).toBe(false)
      })
    })

    it('starts every call without leftover warnings', async () => {
      const { wrapper } = await connected()
      wrapper.setData({ audioBlocked: true, micProblem: true, reconnecting: true })
      await wrapper.vm.cleanup()
      expect(wrapper.vm.audioBlocked).toBe(false)
      expect(wrapper.vm.micProblem).toBe(false)
      expect(wrapper.vm.reconnecting).toBe(false)

      wrapper.setData({ audioBlocked: true, micProblem: true, reconnecting: true })
      await wrapper.vm.connect()
      expect(wrapper.vm.audioBlocked).toBe(false)
      expect(wrapper.vm.micProblem).toBe(false)
      expect(wrapper.vm.reconnecting).toBe(false)
    })
  })

  describe('device settings during the call', () => {
    const STORAGE_KEY = 'ocelot-video-call-devices'
    const TOGGLE = '[data-test="video-call-device-settings-toggle"]'
    const PANEL = '.stub-devicesettings'

    const connected = async (state = {}) => {
      const built = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', ...state })
      built.wrapper.vm.$apollo = {
        mutate: jest
          .fn()
          .mockResolvedValue({ data: { joinGroupVideoCall: { url: 'ws://lk', token: 'tok' } } }),
      }
      await built.wrapper.vm.connect()
      return { ...built, room: built.wrapper.vm.room }
    }

    const opened = async (state) => {
      const built = await connected(state)
      await built.wrapper.find(TOGGLE).trigger('click')
      return built
    }

    const deviceError = (name) => Object.assign(new Error(name), { name })

    beforeEach(() => {
      localStorage.clear()
    })

    describe('the panel', () => {
      it('stays closed until its button is clicked, and closes on the next click', async () => {
        const { wrapper } = await connected()
        await wrapper.vm.$nextTick()
        expect(wrapper.find(PANEL).exists()).toBe(false)
        expect(wrapper.find(TOGGLE).attributes('aria-expanded')).toBe('false')

        await wrapper.find(TOGGLE).trigger('click')
        expect(wrapper.find(PANEL).exists()).toBe(true)
        expect(wrapper.find(TOGGLE).attributes('aria-expanded')).toBe('true')

        await wrapper.find(TOGGLE).trigger('click')
        expect(wrapper.find(PANEL).exists()).toBe(false)
        wrapper.destroy()
      })

      it('closes on a click anywhere else, but not on one inside', async () => {
        const { wrapper } = await opened()
        wrapper.vm.onDocumentClick({ target: wrapper.find(PANEL).element })
        expect(wrapper.vm.showDeviceSettings).toBe(true)

        document.body.click()
        await wrapper.vm.$nextTick()
        expect(wrapper.find(PANEL).exists()).toBe(false)
        wrapper.destroy()
      })

      it('closes on Escape only', async () => {
        const { wrapper } = await opened()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
        expect(wrapper.vm.showDeviceSettings).toBe(true)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(wrapper.vm.showDeviceSettings).toBe(false)
        wrapper.destroy()
      })

      it('closes when the panel asks for it', async () => {
        const { wrapper } = await opened()
        wrapper.findComponent({ name: 'DeviceSettings' }).vm.$emit('close')
        expect(wrapper.vm.showDeviceSettings).toBe(false)
        wrapper.destroy()
      })

      it('stops listening to the document once closed or destroyed', async () => {
        const remove = jest.spyOn(document, 'removeEventListener')
        const { wrapper } = await opened()
        wrapper.destroy()
        expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true)
        expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
        remove.mockRestore()
      })

      it('is gone after the call ended', async () => {
        const { wrapper } = await opened()
        await wrapper.vm.cleanup()
        expect(wrapper.vm.showDeviceSettings).toBe(false)
        wrapper.destroy()
      })
    })

    describe('switching', () => {
      it('hands a new camera to LiveKit and remembers it', async () => {
        const { wrapper, room } = await opened()
        wrapper
          .findComponent({ name: 'DeviceSettings' })
          .vm.$emit('switch', { kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' })
        await flushPromises()
        expect(room.switchActiveDevice).toHaveBeenCalledWith('videoinput', 'cam-2')
        expect(wrapper.vm.cameraDeviceId).toBe('cam-2')
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).videoinput).toEqual({
          deviceId: 'cam-2',
          label: 'Webcam',
        })
        wrapper.destroy()
      })

      it('hands a new microphone to LiveKit and remembers it', async () => {
        const { wrapper, room } = await connected()
        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2', label: 'Headset' })
        expect(room.switchActiveDevice).toHaveBeenCalledWith('audioinput', 'mic-2')
        expect(wrapper.vm.micDeviceId).toBe('mic-2')
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).audioinput.deviceId).toBe('mic-2')
      })

      it('hands a new speaker to LiveKit and remembers it', async () => {
        const { wrapper, room } = await connected()
        await wrapper.vm.switchDevice({ kind: 'audiooutput', deviceId: 'spk-2', label: 'Box' })
        expect(room.switchActiveDevice).toHaveBeenCalledWith('audiooutput', 'spk-2')
        expect(wrapper.vm.speakerDeviceId).toBe('spk-2')
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).audiooutput.deviceId).toBe('spk-2')
      })

      it('does nothing without a room, for an unknown kind or for the device in use', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ cameraDeviceId: 'cam-1' })
        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-1' })
        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: '' })
        await wrapper.vm.switchDevice({ kind: 'nonsense', deviceId: 'x' })
        expect(room.switchActiveDevice).not.toHaveBeenCalled()

        wrapper.setData({ room: null })
        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        expect(wrapper.vm.cameraDeviceId).toBe('cam-1')
      })

      it('goes back to the previous device and says why when the new one refuses', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ cameraDeviceId: 'cam-1' })
        wrapper.vm.showDeviceErrorToast = jest.fn()
        const err = deviceError('NotReadableError')
        room.switchActiveDevice.mockRejectedValueOnce(err)

        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' })
        expect(wrapper.vm.cameraDeviceId).toBe('cam-1')
        expect(wrapper.vm.showDeviceErrorToast).toHaveBeenCalledWith('camera', err)
        expect(room.switchActiveDevice).toHaveBeenLastCalledWith('videoinput', 'cam-1')
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      })

      it('treats a capture that restarted on another device as refused', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ micDeviceId: 'mic-1' })
        wrapper.vm.showDeviceErrorToast = jest.fn()
        room.switchActiveDevice.mockResolvedValueOnce(false)

        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' })
        expect(wrapper.vm.micDeviceId).toBe('mic-1')
        expect(wrapper.vm.showDeviceErrorToast).toHaveBeenCalledWith('mic', expect.any(Error))
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      })

      it('says so when the speaker refuses', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ speakerDeviceId: 'spk-1' })
        wrapper.vm.$toast = { error: jest.fn() }
        room.switchActiveDevice.mockRejectedValueOnce(deviceError('NotFoundError'))

        await wrapper.vm.switchDevice({ kind: 'audiooutput', deviceId: 'spk-2' })
        expect(wrapper.vm.speakerDeviceId).toBe('spk-1')
        expect(wrapper.vm.$toast.error).toHaveBeenCalledWith(
          'videoCall.deviceSettings.speakerError',
        )
        expect(room.switchActiveDevice).toHaveBeenLastCalledWith('audiooutput', 'spk-1')
      })

      it('survives a refusing speaker without a toast plugin', async () => {
        const { wrapper, room } = await connected()
        room.switchActiveDevice.mockRejectedValueOnce(deviceError('NotFoundError'))
        await expect(
          wrapper.vm.switchDevice({ kind: 'audiooutput', deviceId: 'spk-2' }),
        ).resolves.toBeUndefined()
        expect(wrapper.vm.speakerDeviceId).toBeNull()
      })

      it('survives the previous device refusing as well', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ micDeviceId: 'mic-1' })
        wrapper.vm.showDeviceErrorToast = jest.fn()
        room.switchActiveDevice.mockRejectedValue(deviceError('NotFoundError'))

        await expect(
          wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' }),
        ).resolves.toBeUndefined()
        expect(wrapper.vm.micDeviceId).toBe('mic-1')
        expect(wrapper.vm.showDeviceErrorToast).toHaveBeenCalledWith('mic', expect.any(Error))
      })

      it('has no previous device to go back to when none was known', async () => {
        const { wrapper, room } = await connected()
        wrapper.vm.showDeviceErrorToast = jest.fn()
        room.switchActiveDevice.mockRejectedValueOnce(deviceError('NotReadableError'))
        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        expect(room.switchActiveDevice).toHaveBeenCalledTimes(1)
        expect(wrapper.vm.cameraDeviceId).toBeNull()
      })

      it('drops the outcome of a switch that outlived the call', async () => {
        const { wrapper, room } = await connected()
        wrapper.vm.showDeviceErrorToast = jest.fn()
        room.switchActiveDevice.mockImplementationOnce(async () => {
          wrapper.setData({ room: null })
        })
        await wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

        wrapper.setData({ room })
        room.switchActiveDevice.mockImplementationOnce(async () => {
          wrapper.setData({ room: null })
          throw deviceError('NotReadableError')
        })
        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' })
        expect(wrapper.vm.showDeviceErrorToast).not.toHaveBeenCalled()
      })

      it('drops a stale microphone warning once the new microphone carries sound', async () => {
        const { wrapper, room } = await connected()
        const checkForSilence = jest.fn().mockResolvedValue(false)
        room.localParticipant.getTrackPublication.mockReturnValue({ track: { checkForSilence } })
        wrapper.setData({ micProblem: true })
        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' })
        expect(checkForSilence).toHaveBeenCalled()
        expect(wrapper.vm.micProblem).toBe(false)
      })

      it('keeps the warning when the new microphone is silent too, or has no track', async () => {
        const { wrapper, room } = await connected()
        room.localParticipant.getTrackPublication.mockReturnValue({
          track: { checkForSilence: jest.fn().mockResolvedValue(true) },
        })
        wrapper.setData({ micProblem: true })
        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' })
        expect(wrapper.vm.micProblem).toBe(true)

        room.localParticipant.getTrackPublication.mockReturnValue(null)
        await wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-3' })
        expect(wrapper.vm.micProblem).toBe(true)
      })
    })

    describe('a switch that takes its time', () => {
      const pendingSwitch = (room) => {
        let finish, fail
        room.switchActiveDevice.mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finish = () => resolve(true)
              fail = reject
            }),
        )
        return { finish: () => finish(), fail: (err) => fail(err) }
      }
      it('counts the camera as starting until it runs', async () => {
        const { wrapper, room } = await connected()
        const pending = pendingSwitch(room)
        const switching = wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        expect(wrapper.vm.devicesStarting).toMatchObject({ videoinput: 1, audioinput: 0 })

        pending.finish()
        await switching
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)
      })

      it('counts the microphone as starting also while it falls back after a refusal', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ micDeviceId: 'mic-1' })
        wrapper.vm.showDeviceErrorToast = jest.fn()
        const first = pendingSwitch(room)
        const back = pendingSwitch(room)
        const switching = wrapper.vm.switchDevice({ kind: 'audioinput', deviceId: 'mic-2' })
        expect(wrapper.vm.devicesStarting.audioinput).toBe(1)

        first.fail(deviceError('NotReadableError'))
        await flushPromises()
        // The previous microphone is on its way back.
        expect(wrapper.vm.devicesStarting.audioinput).toBe(1)

        back.finish()
        await switching
        expect(wrapper.vm.devicesStarting.audioinput).toBe(0)
      })

      it('keeps saying so while a second pick follows the first', async () => {
        const { wrapper, room } = await opened()
        const first = pendingSwitch(room)
        const second = pendingSwitch(room)
        const one = wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        const two = wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-3' })
        first.finish()
        await one
        expect(wrapper.vm.devicesStarting.videoinput).toBe(1)
        second.finish()
        await two
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)
        wrapper.destroy()
      })

      it('starts from zero again after a call that ended mid-switch', async () => {
        const { wrapper, room } = await connected()
        const pending = pendingSwitch(room)
        const switching = wrapper.vm.switchDevice({ kind: 'videoinput', deviceId: 'cam-2' })
        await wrapper.vm.cleanup()
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)
        pending.finish()
        await switching
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)
      })
    })

    describe('a device switched on with its button', () => {
      const pendingToggle = (fn) => {
        let finish, fail
        fn.mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finish = resolve
              fail = reject
            }),
        )
        return { finish: () => finish(), fail: (err) => fail(err) }
      }

      it('counts as starting until the camera runs — switching it off does not', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ cameraEnabled: false })
        const pending = pendingToggle(room.localParticipant.setCameraEnabled)
        const toggling = wrapper.vm.toggleCamera()
        expect(wrapper.vm.devicesStarting.videoinput).toBe(1)
        pending.finish()
        await toggling
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)

        const off = pendingToggle(room.localParticipant.setCameraEnabled)
        const switchingOff = wrapper.vm.toggleCamera()
        expect(wrapper.vm.devicesStarting.videoinput).toBe(0)
        off.finish()
        await switchingOff
      })

      it('counts as starting until the microphone runs — muting does not', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ micEnabled: false })
        const pending = pendingToggle(room.localParticipant.setMicrophoneEnabled)
        const toggling = wrapper.vm.toggleMic()
        expect(wrapper.vm.devicesStarting.audioinput).toBe(1)
        pending.finish()
        await toggling
        expect(wrapper.vm.devicesStarting.audioinput).toBe(0)

        const mute = pendingToggle(room.localParticipant.setMicrophoneEnabled)
        const muting = wrapper.vm.toggleMic()
        expect(wrapper.vm.devicesStarting.audioinput).toBe(0)
        mute.finish()
        await muting
      })

      it('stops counting when the device refuses', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ cameraEnabled: false, micEnabled: false })
        wrapper.vm.showDeviceErrorToast = jest.fn()
        const camera = pendingToggle(room.localParticipant.setCameraEnabled)
        const mic = pendingToggle(room.localParticipant.setMicrophoneEnabled)
        const toggling = Promise.all([wrapper.vm.toggleCamera(), wrapper.vm.toggleMic()])
        camera.fail(deviceError('NotReadableError'))
        mic.fail(deviceError('NotReadableError'))
        await toggling
        expect(wrapper.vm.devicesStarting).toMatchObject({ videoinput: 0, audioinput: 0 })
      })
    })

    describe('saying that a device is starting', () => {
      const starting = (wrapper, kinds) =>
        wrapper.setData({
          devicesStarting: { videoinput: 0, audioinput: 0, audiooutput: 0, ...kinds },
        })

      it('says nothing any more once the call has ended', async () => {
        const { wrapper } = factory({ show: true })
        wrapper.vm.deviceStarts('videoinput')
        wrapper.vm.deviceStarts('audioinput')
        await wrapper.vm.cleanup()
        expect(wrapper.vm.devicesStarting).toEqual({ videoinput: 0, audioinput: 0, audiooutput: 0 })
      })

      it('shows it on the button of that device, which waits meanwhile', async () => {
        const { wrapper } = await connected()
        const button = (label) =>
          wrapper.findAll('.stub-button').wrappers.find((b) => b.attributes('aria-label') === label)
        expect(button('videoCall.muteMic').attributes('loading')).toBeUndefined()
        expect(button('videoCall.disableCamera').attributes('loading')).toBeUndefined()

        await starting(wrapper, { videoinput: 1 })
        expect(button('videoCall.disableCamera').attributes('loading')).toBe('true')
        expect(button('videoCall.muteMic').attributes('loading')).toBeUndefined()

        await starting(wrapper, { audioinput: 1 })
        expect(button('videoCall.muteMic').attributes('loading')).toBe('true')
        expect(button('videoCall.disableCamera').attributes('loading')).toBeUndefined()
      })

      it('shows it in the device settings', async () => {
        const { wrapper } = await opened()
        const panel = wrapper.findComponent({ name: 'DeviceSettings' })
        expect(panel.props('cameraStarting')).toBe(false)
        await starting(wrapper, { videoinput: 1, audioinput: 1 })
        expect(panel.props('cameraStarting')).toBe(true)
        expect(panel.props('micStarting')).toBe(true)
        wrapper.destroy()
      })

      it('shows it on the own camera tile only', async () => {
        const { wrapper } = await connected()
        const tile = (overrides) => ({
          key: `${overrides.identity}/${overrides.isScreen ? 'screen' : 'main'}`,
          name: overrides.identity,
          isLocal: false,
          isScreen: false,
          ...overrides,
        })
        wrapper.setData({
          tiles: [
            tile({ identity: 'me', isLocal: true }),
            tile({ identity: 'me', isLocal: true, isScreen: true }),
            tile({ identity: 'bob' }),
          ],
        })
        await starting(wrapper, { videoinput: 1, audioinput: 1 })
        const shown = wrapper
          .findAllComponents({ name: 'VideoTile' })
          .wrappers.map((t) => [t.props('cameraStarting'), t.props('micStarting')])
        expect(shown).toEqual([
          [true, true],
          [false, false],
          [false, false],
        ])
      })
    })

    describe('devices LiveKit changes on its own', () => {
      it('follows a device LiveKit moved to', async () => {
        const { wrapper, room } = await connected()
        room.handlers.ActiveDeviceChanged('videoinput', 'cam-9')
        room.handlers.ActiveDeviceChanged('audioinput', 'mic-9')
        room.handlers.ActiveDeviceChanged('audiooutput', 'spk-9')
        expect(wrapper.vm.cameraDeviceId).toBe('cam-9')
        expect(wrapper.vm.micDeviceId).toBe('mic-9')
        expect(wrapper.vm.speakerDeviceId).toBe('spk-9')
      })

      it('ignores unknown kinds and a missing device', async () => {
        const { wrapper, room } = await connected()
        wrapper.setData({ cameraDeviceId: 'cam-1' })
        room.handlers.ActiveDeviceChanged('nonsense', 'x')
        room.handlers.ActiveDeviceChanged('videoinput', '')
        expect(wrapper.vm.cameraDeviceId).toBe('cam-1')
      })

      it('tells LiveKit the speaker chosen before the call, so it does not reset it', async () => {
        const built = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
        built.wrapper.vm.$apollo = {
          mutate: jest.fn().mockResolvedValue({
            data: { joinGroupVideoCall: { url: 'ws://lk', token: 'tok' } },
          }),
        }
        built.wrapper.setData({ speakerDeviceId: 'spk-2' })
        await built.wrapper.vm.connect()
        expect(built.wrapper.vm.room.opts.audioOutput).toEqual({ deviceId: 'spk-2' })

        const { room } = await connected()
        expect(room.opts).not.toHaveProperty('audioOutput')
      })
    })

    describe('microphone level', () => {
      const originalMediaStream = global.MediaStream

      beforeEach(() => {
        global.MediaStream = jest.fn(function (tracks) {
          this.tracks = tracks
        })
      })

      afterEach(() => {
        global.MediaStream = originalMediaStream
      })

      it('listens to the published microphone while the panel is open', async () => {
        const { wrapper, room } = await connected()
        const mediaStreamTrack = { kind: 'audio' }
        room.localParticipant.getTrackPublication.mockReturnValue({ track: { mediaStreamTrack } })

        wrapper.vm.refreshMicMeter()
        expect(wrapper.vm.micMeterStream).toBeNull()

        await wrapper.find(TOGGLE).trigger('click')
        expect(wrapper.vm.micMeterStream.tracks).toEqual([mediaStreamTrack])

        wrapper.vm.closeDeviceSettings()
        expect(wrapper.vm.micMeterStream).toBeNull()
      })

      it('shows no level for a muted microphone or without a track', async () => {
        const { wrapper, room } = await connected()
        room.localParticipant.getTrackPublication.mockReturnValue({
          track: { mediaStreamTrack: {} },
        })
        wrapper.setData({ micEnabled: false })
        await wrapper.find(TOGGLE).trigger('click')
        expect(wrapper.vm.micMeterStream).toBeNull()

        wrapper.setData({ micEnabled: true })
        room.localParticipant.getTrackPublication.mockReturnValue(null)
        wrapper.vm.refreshMicMeter()
        expect(wrapper.vm.micMeterStream).toBeNull()
        wrapper.destroy()
      })

      it('has no track to offer before the call is connected', () => {
        const { wrapper } = factory({ show: true })
        expect(wrapper.vm.localMicTrack()).toBeNull()
      })
    })
  })

  describe('join token fetched during the pre-join dialog', () => {
    const payload = { url: 'ws://lk', token: 'tok' }
    const apolloResolving = () => ({
      mutate: jest.fn().mockResolvedValue({ data: { joinGroupVideoCall: payload } }),
    })

    it('asks for the token as soon as the dialog opens and joins with it', async () => {
      const apollo = apolloResolving()
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      await flushPromises()
      expect(apollo.mutate).toHaveBeenCalledTimes(1)
      expect(apollo.mutate.mock.calls[0][0].variables).toEqual({ groupId: 'g1' })

      await wrapper.vm.connect()
      // The click only opens the socket — no second round trip.
      expect(apollo.mutate).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.room.connect).toHaveBeenCalledWith('ws://lk', 'tok', expect.any(Object))
      expect(wrapper.vm.phase).toBe('in-call')
    })

    it('waits for a request that is still under way', async () => {
      let resolve
      const apollo = {
        mutate: jest.fn().mockReturnValue(
          new Promise((r) => {
            resolve = r
          }),
        ),
      }
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      const joining = wrapper.vm.connect()
      await flushPromises()
      resolve({ data: { joinGroupVideoCall: payload } })
      await joining
      expect(apollo.mutate).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.phase).toBe('in-call')
    })

    it('asks again once the token is too old to vouch for the open-call right', async () => {
      const apollo = apolloResolving()
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
      try {
        const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
        await flushPromises()
        now.mockReturnValue(1_000_000 + 60_000)
        await wrapper.vm.connect()
        expect(apollo.mutate).toHaveBeenCalledTimes(2)
      } finally {
        now.mockRestore()
      }
    })

    it('lets the join report the error instead of the background request', async () => {
      const apollo = {
        mutate: jest
          .fn()
          .mockRejectedValueOnce(new Error('prefetch failed'))
          .mockRejectedValueOnce(new Error('join failed')),
      }
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      await flushPromises()
      await wrapper.vm.connect()
      expect(apollo.mutate).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.error).toBe('join failed')
    })

    it('uses a token only once, so a retry asks for a fresh one', async () => {
      const apollo = apolloResolving()
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      await flushPromises()
      await wrapper.vm.connect()
      await wrapper.vm.retryConnect()
      expect(apollo.mutate).toHaveBeenCalledTimes(2)
    })

    it('never hands out a token fetched for another group', async () => {
      const apollo = apolloResolving()
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      await flushPromises()
      await wrapper.vm.takeJoinPayload('g2')
      expect(apollo.mutate).toHaveBeenCalledTimes(2)
      expect(apollo.mutate.mock.calls[1][0].variables).toEqual({ groupId: 'g2' })
    })

    it('does not ask without a group', async () => {
      const apollo = apolloResolving()
      factory({ show: true, groupId: null, apollo })
      await flushPromises()
      expect(apollo.mutate).not.toHaveBeenCalled()
    })

    it('forgets the token when the call is closed', async () => {
      const apollo = apolloResolving()
      const { wrapper } = factory({ show: true, groupId: 'g1', groupSlug: 'yoga', apollo })
      await flushPromises()
      await wrapper.vm.cleanup()
      expect(wrapper.vm.prefetched).toBeNull()
    })
  })

  describe('connection quality', () => {
    const remoteParticipant = (identity, pubs = []) => ({
      identity,
      name: identity,
      connectionQuality: 'excellent',
      isCameraEnabled: true,
      audioTrackPublications: new Map(),
      videoTrackPublications: new Map(pubs.map((pub, i) => [`${identity}-${i}`, pub])),
    })
    // isDesired mirrors LiveKit: true until setSubscribed(false), then whatever was asked.
    const videoPub = (source) => {
      const pub = { source, track: { sid: source }, isDesired: true }
      pub.setSubscribed = jest.fn((subscribed) => {
        pub.isDesired = subscribed
      })
      return pub
    }

    const connected = async () => {
      const built = factory({ show: true, groupId: 'g1', groupSlug: 'yoga' })
      built.wrapper.vm.$apollo = {
        mutate: jest
          .fn()
          .mockResolvedValue({ data: { joinGroupVideoCall: { url: 'ws://lk', token: 'tok' } } }),
      }
      await built.wrapper.vm.connect()
      const room = built.wrapper.vm.room
      const camera = videoPub('camera')
      const screen = videoPub('screen_share')
      room.remoteParticipants.set('bob', remoteParticipant('bob', [camera, screen]))
      return { ...built, room, camera, screen }
    }

    afterEach(() => {
      jest.useRealTimers()
    })

    it("puts every participant's rating on their tile", async () => {
      const { wrapper, room } = await connected()
      room.remoteParticipants.get('bob').connectionQuality = 'poor'
      room.handlers.ConnectionQualityChanged('poor', room.remoteParticipants.get('bob'))
      const bob = wrapper.vm.tiles.find((t) => t.identity === 'bob' && !t.isScreen)
      expect(bob.connectionQuality).toBe('poor')
      // The local participant of the mock carries no rating yet.
      expect(wrapper.vm.tiles.find((t) => t.isLocal).connectionQuality).toBe('unknown')
      // Someone else's weak line is no reason to drop our videos.
      expect(wrapper.vm.qualityTimer).toBeNull()
    })

    it('pauses the cameras once our own connection stays weak', async () => {
      jest.useFakeTimers()
      const { wrapper, room, camera, screen } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(4_999)
      expect(wrapper.vm.audioOnly).toBe(false)
      jest.advanceTimersByTime(1)
      expect(wrapper.vm.audioOnly).toBe(true)
      expect(camera.setSubscribed).toHaveBeenCalledWith(false)
      // Screen shares are what the call is about — they keep running.
      expect(screen.setSubscribed).not.toHaveBeenCalled()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="video-call-audio-only"]').exists()).toBe(true)
    })

    it('keeps counting while a weak line flips between poor and lost', async () => {
      jest.useFakeTimers()
      const { wrapper, room } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(3000)
      room.handlers.ConnectionQualityChanged('lost', room.localParticipant)
      jest.advanceTimersByTime(2000)
      expect(wrapper.vm.audioOnly).toBe(true)
    })

    it('keeps counting while a recovered line flips between good and excellent', async () => {
      jest.useFakeTimers()
      const { wrapper, room } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(5000)
      room.handlers.ConnectionQualityChanged('good', room.localParticipant)
      jest.advanceTimersByTime(15000)
      room.handlers.ConnectionQualityChanged('excellent', room.localParticipant)
      jest.advanceTimersByTime(5000)
      expect(wrapper.vm.audioOnly).toBe(false)
    })

    it('ignores a dip that recovers within the grace period', async () => {
      jest.useFakeTimers()
      const { wrapper, room } = await connected()
      room.handlers.ConnectionQualityChanged('lost', room.localParticipant)
      jest.advanceTimersByTime(3_000)
      room.handlers.ConnectionQualityChanged('good', room.localParticipant)
      jest.advanceTimersByTime(10_000)
      expect(wrapper.vm.audioOnly).toBe(false)
    })

    it('brings the cameras back only after the connection has been fine for a while', async () => {
      jest.useFakeTimers()
      const { wrapper, room, camera } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(5_000)
      room.handlers.ConnectionQualityChanged('excellent', room.localParticipant)
      jest.advanceTimersByTime(19_999)
      expect(wrapper.vm.audioOnly).toBe(true)
      jest.advanceTimersByTime(1)
      expect(wrapper.vm.audioOnly).toBe(false)
      expect(camera.setSubscribed).toHaveBeenLastCalledWith(true)
    })

    it('stays in audio-only mode while the rating is unknown', async () => {
      jest.useFakeTimers()
      const { wrapper, room } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(5_000)
      room.handlers.ConnectionQualityChanged('unknown', room.localParticipant)
      jest.advanceTimersByTime(60_000)
      expect(wrapper.vm.audioOnly).toBe(true)
    })

    it('respects a user who wants the videos back', async () => {
      jest.useFakeTimers()
      const { wrapper, room, camera } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(5_000)
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="video-call-show-videos"]').trigger('click')
      expect(wrapper.vm.audioOnly).toBe(false)
      expect(camera.setSubscribed).toHaveBeenLastCalledWith(true)

      room.handlers.ConnectionQualityChanged('good', room.localParticipant)
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(60_000)
      expect(wrapper.vm.audioOnly).toBe(false)
    })

    it('keeps cameras that arrive during audio-only mode paused', async () => {
      const { wrapper, room, camera } = await connected()
      room.handlers.TrackPublished()
      room.handlers.TrackSubscribed()
      expect(camera.setSubscribed).not.toHaveBeenCalled()

      wrapper.setData({ audioOnly: true })
      room.handlers.TrackPublished()
      expect(camera.setSubscribed).toHaveBeenCalledTimes(1)
      expect(camera.setSubscribed).toHaveBeenLastCalledWith(false)

      // Someone else's camera arrives: only that one is unsubscribed — the
      // one already paused costs no further signalling on a weak line.
      const late = videoPub('camera')
      room.remoteParticipants.set('carol', remoteParticipant('carol', [late]))
      room.handlers.TrackSubscribed()
      expect(late.setSubscribed).toHaveBeenCalledWith(false)
      expect(camera.setSubscribed).toHaveBeenCalledTimes(1)
    })

    it('leaves cameras that were never paused alone when the videos come back', async () => {
      jest.useFakeTimers()
      const { wrapper, room, camera } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      jest.advanceTimersByTime(5000)
      // Published meanwhile but never paused — nothing to undo for it.
      const untouched = videoPub('camera')
      room.remoteParticipants.set('carol', remoteParticipant('carol', [untouched]))

      wrapper.vm.showVideos()
      expect(camera.setSubscribed).toHaveBeenLastCalledWith(true)
      expect(untouched.setSubscribed).not.toHaveBeenCalled()
    })

    it('applyAudioOnly is a no-op without a room', () => {
      const { wrapper } = factory({ show: true })
      expect(() => wrapper.vm.applyAudioOnly()).not.toThrow()
    })

    it('starts every call with videos on', async () => {
      jest.useFakeTimers()
      const { wrapper, room } = await connected()
      room.handlers.ConnectionQualityChanged('poor', room.localParticipant)
      wrapper.setData({ audioOnly: true, audioOnlyDismissed: true })
      await wrapper.vm.cleanup()
      expect(wrapper.vm.audioOnly).toBe(false)
      expect(wrapper.vm.audioOnlyDismissed).toBe(false)
      jest.advanceTimersByTime(60_000)
      expect(wrapper.vm.audioOnly).toBe(false)
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
      wrapper.vm.speakerHoldTimer = 123
      wrapper.vm.speakerSeenAt.set('u1', 1)
      const clearSpy = jest.spyOn(global, 'clearTimeout')
      await wrapper.vm.cleanup()
      expect(stop).toHaveBeenCalled()
      expect(mediaStop).toHaveBeenCalled()
      expect(clearSpy).toHaveBeenCalledWith(123)
      expect(wrapper.vm.speakerSeenAt.size).toBe(0)
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

    it('$route watcher closes a failed call when navigating away', async () => {
      const { wrapper, close, setMinimized } = factory({ show: true, groupId: 'g1' })
      wrapper.setData({ phase: 'error', error: 'invalid api key' })
      const replace = jest.fn()
      wrapper.vm.$router.replace = replace
      await wrapper.vm.$options.watch.$route.call(wrapper.vm, { name: 'groups-id-slug' })
      expect(close).toHaveBeenCalled()
      expect(wrapper.vm.phase).toBe('idle')
      // Parking the error card would leave litter in the corner…
      expect(setMinimized).not.toHaveBeenCalled()
      // …and redirecting would hijack the navigation already in flight.
      expect(replace).not.toHaveBeenCalled()
    })

    it('$route watcher keeps a failed call on the call route', async () => {
      const { wrapper, close } = factory({ show: true, groupId: 'g1' })
      wrapper.setData({ phase: 'error', error: 'invalid api key' })
      await wrapper.vm.$options.watch.$route.call(wrapper.vm, { name: 'call-id-slug' })
      expect(close).not.toHaveBeenCalled()
      expect(wrapper.vm.phase).toBe('error')
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

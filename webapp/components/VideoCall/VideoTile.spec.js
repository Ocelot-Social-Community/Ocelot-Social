import { mount, createLocalVue } from '@vue/test-utils'
import VideoTile from './VideoTile.vue'

const localVue = createLocalVue()

const Stub = (name) => ({ name, template: `<div class="${name.toLowerCase()}" />` })
const stubs = {
  OsIcon: Stub('OsIcon'),
  ProfileAvatar: Stub('ProfileAvatar'),
}

const buildTrack = () => {
  const track = {
    attach: jest.fn(),
    detach: jest.fn(),
  }
  return track
}

const buildTile = (overrides = {}) => ({
  key: 'tile-1',
  identity: 'user-1',
  name: 'Alice',
  isLocal: false,
  isScreen: false,
  videoTrack: null,
  audioTrack: null,
  profile: { id: 'user-1', name: 'Alice' },
  ...overrides,
})

const factory = (props = {}) =>
  mount(VideoTile, {
    propsData: {
      tile: buildTile(),
      ...props,
    },
    localVue,
    stubs,
    mocks: { $t: (k) => k },
  })

describe('VideoTile', () => {
  describe('rendering', () => {
    it('renders the participant name', () => {
      const wrapper = factory({ tile: buildTile({ name: 'Bob' }) })
      expect(wrapper.text()).toContain('Bob')
    })

    it('marks the local participant with the "you" tag', () => {
      const wrapper = factory({ tile: buildTile({ isLocal: true }) })
      expect(wrapper.html()).toContain('videoCall.you')
    })

    it('marks a screen share tile with the screen-share tag', () => {
      const wrapper = factory({ tile: buildTile({ isScreen: true }) })
      expect(wrapper.html()).toContain('videoCall.screenShare')
    })

    it('renders the own-screen placeholder for local screen shares only', () => {
      const wrapper = factory({ tile: buildTile({ isScreen: true, isLocal: true }) })
      expect(wrapper.html()).toContain('videoCall.youAreSharingScreen')
    })

    it('renders the avatar fallback when no video track is attached', () => {
      const wrapper = factory({ tile: buildTile() })
      expect(wrapper.find('.profileavatar').exists()).toBe(true)
    })

    it('shows the camera-disabled hint for the local user when large avatar', () => {
      const wrapper = factory({
        tile: buildTile({ isLocal: true }),
        avatarSize: 'large',
      })
      expect(wrapper.html()).toContain('videoCall.prejoin.cameraDisabled')
    })

    it('omits the camera-disabled hint when avatar is small', () => {
      const wrapper = factory({
        tile: buildTile({ isLocal: true }),
        avatarSize: 'small',
      })
      expect(wrapper.html()).not.toContain('videoCall.prejoin.cameraDisabled')
    })

    it('renders the spotlight marker when isSpotlighted', () => {
      const wrapper = factory({ isSpotlighted: true })
      expect(wrapper.find('.video-tile__pin').exists()).toBe(true)
    })

    it('does not render the audio element for the local participant', () => {
      const wrapper = factory({ tile: buildTile({ isLocal: true }) })
      expect(wrapper.find('audio').exists()).toBe(false)
    })

    it('applies the speaking class only when not a screen tile', () => {
      const speaking = factory({ isActiveSpeaker: true })
      expect(speaking.classes()).toContain('video-tile--speaking')
      const screen = factory({
        tile: buildTile({ isScreen: true }),
        isActiveSpeaker: true,
      })
      expect(screen.classes()).not.toContain('video-tile--speaking')
    })
  })

  describe('clickability', () => {
    it('emits select when clicked and clickable', async () => {
      const wrapper = factory({ clickable: true })
      await wrapper.trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')[0][0]).toEqual(wrapper.props('tile'))
    })

    it('does not emit when not clickable', async () => {
      const wrapper = factory({ clickable: false })
      await wrapper.trigger('click')
      expect(wrapper.emitted('select')).toBeFalsy()
    })

    it('sets role=button + tabindex only when clickable', () => {
      const c = factory({ clickable: true })
      expect(c.attributes('role')).toBe('button')
      expect(c.attributes('tabindex')).toBe('0')
      const nc = factory({ clickable: false })
      expect(nc.attributes('role')).toBeFalsy()
      expect(nc.attributes('tabindex')).toBeFalsy()
    })

    it('handles Enter key like a click', async () => {
      const wrapper = factory({ clickable: true })
      await wrapper.trigger('keydown.enter')
      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('prevents Space default and emits select when clickable', async () => {
      const wrapper = factory({ clickable: true })
      const preventDefault = jest.fn()
      wrapper.vm.onSpaceKey({ preventDefault })
      expect(preventDefault).toHaveBeenCalled()
      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('does not preventDefault Space when not clickable', () => {
      const wrapper = factory({ clickable: false })
      const preventDefault = jest.fn()
      wrapper.vm.onSpaceKey({ preventDefault })
      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('track attach/detach', () => {
    it('attaches video track on mount when present', () => {
      const videoTrack = buildTrack()
      factory({ tile: buildTile({ videoTrack }) })
      return Promise.resolve().then(() => {
        expect(videoTrack.attach).toHaveBeenCalled()
      })
    })

    it('attaches audio track on mount when present', () => {
      const audioTrack = buildTrack()
      factory({ tile: buildTile({ audioTrack }) })
      return Promise.resolve().then(() => {
        expect(audioTrack.attach).toHaveBeenCalled()
      })
    })

    it('detaches video and audio on unmount', async () => {
      const videoTrack = buildTrack()
      const audioTrack = buildTrack()
      const wrapper = factory({ tile: buildTile({ videoTrack, audioTrack }) })
      await wrapper.vm.$nextTick()
      wrapper.destroy()
      expect(videoTrack.detach).toHaveBeenCalled()
      expect(audioTrack.detach).toHaveBeenCalled()
    })

    it('replaces the previous video track when it changes', async () => {
      const oldTrack = buildTrack()
      const newTrack = buildTrack()
      const wrapper = factory({ tile: buildTile({ videoTrack: oldTrack }) })
      await wrapper.vm.$nextTick()
      await wrapper.setProps({ tile: buildTile({ videoTrack: newTrack }) })
      await wrapper.vm.$nextTick()
      expect(oldTrack.detach).toHaveBeenCalled()
      expect(newTrack.attach).toHaveBeenCalled()
    })

    it('does not attach video for the own-screen placeholder', async () => {
      const videoTrack = buildTrack()
      const wrapper = factory({
        tile: buildTile({ videoTrack, isScreen: true, isLocal: true }),
      })
      await wrapper.vm.$nextTick()
      expect(videoTrack.attach).not.toHaveBeenCalled()
    })

    it('swallows attach errors gracefully', async () => {
      const videoTrack = {
        attach: jest.fn(() => {
          throw new Error('boom')
        }),
        detach: jest.fn(),
      }
      expect(() => factory({ tile: buildTile({ videoTrack }) })).not.toThrow()
    })
  })

  describe('ended video tracks', () => {
    // A live MediaStreamTrack, plus the listener bookkeeping tests need.
    const buildMediaTrack = (readyState = 'live') => {
      const listeners = {}
      return {
        readyState,
        addEventListener: jest.fn((event, cb) => {
          listeners[event] = cb
        }),
        removeEventListener: jest.fn(),
        end: () => listeners.ended && listeners.ended(),
      }
    }

    it('replaces an ended screen share with a placeholder instead of a black box', async () => {
      const mediaStreamTrack = buildMediaTrack()
      const videoTrack = { ...buildTrack(), mediaStreamTrack }
      const wrapper = factory({ tile: buildTile({ videoTrack, isScreen: true }) })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hasVideo).toBe(true)

      // The sharer hits the browser's own "Stop sharing" bar: the track ends
      // before the unpublish message lands, and the <video> would otherwise
      // keep painting its last decoded frame.
      mediaStreamTrack.end()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hasVideo).toBe(false)
      expect(wrapper.html()).toContain('videoCall.screenShareEnded')
    })

    it('detects a track that had already ended before attaching', async () => {
      const videoTrack = { ...buildTrack(), mediaStreamTrack: buildMediaTrack('ended') }
      const wrapper = factory({ tile: buildTile({ videoTrack, isScreen: true }) })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hasVideo).toBe(false)
    })

    it('gives a replacement track a clean slate', async () => {
      const first = buildMediaTrack()
      const wrapper = factory({
        tile: buildTile({ videoTrack: { ...buildTrack(), mediaStreamTrack: first } }),
      })
      await wrapper.vm.$nextTick()
      first.end()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hasVideo).toBe(false)

      await wrapper.setProps({
        tile: buildTile({ videoTrack: { ...buildTrack(), mediaStreamTrack: buildMediaTrack() } }),
      })
      await wrapper.vm.$nextTick()
      // The old track ending says nothing about the new one.
      expect(wrapper.vm.hasVideo).toBe(true)
      expect(first.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
    })

    it('drops the listener on unmount', async () => {
      const mediaStreamTrack = buildMediaTrack()
      const wrapper = factory({
        tile: buildTile({ videoTrack: { ...buildTrack(), mediaStreamTrack } }),
      })
      await wrapper.vm.$nextTick()
      wrapper.destroy()
      expect(mediaStreamTrack.removeEventListener).toHaveBeenCalledWith(
        'ended',
        expect.any(Function),
      )
    })

    it('copes with tracks that expose no MediaStreamTrack', async () => {
      const wrapper = factory({ tile: buildTile({ videoTrack: buildTrack() }) })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hasVideo).toBe(true)
    })

    it('swallows removeEventListener errors', async () => {
      const mediaStreamTrack = buildMediaTrack()
      mediaStreamTrack.removeEventListener = jest.fn(() => {
        throw new Error('gone')
      })
      const wrapper = factory({
        tile: buildTile({ videoTrack: { ...buildTrack(), mediaStreamTrack } }),
      })
      await wrapper.vm.$nextTick()
      expect(() => wrapper.destroy()).not.toThrow()
    })
  })

  describe('sink id', () => {
    it('calls setSinkId on the audio element when changed', async () => {
      const wrapper = factory({ sinkId: 'speaker-1' })
      const setSinkId = jest.fn().mockResolvedValue(undefined)
      wrapper.vm.$refs.audioEl.setSinkId = setSinkId
      await wrapper.setProps({ sinkId: 'speaker-2' })
      await wrapper.vm.$nextTick()
      expect(setSinkId).toHaveBeenCalledWith('speaker-2')
    })

    it('is a no-op when setSinkId is unavailable', async () => {
      const wrapper = factory({ sinkId: 'speaker-1' })
      // audioEl has no setSinkId — should not throw
      await wrapper.setProps({ sinkId: 'speaker-2' })
      await wrapper.vm.$nextTick()
      expect(true).toBe(true)
    })

    it('silently catches setSinkId rejections', async () => {
      const wrapper = factory({ sinkId: 'speaker-1' })
      wrapper.vm.$refs.audioEl.setSinkId = jest.fn().mockRejectedValue(new Error('nope'))
      await expect(wrapper.vm.applySinkId()).resolves.toBeUndefined()
    })
  })
})

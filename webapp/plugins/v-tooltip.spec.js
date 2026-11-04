import { mount, createLocalVue } from '@vue/test-utils'
import VTooltip from 'v-tooltip'

import { options } from './v-tooltip'

const localVue = createLocalVue()
localVue.use(VTooltip, options)

// v-tooltip positions the tooltip in one animation frame and reveals it in the next; tearing it
// down before both have run makes it dispose twice.
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const showTooltip = async (tooltip) => {
  const wrapper = mount(
    { template: '<span v-tooltip="tooltip">anchor</span>', data: () => ({ tooltip }) },
    { localVue, attachTo: document.body },
  )
  wrapper.element._tooltip.show()
  await nextFrame()
  await nextFrame()
  return wrapper
}

describe('plugins/v-tooltip', () => {
  let wrapper

  afterEach(() => {
    wrapper.destroy()
  })

  it('shows content with markup as text', async () => {
    // A user or group name in a tooltip must not be read as HTML.
    const content = 'Chat with “<img src="x" data-test="injected">”'
    wrapper = await showTooltip(content)
    expect(document.querySelector('.tooltip-inner').innerText).toBe(content)
    expect(document.querySelector('[data-test="injected"]')).toBeNull()
  })

  it('still renders markup for a tooltip that asks for it', async () => {
    wrapper = await showTooltip({ content: '<b data-test="wanted">bold</b>', html: true })
    expect(document.querySelector('[data-test="wanted"]')).not.toBeNull()
  })
})

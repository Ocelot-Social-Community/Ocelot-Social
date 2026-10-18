import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { tooltipsFromTitles } from './tooltipsFromTitles'

import type { TitleTooltips } from './tooltipsFromTitles'

describe(tooltipsFromTitles, () => {
  let container: HTMLElement
  let titles: TitleTooltips | undefined

  const button = (title?: string) => {
    const element = document.createElement('button')
    if (title !== undefined) {
      element.title = title
    }
    return element
  }
  const tooltipOf = (element: Element) => {
    const id = element.getAttribute('aria-describedby')
    return id ? document.getElementById(id) : null
  }
  // MutationObserver callbacks run as a microtask.
  const flush = async () => {
    await Promise.resolve()
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    titles?.destroy()
    titles = undefined
    container.remove()
  })

  it('turns the titles already there into tooltips, without the title', () => {
    const zoom = button('Zoom in')
    container.append(zoom)

    titles = tooltipsFromTitles(container)

    expect(zoom.hasAttribute('title')).toBe(false)
    expect(tooltipOf(zoom)?.textContent).toBe('Zoom in')
  })

  it('passes the options on', () => {
    const zoom = button('Zoom in')
    container.append(zoom)

    titles = tooltipsFromTitles(container, { placement: 'left', narrow: true })

    expect(tooltipOf(zoom)?.classList).toContain('os-tooltip--narrow')
  })

  it('leaves elements without a title alone', () => {
    const plain = button()
    container.append(plain)

    titles = tooltipsFromTitles(container)

    expect(plain.hasAttribute('aria-describedby')).toBe(false)
  })

  it('takes up elements added later, nested ones included', async () => {
    titles = tooltipsFromTitles(container)
    const group = document.createElement('div')
    group.title = 'Tools'
    const locate = button('Find my location')
    group.append(locate)

    container.append(group)
    await flush()

    expect(tooltipOf(group)?.textContent).toBe('Tools')
    expect(tooltipOf(locate)?.textContent).toBe('Find my location')
  })

  it('ignores added text', async () => {
    titles = tooltipsFromTitles(container)

    container.append('text')
    await flush()

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('follows a changed title, as on the fullscreen button', async () => {
    const fullscreen = button('Enter fullscreen')
    container.append(fullscreen)
    titles = tooltipsFromTitles(container)
    const tooltip = tooltipOf(fullscreen)

    fullscreen.title = 'Exit fullscreen'
    await flush()

    expect(fullscreen.hasAttribute('title')).toBe(false)
    expect(tooltipOf(fullscreen)).toBe(tooltip)
    expect(tooltip?.textContent).toBe('Exit fullscreen')
  })

  it('takes up a title given to an element later', async () => {
    const zoom = button()
    container.append(zoom)
    titles = tooltipsFromTitles(container)

    zoom.title = 'Zoom in'
    await flush()

    expect(tooltipOf(zoom)?.textContent).toBe('Zoom in')
  })

  it('removes the tooltip of an element that leaves, nested ones included', async () => {
    const group = document.createElement('div')
    const zoom = button('Zoom in')
    group.append(zoom)
    const other = button('Zoom out')
    container.append(group, other)
    titles = tooltipsFromTitles(container)
    const tooltip = tooltipOf(zoom)

    group.remove()
    await flush()

    expect(tooltip?.isConnected).toBe(false)
    expect(tooltipOf(other)?.textContent).toBe('Zoom out')
  })

  it('keeps the tooltip of an element moved within the container', async () => {
    const zoom = button('Zoom in')
    const group = document.createElement('div')
    container.append(zoom, group)
    titles = tooltipsFromTitles(container)
    const tooltip = tooltipOf(zoom)

    group.append(zoom)
    await flush()

    expect(tooltip?.isConnected).toBe(true)
    expect(tooltipOf(zoom)).toBe(tooltip)
  })

  it('removes every tooltip and stops watching on destroy', async () => {
    const zoom = button('Zoom in')
    container.append(zoom)
    titles = tooltipsFromTitles(container)
    const tooltip = tooltipOf(zoom)

    titles.destroy()
    titles = undefined
    container.append(button('Zoom out'))
    await flush()

    expect(tooltip?.isConnected).toBe(false)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
  })
})

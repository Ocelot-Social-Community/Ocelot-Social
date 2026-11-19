import { takeFocus, trapFocus } from './dialogFocus'

const tab = (shiftKey = false) => ({ key: 'Tab', shiftKey, preventDefault: jest.fn() })

const dialog = (html) => {
  const container = document.createElement('div')
  container.tabIndex = -1
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('trapFocus', () => {
  it('goes on from the last element to the first, and back from the first to the last', () => {
    const container = dialog(
      '<button id="a">a</button><button disabled>x</button><button id="b">b</button>',
    )
    const [a, b] = [container.querySelector('#a'), container.querySelector('#b')]
    b.focus()
    const forward = tab()
    trapFocus(container, forward)
    expect(forward.preventDefault).toHaveBeenCalled()
    expect(document.activeElement).toBe(a)
    const backward = tab(true)
    trapFocus(container, backward)
    expect(backward.preventDefault).toHaveBeenCalled()
    expect(document.activeElement).toBe(b)
  })

  it('counts the dialog itself as the start', () => {
    const container = dialog('<button id="a">a</button><button id="b">b</button>')
    container.focus()
    trapFocus(container, tab(true))
    expect(document.activeElement).toBe(container.querySelector('#b'))
  })

  it('lets Tab go its way inside the dialog', () => {
    const container = dialog('<button id="a">a</button><button id="b">b</button>')
    container.querySelector('#a').focus()
    const forward = tab()
    trapFocus(container, forward)
    expect(forward.preventDefault).not.toHaveBeenCalled()
    const backward = tab(true)
    container.querySelector('#b').focus()
    trapFocus(container, backward)
    expect(backward.preventDefault).not.toHaveBeenCalled()
  })

  it('keeps the focus in a dialog with nothing to go to', () => {
    const container = dialog('<p>nothing</p>')
    const event = tab()
    trapFocus(container, event)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('leaves other keys, and a dialog not there, alone', () => {
    const container = dialog('<button>a</button>')
    const enter = { key: 'Enter', preventDefault: jest.fn() }
    trapFocus(container, enter)
    expect(enter.preventDefault).not.toHaveBeenCalled()
    const event = tab()
    trapFocus(null, event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})

describe('takeFocus', () => {
  it('moves the focus to what is marked for it, and gives it back where it was', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const container = dialog('<button>a</button><select data-autofocus></select>')
    const giveBack = takeFocus(container)
    expect(document.activeElement).toBe(container.querySelector('select'))
    giveBack()
    expect(document.activeElement).toBe(opener)
  })

  it('moves the focus to the dialog itself when nothing is marked for it', () => {
    const container = dialog('<button>a</button>')
    takeFocus(container)
    expect(document.activeElement).toBe(container)
  })

  it('gives it to the fallback when where it was has left the page', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const fallback = document.createElement('button')
    document.body.appendChild(fallback)
    const container = dialog('<button data-autofocus>a</button>')
    const giveBack = takeFocus(container, () => fallback)
    opener.remove()
    giveBack()
    expect(document.activeElement).toBe(fallback)
  })

  it('gives it to the fallback when it came from nowhere, and to nothing without one', () => {
    document.activeElement.blur()
    const fallback = document.createElement('button')
    document.body.appendChild(fallback)
    const container = dialog('<button data-autofocus>a</button>')
    takeFocus(container, () => fallback)()
    expect(document.activeElement).toBe(fallback)
    const button = container.querySelector('button')
    button.focus()
    document.activeElement.blur()
    takeFocus(container)()
    expect(document.activeElement).toBe(button)
  })
})

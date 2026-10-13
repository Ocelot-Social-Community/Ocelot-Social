import { cleanCutHeight, contentAtoms } from './cleanCut'

// Lines of 20px, as a paragraph renders them.
const lines = (count, { from = 0, height = 20 } = {}) =>
  Array.from({ length: count }, (_, i) => ({
    top: from + i * height,
    bottom: from + (i + 1) * height,
  }))

describe('cleanCutHeight', () => {
  it('cuts below the last line that fits whole under the cap', () => {
    // A cap of 70px would show half of the fourth line.
    expect(cleanCutHeight(lines(6), 70)).toBe(60)
  })

  it('keeps a line that ends exactly at the cap', () => {
    expect(cleanCutHeight(lines(6), 60)).toBe(60)
  })

  it('tolerates the fractional edges line boxes report', () => {
    expect(cleanCutHeight(lines(6, { height: 19.8 }), 59.5)).toBe(60)
  })

  it('does not cut through an image beside the last fitting line', () => {
    // Text lines at 0–20 and 20–40; an inline image from 20 to 90 shares the second line.
    const atoms = [...lines(2), { top: 20, bottom: 90 }]

    expect(cleanCutHeight(atoms, 70)).toBe(20)
  })

  it('cuts above a heading that would be sliced, not inside it', () => {
    // Two lines, then a 32px heading line from 40 to 72.
    const atoms = [...lines(2), { top: 40, bottom: 72 }]

    expect(cleanCutHeight(atoms, 60)).toBe(40)
  })

  it('leaves the cap standing when not even the first line fits', () => {
    expect(cleanCutHeight([{ top: 0, bottom: 300 }], 60)).toBeNull()
  })

  it('leaves the cap standing when there is nothing to measure', () => {
    expect(cleanCutHeight([], 60)).toBeNull()
  })

  it('rounds the cut up to a whole pixel, so the last line is not clipped by rounding', () => {
    expect(cleanCutHeight([{ top: 0, bottom: 19.2 }], 60)).toBe(20)
  })
})

describe('contentAtoms', () => {
  // jsdom computes no layout and implements no Range rects: nothing to measure, which the
  // caller reads as "keep the cap".
  it('reports nothing where the browser gives no geometry', () => {
    const content = document.createElement('div')
    content.innerHTML = '<p>Some text</p><img src="x.png">'

    expect(contentAtoms(content)).toEqual([])
  })

  describe('with geometry', () => {
    let restore

    beforeEach(() => {
      const createRange = document.createRange.bind(document)
      document.createRange = () => {
        const range = createRange()
        range.getClientRects = () => {
          const text = range.startContainer.textContent
          // One rect per word: a line each, 20px tall, in document order.
          return text
            .split(' ')
            .map((_, i) => ({ height: 20, top: 100 + i * 20, bottom: 120 + i * 20 }))
        }
        return range
      }
      restore = () => {
        document.createRange = createRange
      }
    })

    afterEach(() => restore())

    it('measures text per line and images as one box, relative to the content', () => {
      const content = document.createElement('div')
      content.innerHTML = '<p>two words</p><p>   </p><img src="x.png">'
      content.getBoundingClientRect = () => ({ top: 100 })
      content.querySelector('img').getBoundingClientRect = () => ({
        height: 50,
        top: 140,
        bottom: 190,
      })

      expect(contentAtoms(content)).toEqual([
        { top: 0, bottom: 20 },
        { top: 20, bottom: 40 },
        { top: 40, bottom: 90 },
      ])
    })

    it('skips boxes without height, such as an image that has not loaded', () => {
      const content = document.createElement('div')
      content.innerHTML = '<img src="x.png">'
      content.getBoundingClientRect = () => ({ top: 0 })
      content.querySelector('img').getBoundingClientRect = () => ({ height: 0, top: 0, bottom: 0 })

      expect(contentAtoms(content)).toEqual([])
    })
  })
})

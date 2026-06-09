// Test pasteRule against thin ProseMirror Fragment/Slice/Node shape mocks.
// The plugin only reads .forEach, .isText, .text, .cut, .copy and .content
// on the nodes it walks. To avoid running prosemirror-model's real
// Fragment/Slice/Plugin constructors (which expect properly typed Nodes),
// we mock them with cooperative test doubles.

import pasteRule from './pasteRule'

jest.mock('prosemirror-state', () => ({
  // Plugin just stashes its spec so we can introspect it.
  Plugin: function (spec) {
    this.spec = spec
  },
}))

jest.mock('prosemirror-model', () => ({
  Fragment: { fromArray: (nodes) => ({ _nodes: nodes }) },
  Slice: function (content, openStart, openEnd) {
    return { content, openStart, openEnd }
  },
}))

const textNode = (text) => ({
  isText: true,
  text,
  cut: jest.fn((from, to = text.length) => textNode(text.slice(from, to))),
})

const blockNode = (children) => ({
  isText: false,
  content: fragment(children),
  copy: jest.fn((newContent) => ({ ...blockNode([]), content: newContent })),
})

const fragment = (nodes) => ({
  forEach: (cb) => nodes.forEach(cb),
  _nodes: nodes,
})

const slice = (nodes, openStart = 0, openEnd = 0) => ({
  content: fragment(nodes),
  openStart,
  openEnd,
})

describe('pasteRule', () => {
  it('returns a ProseMirror Plugin with a transformPasted hook', () => {
    const plugin = pasteRule(/foo/g, { create: jest.fn() }, {})
    expect(plugin).toBeDefined()
    // Plugin spec wraps the actual handler in plugin.props.
    expect(typeof plugin.spec.props.transformPasted).toBe('function')
  })

  it('replaces a matched text node with the schema type and preserves surrounding text', () => {
    let lastAttrsCall
    const type = { create: jest.fn((attrs, sliceNode) => ({ TYPE: true, attrs, sliceNode })) }
    // Use a plain arrow function so `instanceof Function` holds reliably.
    const getAttrs = (matched) => {
      lastAttrsCall = matched
      return { href: 'x' }
    }
    const plugin = pasteRule(/bar/g, type, getAttrs)

    const node = textNode('foo bar baz')
    const result = plugin.spec.props.transformPasted(slice([node]))

    expect(node.cut).toHaveBeenCalledWith(0, 4)
    expect(type.create).toHaveBeenCalledTimes(1)
    expect(lastAttrsCall).toBe('bar')
    expect(node.cut).toHaveBeenCalledWith(7) // tail
    expect(result.content._nodes).toHaveLength(3)
    expect(result.content._nodes[1]).toMatchObject({ TYPE: true, attrs: { href: 'x' } })
  })

  it('accepts a non-function getAttrs and forwards it verbatim', () => {
    const type = { create: jest.fn((attrs) => ({ TYPE: true, attrs })) }
    const attrs = { href: 'static' }
    const plugin = pasteRule(/x/g, type, attrs)

    const node = textNode('x')
    const result = plugin.spec.props.transformPasted(slice([node]))
    expect(result.content._nodes[0]).toMatchObject({ TYPE: true, attrs: { href: 'static' } })
  })

  it('handles multiple matches in the same text node', () => {
    const type = { create: jest.fn((attrs, sliceNode) => ({ TYPE: true })) }
    const plugin = pasteRule(/X/g, type, {})

    const node = textNode('aXbXc')
    const result = plugin.spec.props.transformPasted(slice([node]))
    // Expected output: text('a'), TYPE, text('b'), TYPE, text('c')
    // 2 matches × 2 created TYPE nodes
    expect(type.create).toHaveBeenCalledTimes(2)
    expect(result.content._nodes.length).toBe(5)
  })

  it('leaves a text node without matches untouched', () => {
    const type = { create: jest.fn(() => ({ TYPE: true })) }
    const plugin = pasteRule(/zzz/g, type, {})

    const node = textNode('plain text')
    const result = plugin.spec.props.transformPasted(slice([node]))
    expect(type.create).not.toHaveBeenCalled()
    // Single text node passed through via cut(0)
    expect(node.cut).toHaveBeenCalledWith(0)
    expect(result.content._nodes).toHaveLength(1)
  })

  it('recurses into block nodes via .copy(handler(content))', () => {
    const type = { create: jest.fn(() => ({ TYPE: true })) }
    const inner = textNode('match X here')
    const block = blockNode([inner])
    const plugin = pasteRule(/X/g, type, {})

    const result = plugin.spec.props.transformPasted(slice([block]))
    expect(block.copy).toHaveBeenCalled()
    // The inner text was processed and the block re-wrapped.
    expect(type.create).toHaveBeenCalledTimes(1)
    expect(result.content._nodes).toHaveLength(1)
  })

  it('preserves openStart / openEnd from the input slice', () => {
    const plugin = pasteRule(/X/g, { create: jest.fn() }, {})
    const result = plugin.spec.props.transformPasted(slice([textNode('aXb')], 2, 3))
    expect(result.openStart).toBe(2)
    expect(result.openEnd).toBe(3)
  })
})

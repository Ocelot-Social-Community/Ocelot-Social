import { describe, expect, it } from 'vitest'

import { cleanHtml as sanitize, removeHtmlTags } from './cleanHtml'

// This is the XSS boundary of the whole application: everything a user writes into a post, a
// comment or a report description passes through `cleanHtml` on its way in (xssMiddleware) and is
// rendered as HTML by the webapp afterwards. What the allow-list lets through is therefore what
// ends up in every reader's browser, and these tests are the record of that decision — a tag
// silently gaining admission (or an attribute surviving a library upgrade) is a stored XSS, not a
// formatting regression.

// The middleware always passes the field key along (it is part of the callback contract of
// walkRecursive), and the helper's signature requires it — so the calls below go through a
// wrapper that supplies one instead of repeating it in every case.
//
// sanitize-html ships no types, so the options parameter is inferred from the default value —
// the exact shape of the standard option set. The cast is what lets a case pass a narrower set;
// it is the same `any` the module itself works with.
const cleanHtml = (dirty: unknown, options?: Record<string, unknown>): unknown =>
  sanitize(dirty, 'content', options as Parameters<typeof sanitize>[2])

describe(cleanHtml, () => {
  // Guard before the pipeline: linkify and sanitize-html both throw on a non-string, and the
  // middleware walks GraphQL arguments where an optional field is legitimately absent.
  it.each([['', ''] as const, [null, null] as const, [undefined, undefined] as const])(
    'returns %s unchanged',
    (input, expected) => {
      expect(cleanHtml(input)).toBe(expected)
    },
  )

  describe('script execution', () => {
    // Tag AND content: dropping only the tag would leave `alert(1)` as visible text, but keeping
    // the tag while escaping nothing is what turns a post into a payload.
    it('removes a script element with its content', () => {
      expect(cleanHtml('<script>alert(1)</script>hello')).toBe('hello')
    })

    it('removes a style element', () => {
      expect(cleanHtml('<style>body{display:none}</style>text')).toBe('text')
    })

    // Not in the allow-list, and famously the payload that survives naive tag blacklists.
    it('removes an svg element', () => {
      expect(cleanHtml('<svg/onload=alert(1)>')).toBe('')
    })

    // Frames are how a post would embed a foreign page — the allowedIframeHostnames setting only
    // matters if `iframe` were allowed at all, and it is not.
    it.each(['<iframe src="https://evil.example"></iframe>', '<object data="x"></object>'])(
      'removes %s',
      (dirty) => {
        expect(cleanHtml(dirty)).toBe('')
      },
    )

    // Event handlers are the second half of the attack surface: the tag stays, the attribute must
    // not. `img` is allowed to carry `src`, which makes `onerror` the classic self-firing payload.
    it('strips event handler attributes but keeps the element', () => {
      expect(cleanHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x" />')
      expect(cleanHtml('<b onclick="alert(1)">y</b>')).toBe('<strong>y</strong>')
      expect(cleanHtml('<a href="https://x.example" onmouseover="alert(1)">l</a>')).toBe(
        '<a href="https://x.example" target="_blank">l</a>',
      )
    })

    // A URL scheme is executable content too. Both survive as an anchor/image, but without the
    // href/src that would run.
    it.each([
      ['<a href="javascript:alert(1)">click</a>', '<a target="_blank">click</a>'],
      ['<a href="data:text/html,<script>alert(1)</script>">x</a>', '<a target="_blank">x</a>'],
      ['<img src="javascript:alert(1)">', '<img />'],
    ])('strips the executable URL in %s', (dirty, expected) => {
      expect(cleanHtml(dirty)).toBe(expected)
    })
  })

  describe('what stays', () => {
    // The editor's formatting vocabulary. Removing any of these would not be a security fix, it
    // would silently rewrite existing posts on their next save.
    it('keeps the allowed formatting elements', () => {
      expect(cleanHtml('<p>a<strong>b</strong><em>c</em><u>d</u></p><ul><li>e</li></ul>')).toBe(
        '<p>a<strong>b</strong><em>c</em><u>d</u></p><ul><li>e</li></ul>',
      )
    })

    // Mentions and hashtags are rendered as anchors and spans carrying `data-*` and `class`; the
    // webapp routes on those attributes, so they have to survive sanitising.
    it('keeps the attributes mentions rely on', () => {
      expect(
        cleanHtml('<span contenteditable="false" class="mention" data-id="u1">@peter</span>'),
      ).toBe('<span contenteditable="false" class="mention" data-id="u1">@peter</span>')
    })

    // Every outbound link opens in a new tab — the editor does not write `target` itself, this
    // transform does.
    it('opens links in a new tab', () => {
      expect(cleanHtml('<a href="https://ocelot.social">l</a>')).toBe(
        '<a href="https://ocelot.social" target="_blank">l</a>',
      )
    })

    // `attribs.href || ''` — an anchor without an href must still come out as a well-formed tag
    // rather than `href="undefined"`.
    it('tolerates an anchor without an href', () => {
      expect(cleanHtml('<a>no href</a>')).toBe('<a target="_blank">no href</a>')
    })

    // Plain URLs are turned into links BEFORE sanitising, so linkify's output has to pass the
    // allow-list as well — which is what makes it safe to run on user text at all.
    it('linkifies a bare URL', () => {
      expect(cleanHtml('visit https://ocelot.social now')).toBe(
        'visit <a href="https://ocelot.social" target="_blank">https://ocelot.social</a> now',
      )
    })

    // Headings are normalised down: a post must not be able to render at page-title size.
    it('maps the heading levels into the two the design has', () => {
      expect(cleanHtml('<h1>a</h1><h2>b</h2><h5>c</h5>')).toBe(
        '<h3>a</h3><h3>b</h3><strong>c</strong>',
      )
    })

    it('normalises presentational tags to semantic ones', () => {
      expect(cleanHtml('<b>a</b><i>b</i>')).toBe('<strong>a</strong><em>b</em>')
    })

    // `lowerCaseTags` — otherwise `<P>` and `<p>` would be two different tags to every regex
    // below, and pasted Word/Outlook markup arrives upper-cased.
    it('lower-cases tag names', () => {
      expect(cleanHtml('<P>UPPER</P>')).toBe('<p>UPPER</p>')
    })
  })

  describe('whitespace normalisation', () => {
    // Contenteditable output is full of these: pasting text produces empty paragraphs and runs of
    // <br>, and without the collapsing a post grows a page of blank space per edit.
    it('drops elements containing nothing but whitespace', () => {
      expect(cleanHtml('<p>hi</p><p>   </p>')).toBe('<p>hi</p>')
    })

    it('collapses a run of line breaks to a single one', () => {
      expect(cleanHtml('<p>text<br><br><br>more</p>')).toBe('<p>text<br>more</p>')
    })

    it('removes line breaks between block elements', () => {
      expect(cleanHtml('<p>a</p><br><br><br><p>b</p>')).toBe('<p>a</p><p>b</p>')
    })

    it('removes leading and trailing line breaks inside a paragraph', () => {
      expect(cleanHtml('<p><br><br>text<br></p>')).toBe('<p>text</p>')
    })

    it('collapses more than two consecutive newlines', () => {
      expect(cleanHtml('a\n\n\n\n\nb')).toBe('a<br>b')
    })
  })

  // The middleware passes the field name as the second argument (it is part of the callback
  // contract of walkRecursive) and nothing here may depend on it.
  it('ignores the key it is called with', () => {
    expect(sanitize('<b>x</b>', 'content')).toBe(sanitize('<b>x</b>', 'description'))
  })

  // The options are a parameter so a caller can narrow the allow-list further; the default set is
  // the one the middleware uses.
  it('honours caller-supplied sanitize options', () => {
    expect(cleanHtml('<b>x</b><i>y</i>', { allowedTags: ['i'], allowedAttributes: {} })).toBe(
      'x<i>y</i>',
    )
  })
})

describe(removeHtmlTags, () => {
  // Used where the value must not be markup at all — notification and e-mail texts, where the
  // "HTML" would be shown to the reader verbatim or interpreted by a mail client.
  it('reduces markup to its text, dropping script content entirely', () => {
    expect(removeHtmlTags('<p>a<script>evil()</script>c</p>')).toBe('ac')
  })

  it('keeps plain text unchanged', () => {
    expect(removeHtmlTags('just text')).toBe('just text')
  })
})

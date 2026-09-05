import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import xssMiddleware from './xssMiddleware'

import type { GraphQLResolveInfo } from 'graphql'

// The place where user markup is actually disarmed. `cleanHtml` decides WHAT is dangerous; this
// middleware decides WHERE it is applied — and a field the walk never reaches is stored raw and
// rendered as HTML later, which is a stored XSS however good the sanitiser is.
//
// Two things are therefore pinned here: the set of keys that get cleaned (rich-text fields only —
// sanitising a slug or a password would corrupt it), and that the walk finds those keys wherever
// they sit in the argument tree, not just at the top level.

const info = (fieldName: string) => ({ fieldName }) as GraphQLResolveInfo

// Captures what the middleware handed on. For a mutation that is the interesting side: the
// arguments the actual resolver — and with it the database — gets to see.
const spyResolver = () => {
  const seen: unknown[] = []
  const resolve = async (_root: unknown, args: unknown) => {
    await Promise.resolve()
    seen.push(args)
    return args
  }
  return { resolve, seen }
}

const runMutation = async (args: unknown, fieldName = 'CreatePost') => {
  const { resolve, seen } = spyResolver()
  await xssMiddleware.Mutation(resolve, null, args, {}, info(fieldName))
  return seen[0] as Record<string, unknown>
}

const XSS = '<script>alert(1)</script>text'

describe('Mutation xss middleware', () => {
  // Cleaned BEFORE the resolver runs: the value must never reach the database as markup, because
  // everything read back out of it is trusted by the renderer.
  it('sanitises the content of a post on its way in', async () => {
    const args = await runMutation({ id: 'p1', content: XSS })

    expect(args.content).toBe('text')
  })

  // Report reasons are rendered in the moderation UI — an unsanitised one would fire in a
  // moderator's session, which is the most privileged session there is.
  it('sanitises a report reason', async () => {
    const args = await runMutation({ reasonDescription: XSS }, 'fileReport')

    expect(args.reasonDescription).toBe('text')
  })

  it('sanitises a description', async () => {
    const args = await runMutation({ description: XSS }, 'CreateGroup')

    expect(args.description).toBe('text')
  })

  // The list is an allow-list of RICH-TEXT fields, not a general "clean every string" pass.
  // Running the HTML sanitiser over a slug, a name or a password would silently rewrite the value
  // — `&` becomes `&amp;`, anything angle-bracketed disappears.
  it('leaves fields outside the list untouched', async () => {
    const args = await runMutation({
      name: 'Tom & Jerry',
      slug: 'tom-jerry',
      password: '<super>secret</super>',
    })

    expect(args).toEqual({
      name: 'Tom & Jerry',
      slug: 'tom-jerry',
      password: '<super>secret</super>',
    })
  })

  // Chat messages carry `content` too, but they are excluded by operation name: they are rendered
  // as text, and sanitising them would eat a message that legitimately contains angle brackets —
  // code snippets are the everyday case.
  it.each(['CreateMessage', 'Message'])('does not sanitise content for %s', async (fieldName) => {
    const args = await runMutation({ content: XSS }, fieldName)

    expect(args.content).toBe(XSS)
  })

  // Same key, different operation: the exclusion is per operation, so a post created through
  // CreatePost is still cleaned even though CreateMessage is not.
  it('still sanitises content for other operations', async () => {
    const args = await runMutation({ content: XSS }, 'UpdatePost')

    expect(args.content).toBe('text')
  })

  // `description` is excluded for the embed query only, where the value is the scraped
  // description of a foreign page rather than something a user typed.
  it('does not sanitise the description of an embed', async () => {
    const args = await runMutation({ description: XSS }, 'embed')

    expect(args.description).toBe(XSS)
  })

  // Arguments are not flat. A nested input object is the normal shape for group and post
  // mutations, and a walk that stopped at the top level would let the payload through unnoticed.
  it('descends into nested input objects', async () => {
    const args = await runMutation({ group: { name: 'g', description: XSS } })

    expect(args.group).toEqual({ name: 'g', description: 'text' })
  })

  it('descends into arrays of input objects', async () => {
    const args = await runMutation({ posts: [{ content: XSS }, { content: '<b>ok</b>' }] })

    expect(args.posts).toEqual([{ content: 'text' }, { content: '<strong>ok</strong>' }])
  })

  // Only strings are sanitised; everything else has to survive the walk with its type intact, or
  // a boolean flag would arrive at the resolver as something else entirely.
  it('passes non-string values through unchanged', async () => {
    const args = await runMutation({ content: 42, description: true, reasonDescription: null })

    expect(args).toEqual({ content: 42, description: true, reasonDescription: null })
  })
})

describe('Query xss middleware', () => {
  // Cleaned on the way OUT, because the database is not a trusted source for these fields: rows
  // predate the middleware, are imported, or were written by another writer. The sanitising is
  // what makes rendering them as HTML safe.
  it('sanitises the resolved result', async () => {
    const result = (await xssMiddleware.Query(
      async () => {
        await Promise.resolve()
        return { content: XSS }
      },
      null,
      {},
      {},
      info('Post'),
    )) as { content: string }

    expect(result.content).toBe('text')
  })

  it('sanitises every element of a resolved list', async () => {
    const result = (await xssMiddleware.Query(
      async () => {
        await Promise.resolve()
        return [{ content: XSS }, { content: 'plain' }]
      },
      null,
      {},
      {},
      info('Post'),
    )) as Array<{ content: string }>

    expect(result).toEqual([{ content: 'text' }, { content: 'plain' }])
  })

  // The resolver's promise has to be awaited before the walk: walking the promise object itself
  // would return it untouched, and the field would be served raw.
  it('awaits the resolver before walking its result', async () => {
    const result = (await xssMiddleware.Query(
      async () => {
        // A real resolver resolves on a later tick — a database round trip, at least.
        await delay(1)
        return { reasonDescription: XSS }
      },
      null,
      {},
      {},
      info('reports'),
    )) as { reasonDescription: string }

    expect(result.reasonDescription).toBe('text')
  })
})

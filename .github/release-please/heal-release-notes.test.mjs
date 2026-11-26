import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DEFAULT_LABEL, NotesLostError, OVERFLOW_MESSAGE, createGitHub, healReleaseNotes, labelsOf, main, notesBranchOf } from './heal-release-notes.mjs'

const RELEASE = 'release-please--branches--master--components--ocelot-social'
const NOTES = `${RELEASE}--release-notes`
const overflowBody = (branch = NOTES) =>
  `:robot: I have created a release *beep* *boop*\n---\n\n\n${OVERFLOW_MESSAGE} https://github.com/o/r/blob/${branch}/release-notes.md`

test('notesBranchOf reads the branch out of an overflowed body', () => {
  assert.equal(notesBranchOf(overflowBody()), NOTES)
})

test('notesBranchOf is null for a body that did not overflow, or links somewhere unreadable', () => {
  assert.equal(notesBranchOf(':robot: I have created a release\n## 3.22.0'), null)
  assert.equal(notesBranchOf(null), null)
  assert.equal(notesBranchOf(`${OVERFLOW_MESSAGE} not a url`), null)
  assert.equal(notesBranchOf(`${OVERFLOW_MESSAGE} https://github.com/o/r/pull/1`), null)
})

test('labelsOf reads `label` the way release-please does, with its default', () => {
  assert.deepEqual(labelsOf({}), [DEFAULT_LABEL])
  assert.deepEqual(labelsOf({ label: 'autorelease: pending (ui)' }), ['autorelease: pending (ui)'])
  assert.deepEqual(labelsOf({ label: 'a, b' }), ['a', 'b'])
})

// An in-memory repository holding just what the heal looks at: branch heads, which commits carry
// release-notes.md, the activity log of each ref, and the release pull requests.
function fakeRepo({ heads = {}, withNotes = [], activity = {}, pulls = [] } = {}) {
  const calls = []
  return {
    heads,
    calls,
    async releasePullRequests(labels) {
      calls.push(['releasePullRequests', labels])
      return pulls
    },
    async hasNotes(ref) {
      return withNotes.includes(heads[ref] ?? ref)
    },
    async refActivity(branch) {
      return activity[branch] ?? []
    },
    async pointBranchAt(branch, sha) {
      calls.push(['pointBranchAt', branch, sha])
      heads[branch] = sha
    },
  }
}

const openPr = (body = overflowBody()) => ({ state: 'open', merged: false, body })

test('the incident: a force-reset without the follow-up commit is restored to the last notes commit', async () => {
  // Ref activity of the notes branch on 2026-11-25, newest first.
  const github = fakeRepo({
    heads: { [NOTES]: 'cd84822' },
    withNotes: ['b07d559', '06245ad'],
    activity: {
      [NOTES]: [
        { activity_type: 'force_push', before: 'b07d559', after: 'cd84822' },
        { activity_type: 'push', before: 'd971b7a', after: 'b07d559' },
        { activity_type: 'force_push', before: '06245ad', after: 'd971b7a' },
        { activity_type: 'push', before: '258f9d9', after: '06245ad' },
      ],
    },
    pulls: [openPr()],
  })
  const results = await healReleaseNotes({ github, labels: [DEFAULT_LABEL] })
  assert.deepEqual(results, [{ branch: NOTES, status: 'restored', sha: 'b07d559' }])
  assert.equal(github.heads[NOTES], 'b07d559')
})

test('an intact notes branch is left alone', async () => {
  const github = fakeRepo({ heads: { [NOTES]: 'f468a33' }, withNotes: ['f468a33'], pulls: [openPr()] })
  assert.deepEqual(await healReleaseNotes({ github, labels: [DEFAULT_LABEL] }), [{ branch: NOTES, status: 'intact' }])
  assert.equal(github.calls.some(([name]) => name === 'pointBranchAt'), false)
})

test('nothing to do when no release pull request overflowed', async () => {
  const lines = []
  const github = fakeRepo({ pulls: [openPr('## 3.22.0 (2026-11-26)')] })
  assert.deepEqual(await healReleaseNotes({ github, labels: [DEFAULT_LABEL], log: (l) => lines.push(l) }), [])
  assert.match(lines.join('\n'), /links overflowed notes/)
})

test('the labels passed are the ones searched by', async () => {
  const github = fakeRepo()
  await healReleaseNotes({ github, labels: ['autorelease: pending (ui)'] })
  assert.deepEqual(github.calls[0], ['releasePullRequests', ['autorelease: pending (ui)']])
})

test('a merged, untagged release pull request is healed too — its notes become the release', async () => {
  const github = fakeRepo({
    heads: { [NOTES]: 'bare' },
    withNotes: ['good'],
    activity: { [NOTES]: [{ after: 'bare' }, { after: 'good' }] },
    pulls: [{ state: 'closed', merged: true, body: overflowBody() }],
  })
  assert.equal((await healReleaseNotes({ github, labels: [DEFAULT_LABEL] }))[0].status, 'restored')
})

test('a closed, unmerged pull request is not consulted by release-please, so not here either', async () => {
  const github = fakeRepo({ pulls: [{ state: 'closed', merged: false, body: overflowBody() }] })
  assert.deepEqual(await healReleaseNotes({ github, labels: [DEFAULT_LABEL] }), [])
})

test('two pull requests linking the same branch heal it once', async () => {
  const github = fakeRepo({
    heads: { [NOTES]: 'bare' },
    withNotes: ['good'],
    activity: { [NOTES]: [{ after: 'bare' }, { after: 'good' }] },
    pulls: [openPr(), { state: 'closed', merged: true, body: overflowBody() }],
  })
  await healReleaseNotes({ github, labels: [DEFAULT_LABEL] })
  assert.equal(github.calls.filter(([name]) => name === 'pointBranchAt').length, 1)
})

test('deletions and repeated SHAs in the history are skipped', async () => {
  const checked = []
  const github = fakeRepo({
    heads: {},
    withNotes: ['good'],
    activity: {
      [NOTES]: [{ after: '0000000000000000000000000000000000000000' }, { after: 'bare' }, { before: 'x', after: 'bare' }, {}, { after: 'good' }],
    },
    pulls: [openPr()],
  })
  const hasNotes = github.hasNotes
  github.hasNotes = async (ref) => (checked.push(ref), hasNotes(ref))
  await healReleaseNotes({ github, labels: [DEFAULT_LABEL] })
  assert.deepEqual(checked, [NOTES, 'bare', 'good'])
  assert.equal(github.heads[NOTES], 'good')
})

test('no commit with the file in the history is an error that says what to do', async () => {
  const github = fakeRepo({ heads: { [NOTES]: 'bare' }, activity: { [NOTES]: [{ after: 'bare' }] }, pulls: [openPr()] })
  await assert.rejects(healReleaseNotes({ github, labels: [DEFAULT_LABEL] }), (error) => {
    assert.ok(error instanceof NotesLostError)
    assert.match(error.message, /has no release-notes\.md, and none of the 1 commits.*placeholder/s)
    return true
  })
})

test('a linked branch that is not a release-please notes branch is never touched', async () => {
  // A changelog entry is free text from a commit subject and can carry the overflow sentence too.
  const lines = []
  const github = fakeRepo({
    heads: { master: 'bare' },
    withNotes: ['good'],
    activity: { master: [{ after: 'good' }] },
    pulls: [openPr(overflowBody('master')), openPr(overflowBody('release-please--x')), openPr(overflowBody('feature--release-notes'))],
  })
  assert.deepEqual(await healReleaseNotes({ github, labels: [DEFAULT_LABEL], log: (l) => lines.push(l) }), [])
  assert.equal(github.calls.some(([name]) => name === 'pointBranchAt'), false)
  assert.equal(lines.filter((l) => l.endsWith('left alone.')).length, 3)
})

// The REST client, against a fetch that answers from a routing table and records every request.
function fakeFetch(routes) {
  const requests = []
  const fetch = async (url, init) => {
    const { pathname, search } = new URL(url)
    const key = `${init.method} ${pathname.replace('/repos/o/r', '')}${search}`
    requests.push({ key, init })
    const route = routes[key]
    if (!route) throw new Error(`unexpected request ${key}`)
    const [status, body] = typeof route === 'function' ? route(init) : route
    return { status, json: async () => (body === undefined ? Promise.reject(new SyntaxError('empty')) : body) }
  }
  return { fetch, requests }
}

const client = (routes, extra = {}) => {
  const { fetch, requests } = fakeFetch(routes)
  return { github: createGitHub({ token: 't0k', repository: 'o/r', fetch, ...extra }), requests }
}

test('releasePullRequests filters by all labels, keeps pull requests only, and pages', async () => {
  const issue = (n, extra) => ({ number: n, state: 'open', body: `#${n}`, ...extra })
  const full = Array.from({ length: 100 }, (_, i) => issue(i, { pull_request: { merged_at: null } }))
  const { github, requests } = client({
    'GET /issues?state=all&labels=a%2Cb&per_page=100&page=1': [200, full],
    'GET /issues?state=all&labels=a%2Cb&per_page=100&page=2': [200, [issue(100), issue(101, { state: 'closed', pull_request: { merged_at: '2026-11-26T00:00:00Z' } })]],
  })
  const pulls = await github.releasePullRequests(['a', 'b'])
  assert.equal(pulls.length, 101)
  assert.deepEqual(pulls.at(-1), { state: 'closed', merged: true, body: '#101' })
  assert.equal(pulls[0].merged, false)
  assert.equal(requests[0].init.headers.authorization, 'Bearer t0k')
})

test('hasNotes is true on 200, false on 404, and throws on anything else', async () => {
  const { github } = client({
    'GET /contents/release-notes.md?ref=a--b': [200, {}],
    'GET /contents/release-notes.md?ref=gone': [404, { message: 'Not Found' }],
    'GET /contents/release-notes.md?ref=boom': [502, undefined],
  })
  assert.equal(await github.hasNotes('a--b'), true)
  assert.equal(await github.hasNotes('gone'), false)
  await assert.rejects(github.hasNotes('boom'), /HTTP 502: no message/)
})

test('refActivity asks for the full ref, newest first', async () => {
  const { github } = client({ 'GET /activity?ref=refs%2Fheads%2Fn&direction=desc&per_page=30': [200, [{ after: 'x' }]] })
  assert.deepEqual(await github.refActivity('n'), [{ after: 'x' }])
})

test('pointBranchAt force-moves an existing branch', async () => {
  const { github, requests } = client({
    'GET /git/ref/heads/n': [200, { object: { sha: 'old' } }],
    'PATCH /git/refs/heads/n': [200, {}],
  })
  await github.pointBranchAt('n', 'good')
  assert.deepEqual(JSON.parse(requests[1].init.body), { sha: 'good', force: true })
})

test('pointBranchAt recreates a deleted branch', async () => {
  const { github, requests } = client({
    'GET /git/ref/heads/n': [404, { message: 'Not Found' }],
    'POST /git/refs': [201, {}],
  })
  await github.pointBranchAt('n', 'good')
  assert.deepEqual(JSON.parse(requests[1].init.body), { ref: 'refs/heads/n', sha: 'good' })
})

test('pointBranchAt surfaces a refused write with its message', async () => {
  const { github } = client({
    'GET /git/ref/heads/n': [200, {}],
    'PATCH /git/refs/heads/n': [403, { message: 'Resource not accessible by integration' }],
  })
  await assert.rejects(github.pointBranchAt('n', 'good'), /resetting n failed with HTTP 403: Resource not accessible/)
})

test('every request carries a timeout, and an expired one rejects', async () => {
  const signals = []
  const fetch = (url, init) =>
    new Promise((resolve, reject) => {
      signals.push(init.signal)
      init.signal.addEventListener('abort', () => reject(init.signal.reason))
    })
  await assert.rejects(createGitHub({ token: 't', repository: 'o/r', fetch, timeoutMs: 5 }).hasNotes('n'), { name: 'TimeoutError' })
  assert.ok(signals[0] instanceof AbortSignal)
})

test('a GitHub Enterprise API URL is honoured, trailing slash or not', async () => {
  const seen = []
  const fetch = async (url) => (seen.push(url), { status: 200, json: async () => [] })
  await createGitHub({ token: 't', repository: 'o/r', apiUrl: 'https://ghe.example/api/v3/', fetch }).refActivity('n')
  assert.match(seen[0], /^https:\/\/ghe\.example\/api\/v3\/repos\/o\/r\/activity\?/)
})

// The script entry.
const withConfig = (config, run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heal-'))
  const file = path.join(dir, 'x-config.json')
  fs.writeFileSync(file, JSON.stringify(config))
  return run(file).finally(() => fs.rmSync(dir, { recursive: true }))
}
const env = { GH_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: 'https://api.example' }

test('main reads the labels from the config and connects with the runner environment', () =>
  withConfig({ label: 'autorelease: pending (ui)' }, async (file) => {
    let connected
    const repo = fakeRepo()
    const code = await main({ argv: [file], env, out: () => {}, connect: (options) => ((connected = options), repo) })
    assert.equal(code, 0)
    assert.deepEqual(connected, { token: 't', repository: 'o/r', apiUrl: 'https://api.example' })
    assert.deepEqual(repo.calls[0], ['releasePullRequests', ['autorelease: pending (ui)']])
  }))

test('main annotates a restore as a warning', () =>
  withConfig({}, async (file) => {
    const lines = []
    const repo = fakeRepo({ heads: { [NOTES]: 'bare' }, withNotes: ['good'], activity: { [NOTES]: [{ after: 'good' }] }, pulls: [openPr()] })
    assert.equal(await main({ argv: [file], env, out: (l) => lines.push(l), connect: () => repo }), 0)
    assert.ok(lines.includes(`::warning title=release notes restored::${NOTES} had lost release-notes.md; reset to good`))
  }))

test('main fails with an error annotation when it cannot heal', () =>
  withConfig({}, async (file) => {
    const lines = []
    const repo = fakeRepo({ heads: { [NOTES]: 'bare' }, pulls: [openPr()] })
    assert.equal(await main({ argv: [file], env, out: (l) => lines.push(l), connect: () => repo }), 1)
    assert.match(lines.at(-1), /^::error title=release notes missing::/)
  }))

test('main fails on a config it cannot read, under the neutral title', async () => {
  const lines = []
  assert.equal(await main({ argv: ['/nonexistent/x-config.json'], env, out: (l) => lines.push(l), connect: () => fakeRepo() }), 1)
  assert.match(lines.at(-1), /^::error title=release notes heal failed::.*ENOENT/)
})

test('an API failure is not reported as missing notes', () =>
  withConfig({}, async (file) => {
    const lines = []
    const repo = fakeRepo()
    repo.releasePullRequests = async () => {
      throw new Error('listing pull requests failed with HTTP 502: no message')
    }
    assert.equal(await main({ argv: [file], env, out: (l) => lines.push(l), connect: () => repo }), 1)
    assert.equal(lines.at(-1), '::error title=release notes heal failed::listing pull requests failed with HTTP 502: no message')
  }))

test('main prints its usage without a config, token or repository', async () => {
  for (const [argv, partial] of [[[], env], [['x'], { ...env, GH_TOKEN: '' }], [['x'], { GH_TOKEN: 't' }]]) {
    const lines = []
    assert.equal(await main({ argv, env: partial, out: (l) => lines.push(l) }), 2)
    assert.match(lines[0], /^usage:/)
  }
})

test('run as a script, it exits with main\'s code', () => {
  const script = new URL('./heal-release-notes.mjs', import.meta.url).pathname
  const { status, stdout } = spawnSync(process.execPath, [script], { env: {}, encoding: 'utf8' })
  assert.equal(status, 2)
  assert.match(stdout, /^usage:/)
})

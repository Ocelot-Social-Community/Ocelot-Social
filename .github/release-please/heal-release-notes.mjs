// Restoring the `release-notes.md` of a release pull request whose body overflowed, before
// release-please runs. Each release workflow calls it as the step in front of
// release-please-action, with the same config file; lint.mjs checks that pairing. README.md
// ("Overflowing release notes") has the incident this exists for.
//
// A release pull request body is capped at 65 536 characters. Beyond that, release-please stores
// the full notes as `release-notes.md` on a side branch `<head branch>--release-notes` and leaves
// only a link in the body. It writes that file in two separate API calls (release-please 17,
// `GitHubApi#createFileOnNewBranch`): first it force-resets the side branch to the target branch,
// then it commits the file on top. And every run READS the file before it writes anything —
// `parseOverflow` resolves the link of each open release pull request, and of each merged one it is
// about to tag, whose notes become the GitHub release.
//
// So when the second call fails once, the side branch is left at a bare target-branch commit with
// no `release-notes.md`, and every later run stops at `Failed to find file: release-notes.md`
// before it gets to the write that would repair it. No number of re-runs gets out of that.
//
// The repair is to point the side branch back at the last commit that still has the file. Its
// content may be a run old; release-please regenerates it from the commits in the same run anyway,
// and for a merged pull request the last successful write IS the notes that were merged. Those
// commits are no longer reachable from any branch after the force-reset, but GitHub keeps them,
// and the repository activity API still lists the ref's history with their SHAs.
//
// The step changes nothing when the file is there, which is every run but the one after a failure.

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

export const RELEASE_NOTES_FILENAME = 'release-notes.md'
export const DEFAULT_LABEL = 'autorelease: pending'

// Copied from release-please's `util/pull-request-overflow-handler.ts`, so this resolves the link
// exactly the way the run after it will. lint.mjs fails when the installed release-please no longer
// carries them.
export const OVERFLOW_MESSAGE = 'This release is too large to preview in the pull request body. View the full release notes here:'
const OVERFLOW_MESSAGE_REGEX = new RegExp(`${OVERFLOW_MESSAGE} (?<url>.*)`)
const FILE_PATH_REGEX = new RegExp(`blob/(?<branchName>.*)/${RELEASE_NOTES_FILENAME}`)

const NULL_SHA = /^0+$/

// The only shape release-please gives the side branch: `<head branch>--release-notes`, with a head
// branch that is always `release-please--…`. The link is found anywhere in the body, and a
// changelog entry is free text taken from a commit subject, so a link to some other branch can
// appear there. That branch is not one this script owns, and resetting it with force would be
// destructive.
const NOTES_BRANCH = /^release-please--.+--release-notes$/

/** The one failure the heal itself diagnoses; everything else is the API or the network. */
export class NotesLostError extends Error {}

/**
 * The branch an overflowed pull request body links its notes to.
 *
 * @param {string | null | undefined} body
 * @returns {string | null} null when the body did not overflow, or links nowhere this can follow
 */
export function notesBranchOf(body) {
  const url = OVERFLOW_MESSAGE_REGEX.exec(body ?? '')?.groups?.url
  if (!url) return null
  let pathname
  try {
    pathname = new URL(url.trim()).pathname
  } catch {
    return null
  }
  return FILE_PATH_REGEX.exec(pathname)?.groups?.branchName ?? null
}

/**
 * The labels a config's release pull requests are found by — the same reading release-please
 * applies (`label`, comma separated, defaulting to `autorelease: pending`).
 *
 * @param {object} config a parsed release-please config
 * @returns {string[]}
 */
export function labelsOf(config) {
  return config?.label ? config.label.split(',').map((l) => l.trim()) : [DEFAULT_LABEL]
}

/**
 * Heal the notes branches of one config's release pull requests.
 *
 * @param {object} options
 * @param {ReturnType<typeof createGitHub>} options.github
 * @param {string[]} options.labels the config's release pull request labels
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<Array<{branch: string, status: 'intact' | 'restored', sha?: string}>>}
 *   one entry per linked notes branch; empty when no consulted pull request overflowed
 * @throws {NotesLostError} when a notes branch lacks the file and no earlier commit of it has
 *   one — the run after this would fail anyway, and this message says why; any other error is the
 *   API or the network
 */
export async function healReleaseNotes({ github, labels, log = () => {} }) {
  // The pull requests release-please resolves the overflow link of: open ones it refreshes, and
  // merged ones still labelled pending, which it tags and cuts a release from. A closed, unmerged
  // one is only read back when it carries the snooze label, which nothing here uses.
  const pulls = (await github.releasePullRequests(labels)).filter((pr) => pr.state === 'open' || pr.merged)
  const linked = [...new Set(pulls.map((pr) => notesBranchOf(pr.body)).filter(Boolean))]
  const branches = linked.filter((branch) => NOTES_BRANCH.test(branch))
  for (const branch of linked.filter((branch) => !branches.includes(branch))) {
    log(`${branch}: not a release-please notes branch (\`release-please--…--release-notes\`) — left alone.`)
  }
  if (branches.length === 0) log(`No release pull request labelled ${JSON.stringify(labels)} links overflowed notes.`)

  const results = []
  for (const branch of branches) {
    if (await github.hasNotes(branch)) {
      log(`${branch}: ${RELEASE_NOTES_FILENAME} is present.`)
      results.push({ branch, status: 'intact' })
      continue
    }

    // Newest first. Any entry's `after` may be the one: a plain `push` is what the "Saving release
    // notes" commit looks like, but the creation of an earlier generation of the branch is just as
    // good. A force-reset lists the same SHA as one entry's `after` and the next one's `before`, so
    // each candidate is looked at once.
    const history = await github.refActivity(branch)
    const tried = new Set()
    let sha
    for (const { after } of history) {
      if (!after || NULL_SHA.test(after) || tried.has(after)) continue
      tried.add(after)
      if (await github.hasNotes(after)) {
        sha = after
        break
      }
    }
    if (!sha) {
      throw new NotesLostError(
        `${branch} has no ${RELEASE_NOTES_FILENAME}, and none of the ${tried.size} commits in its recent history has one either. ` +
          'release-please cannot parse the release pull request without it. Restore the file on that branch by hand, ' +
          'or replace the pull request body with a short placeholder so release-please regenerates it.',
      )
    }

    await github.pointBranchAt(branch, sha)
    log(`${branch}: ${RELEASE_NOTES_FILENAME} was missing — restored the branch to ${sha}.`)
    results.push({ branch, status: 'restored', sha })
  }
  return results
}

/**
 * The few GitHub REST calls the heal needs, over plain `fetch`.
 *
 * @param {object} options
 * @param {string} options.token
 * @param {string} options.repository `owner/name`
 * @param {string} [options.apiUrl]
 * @param {typeof fetch} [options.fetch]
 * @param {number} [options.timeoutMs] per request. The step runs before EVERY release run, and
 *   publish.yml queues its runs (`queue: max`), so one request that never answers would otherwise
 *   hold every later release until the job timeout.
 */
export function createGitHub({ token, repository, apiUrl = 'https://api.github.com', fetch = globalThis.fetch, timeoutMs = 30_000 }) {
  const base = `${apiUrl.replace(/\/$/, '')}/repos/${repository}`
  const q = encodeURIComponent

  const call = async (method, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = await response.json().catch(() => null)
    return { status: response.status, data }
  }
  const expectOk = (what, { status, data }) => {
    if (status < 200 || status > 299) throw new Error(`${what} failed with HTTP ${status}: ${data?.message ?? 'no message'}`)
    return data
  }

  return {
    /** Pull requests carrying ALL of `labels`, any state, as `{state, merged, body}`. */
    async releasePullRequests(labels) {
      const found = []
      for (let page = 1; ; page++) {
        // The issues endpoint, because it is the one that filters by label; a comma-separated
        // `labels` there means all of them, which is release-please's `hasAllLabels`.
        const data = expectOk(
          `listing pull requests labelled ${JSON.stringify(labels)}`,
          await call('GET', `/issues?state=all&labels=${q(labels.join(','))}&per_page=100&page=${page}`),
        )
        for (const issue of data) {
          if (!issue.pull_request) continue
          found.push({ state: issue.state, merged: issue.pull_request.merged_at != null, body: issue.body })
        }
        if (data.length < 100) return found
      }
    },
    async hasNotes(ref) {
      const response = await call('GET', `/contents/${RELEASE_NOTES_FILENAME}?ref=${q(ref)}`)
      if (response.status === 404) return false
      expectOk(`reading ${RELEASE_NOTES_FILENAME} at ${ref}`, response)
      return true
    },
    async refActivity(branch) {
      return expectOk(
        `reading the activity of ${branch}`,
        await call('GET', `/activity?ref=${q(`refs/heads/${branch}`)}&direction=desc&per_page=30`),
      )
    },
    async pointBranchAt(branch, sha) {
      const existing = await call('GET', `/git/ref/heads/${branch}`)
      if (existing.status === 404) {
        expectOk(`creating ${branch}`, await call('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha }))
        return
      }
      expectOk(`reading ${branch}`, existing)
      expectOk(`resetting ${branch}`, await call('PATCH', `/git/refs/heads/${branch}`, { sha, force: true }))
    },
  }
}

/**
 * The script entry: `node heal-release-notes.mjs <config file>`.
 *
 * @param {object} options
 * @param {string[]} options.argv the arguments after the script path
 * @param {Record<string, string | undefined>} options.env GH_TOKEN, and GITHUB_REPOSITORY /
 *   GITHUB_API_URL, which every Actions runner sets
 * @param {(line: string) => void} options.out
 * @param {typeof createGitHub} [options.connect]
 * @returns {Promise<number>} the exit code
 */
export async function main({ argv, env, out, connect = createGitHub }) {
  const [configFile] = argv
  const { GH_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_API_URL: apiUrl } = env
  if (!configFile || !token || !repository) {
    out('usage: GH_TOKEN=… GITHUB_REPOSITORY=owner/name node heal-release-notes.mjs <release-please config file>')
    return 2
  }
  try {
    const labels = labelsOf(JSON.parse(fs.readFileSync(configFile, 'utf8')))
    const results = await healReleaseNotes({ github: connect({ token, repository, apiUrl }), labels, log: out })
    // A restore is the trace of a failed run before this one — worth seeing in the run summary.
    for (const r of results.filter((r) => r.status === 'restored')) {
      out(`::warning title=release notes restored::${r.branch} had lost ${RELEASE_NOTES_FILENAME}; reset to ${r.sha}`)
    }
    return 0
  } catch (error) {
    // Only a NotesLostError means the release-please run after this will fail. Anything else — a
    // timeout, a 5xx, a rate limit — says nothing about the notes; the workflow step is
    // `continue-on-error`, so release-please still runs and is the one that decides.
    const title = error instanceof NotesLostError ? 'release notes missing' : 'release notes heal failed'
    out(`::error title=${title}::${error.message}`)
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main({ argv: process.argv.slice(2), env: process.env, out: console.log })
}

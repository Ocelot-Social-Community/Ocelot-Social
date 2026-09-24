// GitHub Actions filter-pattern matching, used by lint.mjs to check that the lint workflow is
// actually triggered by every file the lint reads.
//
// Hand-written rather than delegated to minimatch or picomatch, because GitHub's syntax is not
// theirs: `?` and `+` are quantifiers on the PRECEDING character here, where a classic glob reads
// `?` as "exactly one character". A near-enough matcher fails in the silent direction — comparing
// only the prefix up to the first wildcard makes `packages/*/package.json` look like it covers
// `packages/ui/package-lock.json`, so the lint would call the triggers complete while GitHub never
// starts a run for that lockfile.
//
// https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax#patterns-to-match-branches-and-paths

/**
 * Translate one GitHub filter pattern into an anchored regular expression.
 *
 *   `*`     any run of characters except `/`
 *   `**`    any run of characters, `/` included
 *   `?`     zero or one of the preceding character
 *   `+`     one or more of the preceding character
 *   `[…]`   one character from the set; a leading `!` negates the set
 *
 * @param {string} pattern a filter pattern without its leading `!`
 * @returns {RegExp} anchored at both ends
 */
export function patternToRegExp(pattern) {
  let out = '^'
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*'
        i++
      } else {
        out += '[^/]*'
      }
    } else if (char === '?' || char === '+') {
      out += char // quantifier, applies to whatever was emitted last
    } else if (char === '[') {
      const close = pattern.indexOf(']', i + 1)
      if (close === -1) {
        out += '\\[' // unterminated set: a literal bracket, as the shell would read it
      } else {
        const body = pattern.slice(i + 1, close)
        out += `[${body.startsWith('!') ? `^${body.slice(1)}` : body}]`
        i = close
      }
    } else {
      out += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`${out}$`)
}

/**
 * Whether a path change would start a workflow filtered by these patterns.
 *
 * Not "any pattern matches": order decides. A negative pattern after a positive one excludes the
 * path again, and a later positive re-includes it, so the list is evaluated in sequence.
 *
 * @param {string[]} patterns the workflow's `paths` list, in file order
 * @param {string} target a repository-root relative path
 * @returns {boolean}
 */
export function triggers(patterns, target) {
  let included = false
  for (const pattern of patterns) {
    const negated = pattern.startsWith('!')
    if (patternToRegExp(negated ? pattern.slice(1) : pattern).test(target)) included = !negated
  }
  return included
}

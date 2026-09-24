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

// Line comments, not a JSDoc block: the patterns discussed here contain a double star followed by
// a slash, which would close a block comment mid-sentence.
//
//   *          any run of characters except `/`
//   **         any run of characters, `/` included
//   ** then /  a whole directory prefix — possibly none at all, see below
//   ?          zero or one of the preceding character
//   +          one or more of the preceding character
//   [ … ]      one character from the set; a leading `!` negates the set
//
// A double star followed by a slash is special-cased AGAINST GitHub's own prose definition of the
// double star ("zero or more of any character"), because GitHub's example table contradicts that
// prose and the table is the better evidence of what the implementation does. Three of its ten
// rows only work if that slash may match nothing:
//
//   docs/ ** /*.md   is listed as matching  docs/README.md
//   ** /README.md    is listed as matching  README.md
//   ** /docs/ **     is listed as matching  docs/hello.md
//
// Read literally, each of those needs a slash that the path does not have. Translating the pair as
// an OPTIONAL directory prefix reproduces every row of the table; translating it as `.*` plus a
// literal slash fails those three. The transcribed table is in path-filter.test.mjs.
//
// @param {string} pattern a filter pattern without its leading `!`
// @returns {RegExp} anchored at both ends
export function patternToRegExp(pattern) {
  let out = '^'
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          out += '(?:.*/)?'
          i += 2
        } else {
          out += '.*'
          i++
        }
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

// Resolving how a workflow job is gated, for lint.mjs's check that the release-please lint still
// runs when a file it reads changes.
//
// release-please-lint.yml carries no `paths:` of its own. It cannot: its lint job is a required
// status check, and Actions reports NO check run for a workflow a path filter turns away — branch
// protection then waits forever for a result that never comes. A job skipped by an `if:` inside a
// workflow that did run reports success, so the filter sits on the job, via `dorny/paths-filter`
// against a named rule in `.github/file-filters.yml`.
//
// The consequence for the lint is that the list it must verify is no longer in the workflow, and
// reachable only through a chain of four references:
//
//   the lint job's `if:`   →  needs.<gate job>.outputs.<output>
//   that job's `outputs:`  →  steps.<step id>.outputs.<filter key>
//   that step's `with:`    →  the filter FILE
//   the filter file        →  the patterns under <filter key>
//
// Every hop is resolved from the parsed workflow rather than assumed, because the whole point of
// the check is to notice when the wiring changes. A hop that does not resolve is reported as an
// error, never as a pass: a check that cannot find the list it is supposed to verify has learned
// nothing about it.

const FILTER_ACTION = 'dorny/paths-filter@'

const error = (reason) => ({ status: 'error', reason })

/**
 * How a job in a workflow is gated.
 *
 * @param {object} doc the parsed workflow
 * @param {string} jobId the job whose gate to resolve
 * @returns {{status: 'gated', filtersFile: string, filterKey: string}
 *          |{status: 'ungated'}
 *          |{status: 'error', reason: string}}
 *   `ungated` means the job has no `if:` and therefore runs on everything the workflow sees —
 *   nothing can drift out of a list that is never consulted, and it is the safe direction anyway.
 */
export function resolveFilterGate(doc, jobId) {
  const jobs = doc?.jobs ?? {}
  const job = jobs[jobId]
  if (!job) return error(`has no job \`${jobId}\``)

  const condition = job.if
  if (condition === undefined) return { status: 'ungated' }
  if (typeof condition !== 'string') return error(`job \`${jobId}\` has a non-string \`if:\``)

  const need = /needs\.([\w-]+)\.outputs\.([\w-]+)/.exec(condition)
  if (!need) return error(`job \`${jobId}\` is gated by \`if: ${condition}\`, which references no \`needs.<job>.outputs.<name>\``)
  const [, gateJobId, outputName] = need

  const gateJob = jobs[gateJobId]
  if (!gateJob) return error(`job \`${jobId}\` reads \`needs.${gateJobId}.outputs.${outputName}\`, but \`${gateJobId}\` is not a job in this workflow`)

  // A `needs.<job>` expression in a job that does not DECLARE that dependency evaluates to an empty
  // context rather than failing, so the condition is permanently false and the job silently never
  // runs again — while still reporting success as a skipped required check.
  const declared = Array.isArray(job.needs) ? job.needs : [job.needs].filter(Boolean)
  if (!declared.includes(gateJobId)) {
    return error(`job \`${jobId}\` reads \`needs.${gateJobId}\` but does not list it in \`needs:\` — the expression is always empty, so the job never runs`)
  }

  const expression = gateJob.outputs?.[outputName]
  if (typeof expression !== 'string') return error(`job \`${gateJobId}\` declares no output \`${outputName}\``)

  const step = /steps\.([\w-]+)\.outputs\.([\w-]+)/.exec(expression)
  if (!step) return error(`output \`${gateJobId}.${outputName}\` is \`${expression}\`, which references no \`steps.<id>.outputs.<filter>\``)
  const [, stepId, filterKey] = step

  const filterStep = (gateJob.steps ?? []).find((s) => s?.id === stepId)
  if (!filterStep) return error(`job \`${gateJobId}\` has no step with \`id: ${stepId}\``)
  if (typeof filterStep.uses !== 'string' || !filterStep.uses.startsWith(FILTER_ACTION)) {
    return error(`step \`${stepId}\` is \`${filterStep.uses ?? 'a run step'}\`, not ${FILTER_ACTION}… — this check only knows how to read that action's filters`)
  }

  // `some` is the default, and the semantics the caller's matching assumes: a file matches the rule
  // when ANY of its patterns matches. `every` demands all of them at once, which no single path can
  // satisfy — the gate would be permanently false, the lint would never run again, and the skipped
  // job would keep reporting success.
  const quantifier = filterStep.with?.['predicate-quantifier']
  if (quantifier !== undefined && quantifier !== 'some') {
    return error(`step \`${stepId}\` sets \`predicate-quantifier: ${quantifier}\`, but this check assumes the default \`some\``)
  }

  const filtersFile = filterStep.with?.filters
  if (typeof filtersFile !== 'string' || filtersFile.trim() === '') return error(`step \`${stepId}\` passes no \`filters:\``)
  // The input doubles as a file path and as inline YAML; only the former can be followed from here.
  if (filtersFile.includes('\n')) return error(`step \`${stepId}\` passes its filters inline, and this check reads them from a file`)

  return { status: 'gated', filtersFile: filtersFile.trim(), filterKey }
}

/**
 * The patterns of one dorny/paths-filter rule, flattened.
 *
 * The action's only mechanism for sharing a list between rules is a YAML anchor, and an alias used
 * as a sequence item NESTS the aliased array rather than splicing its items — `- *branding` yields
 * `[[…]]`. The action flattens that itself (`parseFilterItemYaml` recurses into arrays), so this
 * must too, or every pattern inherited through an anchor would read as unmatchable.
 *
 * The action also accepts a `{added|modified: pattern}` form per item. Nothing here uses it and it
 * would change what "this rule covers the file" means, so it is returned as unsupported rather than
 * silently reduced to its pattern.
 *
 * @param {unknown} rule the value of one key in the filter file
 * @returns {{patterns: string[], unsupported: unknown[]}}
 */
export function flattenRule(rule) {
  const patterns = []
  const unsupported = []
  const walk = (item) => {
    if (Array.isArray(item)) item.forEach(walk)
    else if (typeof item === 'string') patterns.push(item)
    else unsupported.push(item)
  }
  walk(rule)
  return { patterns, unsupported }
}

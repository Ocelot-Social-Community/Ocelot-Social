import { Before, BeforeStep, defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Every toaster step asserts against one record of the toasts raised, never against the live DOM.
//
// A toast auto-dismisses after TOAST_TIMEOUT (5 s by default, 15 s in the e2e stack), so
// asserting on the live DOM cannot tell "no toast was ever raised" from "the toast came and went
// while an earlier step was still waiting" — both surface as "never found it". That ambiguity is
// what made the policy steps flaky, and it is why the e2e stack had to raise TOAST_TIMEOUT in the
// first place (see docker-compose.test.yml).
//
// So every toast is recorded the moment it enters the document, and the steps assert against the
// record: no race with the dismissal, and a failure names the toasts that DID appear — status and
// text — instead of just reporting an absent element.

const TOAST_STEP_PREFIX = 'I see a toaster'

const TOAST_CLASS = {
  success: 'iziToast-color-green',
  error: 'iziToast-color-red',
}

const toastLog = []
// The error toasts of the whole scenario, appended to its failure (see below) — a failing
// scenario's real cause is often an error toast a few steps before the assertion that broke.
const errorToasts = []

const capture = (element) => {
  if (!toastLog.includes(element)) toastLog.push(element)
}

// iziToast completes the class list and the message right after inserting the element, so the
// log keeps element references and reads colour and text at assertion time.
const observeToasts = (win) => {
  toastLog.length = 0
  const observer = new win.MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== win.Node.ELEMENT_NODE) return
        if (node.classList.contains('iziToast')) capture(node)
        node.querySelectorAll('.iziToast').forEach(capture)
      })
    })
  })
  observer.observe(win.document, { childList: true, subtree: true })
}

Cypress.on('window:before:load', observeToasts)

const statusOf = (element) =>
  Object.keys(TOAST_CLASS).find((status) => element.className.includes(TOAST_CLASS[status])) ??
  'other'

const textOf = (element) =>
  (element.querySelector('.iziToast-message')?.textContent ?? element.textContent).trim()

const seen = () =>
  toastLog.map((element) => `${statusOf(element)}: "${textOf(element)}"`).join(' | ') || '(none)'

const classFor = (status) => {
  const className = TOAST_CLASS[status]
  if (!className) {
    // The step *is* the assertion: an unknown status (typo in the feature file or an
    // unsupported value) must fail loudly instead of passing with no check at all.
    throw new Error(`Unknown toaster status "${status}"; expected "success" or "error".`)
  }
  return className
}

// Scope the log to the action under test. Every toast assertion in the suite sits directly
// behind the step that raises the toast, so clearing at the start of every OTHER step leaves
// the assertion looking at exactly that one action.
//
// Without this scoping an earlier toast of the same colour satisfies the assertion, and the
// step silently stops testing anything: in admin/RolesPermissions.feature:78 the toast that
// "I confirm creating the role" raises is green and carries the same message key
// (admin.roles.saveSuccess) as the save under test, and it is still alive when the assertion
// runs — so a save that quietly persisted nothing passed here and only surfaced two steps
// later, at the reload check.
//
// The error toasts are taken out of the log first, so clearing it loses none of them.
const collectErrorToasts = () => {
  toastLog
    .filter((element) => statusOf(element) === 'error')
    .map(textOf)
    .forEach((text) => {
      if (!errorToasts.includes(text)) errorToasts.push(text)
    })
}

BeforeStep(({ pickleStep }) => {
  collectErrorToasts()
  if (!pickleStep.text.startsWith(TOAST_STEP_PREFIX)) toastLog.length = 0
})

// Both, or the first BeforeStep would take the previous scenario's last toasts for this one's.
Before(() => {
  toastLog.length = 0
  errorToasts.length = 0
})

// On the failure itself, not in an After hook: the preprocessor runs After hooks as the last steps
// of the scenario, so a failed step skips them. Collected once more here, since no BeforeStep
// follows the step that failed.
Cypress.on('fail', (error) => {
  collectErrorToasts()
  if (errorToasts.length) {
    error.message += `\n\nError toasts in this scenario: ${errorToasts.join(' | ')}`
  }
  throw error
})

const expectToast = (description, matches) => {
  cy.wrap(null, { log: false }).should(() => {
    expect(
      toastLog.some(matches),
      `${description} was raised; toasters seen: ${seen()}`,
    ).to.equal(true)
  })
}

defineStep('I see a toaster with status {string}', (status) => {
  const className = classFor(status)
  expectToast(`a "${status}" toaster`, (element) => element.className.includes(className))
})

defineStep('I see a toaster with {string}', (text) => {
  expectToast(`a toaster saying "${text}"`, (element) => textOf(element).includes(text))
})

// Status and text of ONE toast — two separate steps would also pass for an error toast next to
// an unrelated success toast carrying the text.
defineStep('I see a toaster with status {string} saying {string}', (status, text) => {
  const className = classFor(status)
  expectToast(
    `a "${status}" toaster saying "${text}"`,
    (element) => element.className.includes(className) && textOf(element).includes(text),
  )
})

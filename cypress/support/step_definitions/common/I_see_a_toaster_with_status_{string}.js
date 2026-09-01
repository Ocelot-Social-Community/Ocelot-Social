import { BeforeStep, defineStep } from '@badeball/cypress-cucumber-preprocessor'

const TOAST_STEP_PREFIX = 'I see a toaster with status'

const TOAST_CLASS = {
  success: 'iziToast-color-green',
  error: 'iziToast-color-red',
}

// A toast auto-dismisses after TOAST_TIMEOUT (5 s by default, 15 s in the e2e stack), so
// asserting on the live DOM cannot tell "no toast was ever raised" from "the toast came and
// went while an earlier step was still waiting" — both surface as "never found it". That
// ambiguity is what made the policy steps flaky, and it is why the e2e stack had to raise
// TOAST_TIMEOUT in the first place (see docker-compose.test.yml).
//
// So record every toast the moment it enters the document and assert against the record: the
// assertion no longer races the dismissal, and a failure can name the toasts that DID appear
// instead of just reporting an absent element.
const toastLog = []

const capture = (element) => {
  if (!toastLog.includes(element)) toastLog.push(element)
}

// iziToast completes the class list right after inserting the element, so the log keeps
// element references and the colour is read at assertion time rather than at capture time.
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
BeforeStep(({ pickleStep }) => {
  if (!pickleStep.text.startsWith(TOAST_STEP_PREFIX)) toastLog.length = 0
})

defineStep('I see a toaster with status {string}', (status) => {
  const className = TOAST_CLASS[status]
  if (!className) {
    // The step *is* the assertion: an unknown status (typo in the feature file or an
    // unsupported value) must fail loudly instead of passing with no check at all.
    throw new Error(`Unknown toaster status "${status}"; expected "success" or "error".`)
  }
  cy.wrap(null, { log: false }).should(() => {
    const seen = toastLog.map((element) => element.className)
    expect(
      seen.some((classNames) => classNames.includes(className)),
      `a "${status}" toaster (.${className}) was raised; toasters seen: ${
        seen.join(' | ') || '(none)'
      }`,
    ).to.equal(true)
  })
})

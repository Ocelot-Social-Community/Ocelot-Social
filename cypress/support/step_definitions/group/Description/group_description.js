import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../../factories'

const description = () => cy.get('.group-description', { timeout: 15000 })
const clamp = () => cy.get('[data-test="description-clamp"]', { timeout: 15000 })
const toggle = () => cy.get('[data-test="description-toggle"]', { timeout: 15000 })

// Headings between the paragraphs on purpose: they do not sit on the line grid the cap is
// counted in, which is where a cut used to land in the middle of a line.
defineStep(
  'the group {string} has a description of {int} paragraphs ending in {string}',
  (groupId, count, ending) => {
    const paragraphs = Array.from(
      { length: count },
      (_, i) =>
        `<h3>Part ${i + 1}</h3><p>Paragraph ${i + 1} goes on for a while, long enough to wrap onto a second line on most screens and to make the description far taller than its collapsed preview.</p>`,
    )
    cy.fixtures().then((fixtures) =>
      fixtures.cypher(
        `MATCH (group:Group {id: $groupId}) SET group.description = $description`,
        { groupId, description: [...paragraphs, `<p>${ending}</p>`].join('') },
      ),
    )
  },
)

defineStep('the description offers {string}', (label) => {
  toggle().should('be.visible').and('contain.text', label)
})

defineStep('the description offers no toggle', () => {
  // Measured after hydration: wait for the description first, so "absent" is not "not yet".
  clamp().should('be.visible')
  cy.get('[data-test="description-toggle"]').should('not.exist')
})

defineStep('I expand the description', () => {
  toggle().click()
})

defineStep('I see {string} in the description', (text) => {
  description().contains(text).should('be.visible')
})

// No line of text may cross the bottom edge of the shortened description: it ends below a
// whole line, or the reader sees the top half of one.
defineStep('the shortened description ends below a whole line', () => {
  clamp().should(($clamp) => {
    const element = $clamp[0]
    const edge = element.getBoundingClientRect().bottom
    const doc = element.ownerDocument
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const sliced = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const range = doc.createRange()
      range.selectNodeContents(node)
      Array.from(range.getClientRects()).forEach((line) => {
        if (line.top < edge - 0.5 && line.bottom > edge + 0.5) sliced.push(node.textContent)
      })
    }
    expect(sliced, 'lines crossing the cut').to.deep.equal([])
    // …and it is still shortened: the cut is not bought by showing everything.
    expect(element.scrollHeight).to.be.greaterThan(element.clientHeight + 1)
  })
})

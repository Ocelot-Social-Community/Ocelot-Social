import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

// The running calls come from LiveKit, which the e2e stack does not run (see
// cypress/e2e/videoCall/README.md): the query's answer is stubbed. Cypress runs the handler
// defined last first, so a later stub replaces an earlier one.
const stubActiveVideoCalls = (activeVideoCalls) => {
  cy.intercept('POST', '/api', (req) => {
    if (typeof req.body?.query === 'string' && /\bactiveVideoCalls\b/.test(req.body.query)) {
      req.alias = 'activeVideoCalls'
      req.reply({ data: { activeVideoCalls } })
    }
  })
}

defineStep('a video call is running in group {string} with {string}', (groupId, userSlug) => {
  cy.fixtures()
    .firstOf('User', { slug: userSlug })
    .then((user) => user.toJson())
    .then((user) => {
      stubActiveVideoCalls([
        {
          __typename: 'ActiveVideoCall',
          group: {
            __typename: 'Group',
            id: groupId,
            slug: groupId,
            name: 'Call Group',
            visibility: 'public',
            avatar: null,
          },
          participantCount: 1,
          participants: [
            {
              __typename: 'User',
              id: user.id,
              slug: user.slug,
              name: user.name,
              isBlocked: false,
              avatar: null,
            },
          ],
        },
      ])
    })
})

defineStep('no video call is running', () => {
  stubActiveVideoCalls([])
})

defineStep('the screen is {int} pixels wide', (width) => {
  cy.viewport(width, 900)
})

defineStep('the dock shows the running call beside the feed', () => {
  cy.get('[data-test="dock"].dock--rail').should('be.visible')
  cy.get('.dock__panel .active-video-call').should('be.visible')
})

defineStep('the first call in the dock is level with the first post', () => {
  // The dock measures the page once its content has settled; Cypress retries until it has.
  cy.get('[data-dock-anchor] .os-card').first().then(([post]) => {
    cy.get('[data-dock-align] .active-video-call').first().should(([call]) => {
      const offset = call.getBoundingClientRect().top - post.getBoundingClientRect().top
      expect(Math.abs(offset)).to.be.lessThan(1.5)
    })
  })
})

defineStep('I join the call from the dock', () => {
  cy.get('[data-test="call-join"]').filter(':visible').first().click()
})

defineStep('the dock flag shows {string}', (count) => {
  cy.get('[data-test="dock-flag"]').should('be.visible').and('contain', count)
})

defineStep('I open the dock', () => {
  cy.get('[data-test="dock-flag"]').click()
})

const drawerPanel = () => cy.get('[data-testid="os-drawer-panel"]')

defineStep('the dock drawer stays open with the focus inside', () => {
  drawerPanel().should('be.visible').and('have.focus')
  // A module that remounted when the drawer opened would report "nothing yet" and close it
  // again a moment later — give that moment, then look once more.
  cy.wait(500)
  drawerPanel().should('be.visible')
  drawerPanel().find('.active-video-call').should('be.visible')
})

defineStep('I press Escape', () => {
  cy.focused().type('{esc}')
})

defineStep('the dock drawer is closed', () => {
  drawerPanel().should('not.be.visible')
})

defineStep('the dock drawer is closed and the flag has the focus', () => {
  drawerPanel().should('not.be.visible')
  cy.focused().should('have.attr', 'data-test', 'dock-flag')
})

defineStep('I see no dock', () => {
  // Wait for the page's data, so "no dock" is not just "not yet". On the feed the dock is there
  // but empty and hidden; elsewhere it is not there at all — neither shows anything.
  cy.waitForNetworkIdle(1000)
  cy.get('body').should(($body) => {
    expect($body.find('.dock__panel:visible, [data-test="dock-flag"]:visible')).to.have.length(0)
  })
})

defineStep('the pre-join dialog of the call opens', () => {
  cy.get('.prejoin').should('be.visible')
})

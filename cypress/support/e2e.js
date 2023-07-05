// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:

import './commands'
import './factories'

// intermittent failing tests
// import 'cypress-plugin-retries'

// Alternatively you can use CommonJS syntax:
// require('./commands')
import { WebSocket } from 'mock-socket'
before(() => {
  cy.visit('/', {
    onBeforeLoad(win) {
      cy.stub(win, "WebSocket", url =>  new WebSocket(url))
    }
  })
})

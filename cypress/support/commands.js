// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })

/* globals Cypress cy */
import "cypress-file-upload";
import { GraphQLClient, request } from 'graphql-request'
import CONFIG from '../../backend/src/config'

const authenticatedHeaders = (variables) => {
  const mutation = `
    mutation($email: String!, $password: String!) {
      login(email: $email, password: $password)
    }
  `
  return new Cypress.Promise((resolve, reject) => {
    request(CONFIG.GRAPHQL_URI, mutation, variables).then((response) => {
      resolve({ authorization: `Bearer ${response.login}` })
    })
  })
}

Cypress.Commands.add("logout", () => {
  cy.visit(`/logout`);
  cy.location("pathname").should("contain", "/login"); // we're out
});

Cypress.Commands.add(
  'authenticateAs',
  ({email, password}) => {
    return new Cypress.Promise((resolve, reject) => {
      authenticatedHeaders({ email, password }).then((headers) => {
        resolve(new GraphQLClient(CONFIG.GRAPHQL_URI, { headers }))
      })
    })
  })

Cypress.Commands.add(
  'mutate',
  { prevSubject: true },
  (graphQLClient, mutation, variables, response) => {
    return new Cypress.Promise(async (resolve, reject) => {
      graphQLClient.request(mutation, variables).then(() => resolve(graphQLClient))

    })
  })

//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

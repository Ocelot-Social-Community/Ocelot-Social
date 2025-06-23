import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see all the reported posts including the one from above', () => {
  cy.get('table tbody', { timeout: 30000 }).should('be.visible')
  cy.get('table tbody').within(() => {
    cy.contains('tr', 'The Truth about the Holocaust').should('be.visible')
  })
  
  cy.intercept({
    method: 'POST',
    url: '/api',
    hostname: 'localhost',
  }, (req) => {
    if (req.body && req.body.query && req.body.query.includes('reports(')) {
      req.alias = 'getReports'
    }
  })

  cy.get('@getReports.all').should('have.length.at.least', 1)
  cy.get('@getReports.all').then((interceptions) => {
    const reportsInterception = interceptions.find(interception =>
      interception.request.body.query.includes('reports(')
    )
    expect(reportsInterception).to.exist
    expect(reportsInterception.response.statusCode).to.eq(200)
    expect(reportsInterception.response.body).to.have.nested.property('data.reports.0.resource.author.id', 'annoying-user')
  })
})

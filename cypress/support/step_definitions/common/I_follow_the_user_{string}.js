
defineStep('I follow the user {string}', name => {
  cy.neode()
    .firstOf('User', {name})
    .then(followed => {
      cy.neode()
        .firstOf('User', {
          name: 'Peter Pan'
        })
        .relateTo(followed, 'following')
    })
})

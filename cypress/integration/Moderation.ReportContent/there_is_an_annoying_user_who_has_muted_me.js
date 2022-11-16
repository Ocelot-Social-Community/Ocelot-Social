Given("there is an annoying user who has muted me", () => {
  cy.neode()
    .first("User", {
      role: 'moderator'
    })
    .then(mutedUser => {
      cy.neode()
        .first("User", {
          id: 'user'
        })
      .relateTo(mutedUser, "muted");
    });
});
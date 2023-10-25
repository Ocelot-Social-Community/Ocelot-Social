import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given("the following {string} are in the database:", (table,data) => {
  switch(table){
    case "posts":
      data.hashes().forEach( entry => {
        cy.factory().build("post", {
          ...entry,
          deleted: Boolean(entry.deleted),
          disabled: Boolean(entry.disabled),
          pinned: Boolean(entry.pinned),
        },{
          ...entry,
          tagIds: entry.tagIds ? entry.tagIds.split(',').map(item => item.trim()) : [],
        });
      })
      break
    case "comments":
      data.hashes().forEach( entry => {
        cy.factory()
          .build("comment", entry, entry);
      })
      break
    case "users":
      data.hashes().forEach( entry => {
        cy.factory().build("user", entry, entry);
      });
      break
    case "tags":
      data.hashes().forEach( entry => {
        cy.factory().build("tag", entry, entry)
      });
      break
    case "donations":
      data.hashes().forEach( entry => {
        cy.factory().build("donations", entry, entry)
      });
      break
  }
})

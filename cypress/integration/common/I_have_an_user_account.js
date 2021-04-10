import { Given } from "cypress-cucumber-preprocessor/steps";
import narrator from '../data/narrator'
import loginCredentials from '../data/loginCredentials'

Given("I have an user account", () => {
    cy.factory().build("user", narrator, loginCredentials);
});
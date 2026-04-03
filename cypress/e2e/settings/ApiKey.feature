Feature: API Key Authentication
  As a User
  I'd like to create and use API keys
  So I can access the API without my password

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | role | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | user | 0.0.4                           |

  Scenario: Create an API key and use it to query the API
    Given I am logged in as "peter-pan"
    When I navigate to page "/settings/api-keys"
    Then I am on page "/settings/api-keys"
    When I create an API key with name "E2E Test Key"
    Then I see a toaster with status "success"
    And I see the API key secret
    When I use the API key to query currentUser
    Then the API returns my user name "Peter Pan"

  Scenario: Revoked API key is rejected
    Given I am logged in as "peter-pan"
    When I navigate to page "/settings/api-keys"
    And I create an API key with name "To Revoke"
    And I revoke the first API key
    And I confirm the action in the modal
    Then I see a toaster with status "success"
    When I use the revoked API key to query currentUser
    Then the API returns an authentication error

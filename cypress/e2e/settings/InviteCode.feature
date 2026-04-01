Feature: Invite Codes
  As a User
  I'd like to manage my invite codes
  So I can invite friends to the network

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
    And I am logged in as "peter-pan"

  Scenario: View invite codes page
    When I navigate to page "/settings/invites"
    Then I am on page "/settings/invites"
    And I see the invite code list title with count

  Scenario: Generate a new invite code
    When I navigate to page "/settings/invites"
    Then I am on page "/settings/invites"
    When I generate a new invite code
    Then I see a toaster with status "success"
    And the invite code count has increased

  Scenario: Generate a new invite code with comment
    When I navigate to page "/settings/invites"
    Then I am on page "/settings/invites"
    When I generate a new invite code with comment "For my friend"
    Then I see a toaster with status "success"
    And I see the comment "For my friend" on an invite code

  Scenario: Invalidate an invite code
    When I navigate to page "/settings/invites"
    Then I am on page "/settings/invites"
    When I generate a new invite code
    Then I see a toaster with status "success"
    When I invalidate the first invite code
    And I confirm the action in the modal
    Then I see a toaster with status "success"
    And the invite code count has decreased

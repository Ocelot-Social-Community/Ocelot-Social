Feature: Admin network policy
  As an admin
  I want to change network-wide policy toggles at runtime
  So that features can be turned on and off without a redeploy

  Background:
    Given the following "users" are in the database:
      | slug      | email             | password | id    | name      | role  | termsAndConditionsAgreedVersion |
      | admin     | admin@example.org | 1234     | admin | Admin     | admin | 0.0.4                           |
      | peter-pan | peter@example.org | 1234     | peter | Peter Pan | user  | 0.0.4                           |

  # #1 — the admin page persists a change and records who made it.
  Scenario Outline: Admin toggles a policy, it persists across a reload, and shows who changed it
    Given the network policy "<key>" is "false"
    And I am logged in as "admin"
    When I navigate to page "/admin/policy"
    Then the checkbox with ID "policy-<key>" should "not.be.checked"
    When I enable the policy "<key>"
    And I save the policy form
    Then I see a toaster with status "success"
    When I navigate to page "/admin/policy"
    Then the checkbox with ID "policy-<key>" should "be.checked"
    And I see the policy last-changed info naming "admin"

    Examples:
      | key                |
      | publicRegistration |
      | categoriesActive   |

  # Reset — a key returns to its configured (ENV/schema) default.
  Scenario: Admin resets the policy to its configured default
    Given the network policy "publicRegistration" is "true"
    And I am logged in as "admin"
    When I navigate to page "/admin/policy"
    Then the checkbox with ID "policy-publicRegistration" should "be.checked"
    When I reset all policies to default
    Then I see a toaster with status "success"
    And the policy "publicRegistration" matches its configured default

  # #2 — the cross-cutting effect: an authenticated-only key gates a UI element.
  Scenario: The API-keys settings tab follows the policy after a reload
    Given the network policy "apiKeysEnabled" is "false"
    And I am logged in as "peter-pan"
    When I navigate to page "/settings"
    Then I do not see a link to page "/settings/api-keys"
    When the network policy "apiKeysEnabled" is "true"
    And I navigate to page "/settings"
    Then I see a link to page "/settings/api-keys"

  # #3 — the regression you hit: a change must reach an open client live, no reload.
  Scenario: A policy change reaches an open client live over the websocket
    Given the network policy "apiKeysEnabled" is "false"
    And I am logged in as "peter-pan"
    When I navigate to page "/settings"
    Then I do not see a link to page "/settings/api-keys"
    When the network policy "apiKeysEnabled" is "true"
    Then I eventually see a link to page "/settings/api-keys"

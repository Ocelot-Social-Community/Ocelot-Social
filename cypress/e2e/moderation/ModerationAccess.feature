Feature: Moderation area access (RBAC)
  As a moderator
  I want the moderation area to surface exactly the pages my permissions allow
  So I can do my job without hitting permission errors

  Background:
    Given the following "users" are in the database:
      | slug      | email                 | password | id        | name      | role      | termsAndConditionsAgreedVersion |
      | moderator | moderator@example.org | 1234     | moderator | Mod-Man   | moderator | 0.0.4                           |
      | peter-pan | peter@example.org     | 1234     | peter     | Peter Pan | user      | 0.0.4                           |
      | admin     | admin@example.org     | 1234     | admin     | Admin     | admin     | 0.0.4                           |

  # The default moderator holds badge.manage → the user list is surfaced under
  # moderation, reusing the admin component, but WITHOUT the e-mail column (the
  # moderator has no user.email.readAny).
  Scenario: A moderator reaches the user list under moderation without seeing e-mails
    Given I am logged in as "moderator"
    And I navigate to page "/"
    When I click on the avatar menu in the top right corner
    Then I see the moderation menu item
    When I navigate to page "/moderation/users"
    Then I am on page "/moderation/users"
    And I do not see any email addresses in the user list
    When I navigate to page "/moderation/users/peter"
    Then I see the element with test id "user-badges"

  # A holder of a moderation-group capability that has no page of its own (post.pin)
  # enters the area but sees the error state, not an empty page.
  Scenario: A moderation capability with no accessible page shows the error state
    Given a role "post-pinner" granting "post.pin" exists
    And the user with id "peter" is assigned the role "post-pinner"
    And I am logged in as "peter-pan"
    When I navigate to page "/moderation"
    Then I see the element with test id "area-no-access"

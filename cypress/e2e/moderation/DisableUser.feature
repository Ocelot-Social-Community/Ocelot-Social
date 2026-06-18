Feature: Disabling users with the act-on role hierarchy
  As a moderator or admin
  I want to reversibly disable user accounts
  But never act on a peer or a higher-privileged user
  So that abuse can be contained without escalating privileges

  # user.disable is a moderation-grade, reversible capability (default moderator + admin);
  # user.delete.any is admin-only and irreversible. Both obey the act-on hierarchy
  # (actor's permissions must be a strict superset of the target's), so a moderator can
  # disable a normal user but neither disable nor be able to delete an admin/peer.

  Background:
    Given the following "users" are in the database:
      | slug      | email                 | password | id        | name      | role      | termsAndConditionsAgreedVersion |
      | moderator | moderator@example.org | 1234     | moderator | Moderator | moderator | 0.0.4                           |
      | admin     | admin@example.org     | 1234     | admin     | Admin     | admin     | 0.0.4                           |
      | admin-two | admin2@example.org    | 1234     | admin2    | Admin Two | admin     | 0.0.4                           |
      | troll     | troll@example.org     | 1234     | troll     | Troll     | user      | 0.0.4                           |

  # 1 — a moderator may disable a normal user (moderator ⊋ user).
  Scenario: A moderator disables a normal user from the moderation user list
    Given I am logged in as "moderator"
    When I navigate to page "/moderation/users"
    And I disable the user with id "troll"
    Then I see a toaster with status "success"

  # 2 — the act-on hierarchy blocks a moderator from disabling an admin (target holds
  #     permissions the moderator lacks), surfaced as a server-side denial.
  Scenario: The hierarchy stops a moderator from disabling an admin
    Given I am logged in as "moderator"
    When I navigate to page "/moderation/users"
    And I disable the user with id "admin"
    Then I see a toaster with status "error"

  # 3 — an admin outranks a moderator and may disable them (admin ⊋ moderator).
  Scenario: An admin disables a moderator from the admin user list
    Given I am logged in as "admin"
    When I navigate to page "/admin/users"
    And I disable the user with id "moderator"
    Then I see a toaster with status "success"

  # 4 — the hierarchy blocks deleting a peer: an admin cannot delete another admin
  #     (equal permission sets → neither dominates).
  Scenario: The hierarchy stops an admin from deleting a peer admin
    Given I am logged in as "admin"
    When I navigate to page "/admin/users"
    And I delete the user with id "admin2"
    And I confirm the action in the modal
    Then I see a toaster with status "error"

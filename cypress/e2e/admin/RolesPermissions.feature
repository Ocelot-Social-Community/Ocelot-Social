Feature: Admin roles & permissions (RBAC)
  As an admin
  I want to manage roles and the permissions they grant
  So that I can control what each role may do across the network

  Background:
    Given the following "users" are in the database:
      | slug      | email             | password | id    | name      | role  | termsAndConditionsAgreedVersion |
      | admin     | admin@example.org | 1234     | admin | Admin     | admin | 0.0.4                           |
      | peter-pan | peter@example.org | 1234     | peter | Peter Pan | user  | 0.0.4                           |
    And the following "posts" are in the database:
      | id     | title         | slug   | authorId |
      | post-1 | A shared post | a-post | admin    |

  # 1 — authorization: the admin area is hidden from a role without admin permissions.
  Scenario: A normal user does not see the admin menu entry
    Given I am logged in as "peter-pan"
    And I navigate to page "/"
    When I click on the avatar menu in the top right corner
    Then I can't see the admin menu item

  # 2 — an admin reaches the roles page, which renders the role tabs.
  Scenario: An admin sees the admin menu entry and the roles page renders
    Given I am logged in as "admin"
    And I navigate to page "/"
    When I click on the avatar menu in the top right corner
    Then I see the admin menu item
    When I navigate to page "/admin/roles"
    Then I see the element with test id "role-tab-owner"
    And I see the element with test id "role-tab-user"

  # 3 — the management flow: toggling a permission persists across a reload.
  Scenario: Admin revokes a permission from the user role and it persists across a reload
    Given I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I select the role "user"
    Then the permission "comment.create" for role "user" should "be.checked"
    When I disable the permission "comment.create" for role "user"
    And I save the role "user"
    Then I see a toaster with status "success"
    When I navigate to page "/admin/roles"
    And I select the role "user"
    Then the permission "comment.create" for role "user" should "not.be.checked"

  # 4 — the cross-cutting RBAC loop: revoking comment.create disables commenting for
  # that role (the effect no unit/integration test can span end to end).
  Scenario: Granting and revoking comment.create toggles the comment form for a normal user
    Given I am logged in as "peter-pan"
    When I navigate to page "/post/post-1/a-post"
    Then I see the comment form
    When the role "user" does not have the permission "comment.create"
    And I navigate to page "/post/post-1/a-post"
    Then I do not see the comment form
    And I see the commenting-disabled notice

  # A — group-driven isAdmin: ANY administration-group permission opens the admin area,
  # even on a custom role (the maintenance-free design — no hard-coded key list).
  Scenario: A custom role with an administration-group permission opens the admin area
    Given a role "donations-manager" granting "donation.manage" exists
    And the user with id "peter" is assigned the role "donations-manager"
    And I am logged in as "peter-pan"
    And I navigate to page "/"
    When I click on the avatar menu in the top right corner
    Then I see the admin menu item
    When I navigate to page "/admin/donations"
    Then I am on page "/admin/donations"

  # B — role management lifecycle through the admin UI.
  Scenario: Admin creates a custom role, grants it a permission, and it persists
    Given I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I start creating a role named "editor"
    And I confirm creating the role
    Then I see the element with test id "role-tab-editor"
    When I select the role "editor"
    And I enable the permission "comment.create" for role "editor"
    And I save the role "editor"
    Then I see a toaster with status "success"
    When I navigate to page "/admin/roles"
    And I select the role "editor"
    Then the permission "comment.create" for role "editor" should "be.checked"

  Scenario: Protected and baseline roles cannot be deleted, a custom role can
    Given a role "editor" granting "comment.create" exists
    And I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I select the role "owner"
    Then the delete button for role "owner" is disabled
    When I select the role "user"
    Then the delete button for role "user" is disabled
    When I select the role "editor"
    And I delete the role "editor"
    Then I see a toaster with status "success"
    And I do not see the element with test id "role-tab-editor"

  Scenario: Admin assigns a custom role to a user via the users page
    Given a role "editor" granting "comment.create" exists
    And I am logged in as "admin"
    When I navigate to page "/admin/users"
    And I assign the role "editor" to the user with id "peter"
    Then the user with id "peter" has the role "editor" selected

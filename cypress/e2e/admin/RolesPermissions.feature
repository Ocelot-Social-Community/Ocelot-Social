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

  # B2 — renaming a custom role through the admin UI keeps its members (the exact
  # gap a live test hit: an existing custom role could not be renamed at all).
  Scenario: Admin renames a custom role, and it keeps its members
    Given a role "editor" granting "comment.create" exists
    And the user with id "peter" is assigned the role "editor"
    And I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I select the role "editor"
    And I start renaming the role to "content-lead"
    And I confirm the rename
    Then I see a toaster with status "success"
    And I see the element with test id "role-tab-content-lead"
    And I do not see the element with test id "role-tab-editor"
    When I navigate to page "/admin/users"
    Then the user with id "peter" has the role "content-lead" selected

  # B3 — the name-collision guard (RoleService.renameRole) surfaces in the UI: renaming
  # onto an existing role name is rejected and the error toast is shown; the role keeps
  # its old name.
  Scenario: Renaming a role onto an existing name surfaces an error in the UI
    Given a role "editor" granting "comment.create" exists
    And a role "reviewer" granting "comment.create" exists
    And I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I select the role "editor"
    And I start renaming the role to "reviewer"
    And I confirm the rename
    Then I see a toaster with status "error"
    And I see the element with test id "role-tab-editor"

  Scenario: Admin assigns a custom role to a user via the users page
    Given a role "editor" granting "comment.create" exists
    And I am logged in as "admin"
    When I navigate to page "/admin/users"
    And I assign the role "editor" to the user with id "peter"
    Then the user with id "peter" has the role "editor" selected

  # C — live RBAC: a permission change applies WITHOUT a reload, via the
  # permissionsChanged subscription. The acting admin's own menu updates over the
  # websocket — the path no unit/integration test can span.
  Scenario: A granted permission adds its admin menu entry live, without a reload
    Given the role "admin" does not have the permission "network.statistics.read"
    And I am logged in as "admin"
    When I navigate to page "/admin/roles"
    And I select the role "admin"
    Then I do not see a link to page "/admin"
    When I enable the permission "network.statistics.read" for role "admin"
    And I save the role "admin"
    Then I see a toaster with status "success"
    And I eventually see a link to page "/admin"

  # D — landing redirect: an admin who can't see the dashboard is sent to the first
  # tab they can actually use, instead of the dashboard's error state.
  Scenario: An admin without statistics lands on the first accessible admin page
    Given the role "admin" does not have the permission "network.statistics.read"
    And I am logged in as "admin"
    When I navigate to page "/admin"
    Then I am on page "/admin/users"

  # E — reports surfaced in the admin area (admin holding content.moderate).
  Scenario: An admin with content.moderate sees and opens the reports in the admin area
    Given somebody reported the following posts:
      | submitterEmail          | resourceId | reasonCategory     | reasonDescription |
      | r.submitter@example.org | post-1     | discrimination_etc | Offensive content |
    And I am logged in as "admin"
    When I navigate to page "/admin"
    Then I see a link to page "/admin/reports"
    When I navigate to page "/admin/reports"
    Then I am on page "/admin/reports"
    And I see the reported post "A shared post" in the list

  # F — deleting a user from the list (user.delete.any) with a confirmation dialog.
  Scenario: Admin deletes a user from the user list after confirming
    Given I am logged in as "admin"
    When I navigate to page "/admin/users"
    And I delete the user with id "peter"
    And I confirm the action in the modal
    Then I see a toaster with status "success"
    And I do not see the element with test id "user-delete-peter"

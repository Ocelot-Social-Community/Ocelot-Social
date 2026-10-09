Feature: A network admin hands a group back from its owner
  As a network admin
  I want to take a group out of the hands of an owner who abuses it or is gone
  So that the group gets an owner it can rely on instead of being switched off

  # Inside a group an owner has no superior: two owners are peers by rights. A network admin who
  # elevates with `group.administer.any_<visibility>` stands above every member, owners included
  # (backend groupRole/authority.ts, `outranksMembers`) — re-roling and removing the owner is
  # exactly what that is for.

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | role  | termsAndConditionsAgreedVersion |
      | admin | admin@example.org | 1234     | admin | Admin | admin | 0.0.4                           |
      | olga  | olga@example.org  | 1234     | olga  | Olga  | user  | 0.0.4                           |
      | max   | max@example.org   | 1234     | max   | Max   | user  | 0.0.4                           |
    And the following "groups" are in the database:
      | id            | name          | slug          | template | ownerId | about                   | description                                                                     | actionRadius |
      | secret-circle | Secret Circle | secret-circle | hidden   | olga    | A group nobody can find | A hidden group whose owner is about to be replaced by the network administration. | global       |
    And "max" is a member of group "secret-circle"

  Scenario: The owner rows are out of reach until the admin elevates
    Given I am logged in as "admin"
    When I navigate to page "/groups/edit/secret-circle/members"
    Then I see the element with test id "elevation-offer"
    And the member "olga" offers no role picker and no remove button

  Scenario: The admin elevates, appoints a new owner and removes the old one
    Given I am logged in as "admin"
    When I navigate to page "/groups/edit/secret-circle/members"
    And I elevate in the group with the reason "The owner abuses the group"
    Then I see the element with test id "elevation-active"
    # The role definitions are read only now — before, the picker was stuck with the roles the
    # members carried and offered no `owner` to appoint.
    When I give the member "max" the group role "owner"
    Then I see a toaster with status "success"
    And the member "max" has the group role "owner"
    When I remove the member "olga" from the group
    Then I see a toaster with status "success"
    And the member "olga" is no longer listed
    And the member "max" has the group role "owner"

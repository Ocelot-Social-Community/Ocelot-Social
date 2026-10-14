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
      | shared-circle | Shared Circle | shared-circle | closed   | admin   | Two owners, one admin   | A closed group the network admin owns together with another owner.                | global       |
    And "max" is a member of group "secret-circle"
    And "olga" is an owner of group "shared-circle"

  # Not even the member list: reading into a group on a network right is asked for like any other
  # use of it (#10506).
  Scenario: The members are out of sight until the admin elevates
    Given I am logged in as "admin"
    When I navigate to page "/groups/edit/secret-circle/members"
    Then I see the element with test id "elevation-offer"
    And the member "olga" is not listed

  # Loaded from the server on purpose: the rights tab asked for the group's roles, which need
  # group.role.manage, and that refusal during server-side rendering was a bare "Server error".
  Scenario: The rights tab loads for an admin who has not elevated yet
    Given I am logged in as "admin"
    When I navigate to page "/groups/edit/secret-circle/rights"
    Then I see the element with test id "elevation-offer"

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

  # #10481: an admin who OWNS the group too was never offered the elevation — their membership
  # already holds every right — so the co-owner, their peer, stayed out of reach, while an admin
  # outside the group could act on them.
  Scenario: An admin who co-owns the group elevates and demotes the other owner
    Given I am logged in as "admin"
    When I navigate to page "/groups/edit/shared-circle/members"
    Then the member "olga" offers no role picker and no remove button
    And I see the element with test id "elevation-offer"
    When I elevate in the group with the reason "The other owner left the network"
    Then I see the element with test id "elevation-active"
    When I give the member "olga" the group role "usual"
    Then I see a toaster with status "success"
    And the member "olga" has the group role "usual"

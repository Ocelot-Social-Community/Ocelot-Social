Feature: Group rights stay as saved
  As the owner of a group
  I want the rights page to show what I saved
  So that I do not save a right back that I just took away

  # A group's roles carry no id, so the Apollo cache keeps them embedded in the group and no save
  # reaches that copy. Answering the page from the cache brought the old ticks back on the next
  # visit, and only a hard reload showed the truth (#10490). The navigation in between has to be
  # client-side: a full page load starts with an empty cache and would hide the bug.

  Background:
    Given the following "users" are in the database:
      | slug   | email              | password | id     | name   | termsAndConditionsAgreedVersion |
      | olivia | olivia@example.org | 1234     | olivia | Olivia | 0.0.4                           |
    And the following "groups" are in the database:
      | id          | name        | slug        | template | ownerId | about           | description                                                  | actionRadius |
      | open-circle | Open Circle | open-circle | public   | olivia  | Rights at stake | A public group whose member rights are about to be narrowed. | regional     |

  Scenario: A right taken away is still gone when the page is opened again
    Given I am logged in as "olivia"
    And I navigate to page "/groups/edit/open-circle/rights"
    And I open the detailed group rights
    And the group right "group.comment.create" is ticked
    When I untick the group right "group.comment.create"
    And I save the group rights
    Then I see a toaster with status "success"
    When I remember that the page has not been reloaded
    And I open the group settings tab "members"
    And I open the group settings tab "rights"
    And I open the detailed group rights
    Then the group right "group.comment.create" is not ticked
    And the page has not been reloaded

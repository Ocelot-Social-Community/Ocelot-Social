Feature: Event posts
  As a logged in user
  I want to create event posts and see event-specific validation behaviour

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id       | name            | termsAndConditionsAgreedVersion |
      | narrator | narrator@example.org | 1234     | narrator | Nathan Narrator | 0.0.4                           |
    And I am logged in as "narrator"

  Scenario: Saving an event without a start date shows an error toast
    When I navigate to page "/post/create/event"
    And I choose "My Event Without Date" as the title
    And I choose the following text as content:
      """
      This event has no start date set.
      """
    And I click on "save button"
    Then I see a toaster with status "error"
    And I see a toaster with "Please fill in all required fields."

  Scenario: Entering a past start date shows the past-start warning
    When I navigate to page "/post/create/event"
    And I enter the date "15.01.2020 10:00" in the event start date picker
    Then I see a "warning" message:
      """
      The event start is in the past.
      """

  Scenario: Create an online event
    When I navigate to page "/post/create/event"
    And I choose "Community Meetup Online" as the title
    And I choose the following text as content:
      """
      Join us for our online community meetup.
      """
    And I enter the date "15.08.2026 10:00" in the event start date picker
    And I check the online event checkbox
    And I click on "save button"
    Then I am on page "/post/.*/community-meetup-online"
    And the post was saved successfully

  Scenario: Location names with umlauts can be found and selected
    Given location search returns "Köln, Deutschland" for "Köln"
    When I navigate to page "/post/create/event"
    And I type "Köln" in the location search field
    And I wait for 600 milliseconds
    And I select "Köln, Deutschland" from the location dropdown
    Then I see "Köln, Deutschland" selected in the location field

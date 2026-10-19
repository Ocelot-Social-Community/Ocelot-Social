Feature: Notification about comments on a post I observe
  As the author of a post, or somebody who commented on it
  I want to hear of new comments on it — and to stop hearing of them
  In order to follow the conversations I take part in

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | termsAndConditionsAgreedVersion |
      | alice | alice@example.org | 1234     | alice | Alice | 0.0.4                           |
      | bob   | bob@example.org   | 1234     | bob   | Bob   | 0.0.4                           |
    # Through the API, not the factory: writing the post is what makes bob observe it.
    And "bob" writes the post "Seedlings to give away"
    And the mailbox is empty

  Scenario: A comment on a post I observe arrives while I am on the page
    Given I am logged in as "bob"
    And I am online on page "/"
    When "alice" comments "I would love some tomatoes" on the post "Seedlings to give away"
    Then see 1 unread notifications in the top menu

  Scenario: A post I stopped observing notifies me no more
    Given I am logged in as "bob"
    And I open the post "Seedlings to give away"
    When I stop observing the post
    Then I see a toaster with "You are no longer observing this post!"
    When "alice" comments "I would love some tomatoes" on the post "Seedlings to give away"
    # The comment's notifications are written before CreateComment answers, so the list,
    # fetched after it, holds what there is.
    Then my notifications page lists no notification

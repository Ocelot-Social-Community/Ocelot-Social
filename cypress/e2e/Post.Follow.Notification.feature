Feature: Notifications Posts
  As a user
  I want to observe a post
  In order to get notified about new comments on a post

  When absent or offline I get notified via e-mail
  # No notifications or emails are send regarding comments from users I have blocked or muted


  Background:
    Given the following "users" are in the database:
      | name               | slug               | email                 | password | id   |  termsAndConditionsAgreedVersion |
      | Bob der Baumeister | bob-der-baumeister | moderator@example.org | 1234     | u2   |  0.0.4                           |
      | Jenny Rostock      | jenny-rostock      | user@example.org      | 1234     | u3   |  0.0.4                           |
      | Nathan Narrator    | nathan-narrator    | narrator@example.org  | abcd     | u_nn |  0.0.4                           |
    #   | Billy Block        | billy-block        | billy@example.org     | 4321     | u_bb |  0.0.4                           |
    And the following "posts" are in the database:
      | id        | title          | slug       | authorId        |
      | nicePost  | The nice Post  | nice-post  | jenny-rostock   |
    #   | funnyPost | The funny Post | funny-post | nathan-narrator |
    # And "Bob der Baumeister" mutes "Nathan Narrator"
    # And "Bob der Baumeister" blocks "Billy Block"

  Scenario: Receive notifications regarding observed Post
    Given "Bob der Baumeister" observes the post "nicePost"
    When "Nathan Narrator" comments on the post "nicePost"
    Then "moderator@example.org" receives an email regarding "The nice Post"
    When I am logged in as "Bob der Baumeister"
    Then a notification about the new post is displayed in the nav menu

  # omit these scenarios as the different ways into observing /unobserving a post should be covered in unit testing

  # Scenario: Unfollow a post and receive no more notifications about it
  #   Given I follow a post 
  #   And I am on the page of the post
  #   When I click the unfollow button
  #   Then the post is explicitly unfollowed in the database

  # Scenario: Follow authored posts by default get notified
  #   When I write a post
  #   Then I follow the post by default

  # Scenario: Follow commented posts by default get notified
  #   When I write a comment to a post
  #   Then I follow the post by default

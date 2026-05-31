Feature: Video call pre-join
  As a member of a public group with the video-call feature enabled
  I want to set up my camera and microphone before joining a call
  So that I can review my settings without yet connecting to the room

  Background:
    Given the following "users" are in the database:
      | slug    | email             | password | id    | name  | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org | 1234     | alice | Alice | 0.0.4                           |
      | outsider| outsider@example.org | 4321  | out   | Outsider | 0.0.4                        |
    And the following "groups" are in the database:
      | id         | name        | slug        | ownerId | groupType | description                                                                                                              |
      | call-group | Call Group  | call-group  | alice   | public    | This is a public group for end-to-end testing of the video call PreJoin flow. The description must be over 100 chars.    |

  Scenario: Non-members do not see the video-call button
    Given I am logged in as "outsider"
    And I navigate to page "/groups/call-group/call-group"
    Then the video call button is not visible

  Scenario: A public-group member sees the video-call button
    Given "alice" is a member of group "call-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/call-group/call-group"
    Then the video call button is visible

  Scenario: Clicking the video-call button opens the pre-join dialog
    Given "alice" is a member of group "call-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/call-group/call-group"
    When I click on the video-call button
    Then I see the video-call pre-join dialog

  Scenario: Cancelling the pre-join dialog closes it
    Given "alice" is a member of group "call-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/call-group/call-group"
    When I click on the video-call button
    And I cancel the video-call pre-join dialog
    Then I no longer see the video-call pre-join dialog

  Scenario: The microphone toggle flips state
    Given "alice" is a member of group "call-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/call-group/call-group"
    When I click on the video-call button
    And I toggle the pre-join microphone
    Then the pre-join microphone is off

  Scenario: The camera toggle flips state
    Given "alice" is a member of group "call-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/call-group/call-group"
    When I click on the video-call button
    And I toggle the pre-join camera
    Then the pre-join camera is off

  # NOTE: The two error-pfad scenarios that previously lived here (joining a
  # call that lands in the error block, and back-to-pre-join from the error
  # block) were removed because they depended on the backend handing out an
  # unreachable LiveKit URL. Locally that URL comes from backend/.env and
  # points at a real LiveKit instance, so the connect call succeeds and the
  # error block never renders — making the suite flaky depending on the
  # developer's setup. Reintroduce them only when we can stub the
  # joinGroupVideoCall response (e.g. via cy.intercept) so the test owns the
  # condition instead of inheriting it from the environment.

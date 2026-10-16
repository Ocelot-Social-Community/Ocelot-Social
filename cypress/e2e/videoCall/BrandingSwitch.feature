Feature: A branding switch does not drop a running video call
  As somebody in a video call
  I want a branding switch by an admin to wait until I have left the call
  So that the call is not cut off for everybody in it (#10353)

  # A real LiveKit connection is beyond the e2e stack (see README.md), so the call is represented
  # by its phase in the store, which is what decides whether a reload has to wait. The call window
  # itself is not open, so its notice and toast about the waiting reload are covered by
  # VideoCall.spec.js, not here.

  # The policy cache survives the database wipe between scenarios: the composition is set at the
  # start and reset at the end rather than assumed.
  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | role  | termsAndConditionsAgreedVersion |
      | admin | admin@example.org | 1234     | admin | Admin | admin | 0.0.4                           |
      | alice | alice@example.org | 1234     | alice | Alice | user  | 0.0.4                           |
    And the branding composition is ""

  Scenario: The new branding is applied once the call has ended
    Given I am logged in as "alice"
    And I navigate to page "/"
    And I am in a video call
    When an admin sets the branding composition to "{\"theme\":\"@default\"}"
    Then the page has not been reloaded
    When I leave the video call
    Then the page is reloaded with the branding composition "{\"theme\":\"@default\"}"
    And the branding composition is ""

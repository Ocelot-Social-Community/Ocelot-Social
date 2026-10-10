Feature: Register and recover an account
  As somebody who wants to join a network, or forgot their password
  I want to sign up, confirm my e-mail address, and get back in
  So that I can take part

  # The codes the server mails are read from the database instead of the mailbox: the e2e stack
  # sends no mail, and a test that waits for one would only be slower and flakier. What is tested
  # is everything around it — the slides the network's policies choose, the code check, the
  # account creation and the login that follows.

  # Optional fields of the last slide, off so every scenario fills the same form — the policy cache
  # survives the database wipe between scenarios, so they are set rather than assumed.
  Background:
    # The policy step sets policies as this admin.
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | role  | termsAndConditionsAgreedVersion |
      | admin | admin@example.org | 1234     | admin | Admin | admin | 0.0.4                           |
    And the network policy "askForRealName" is "false"
    And the network policy "requireLocation" is "false"

  Scenario: Register on an open network
    Given the network policy "publicRegistration" is "true"
    When I navigate to page "/registration"
    And I enter the e-mail address "newcomer@example.org"
    And I enter the code that was sent to "newcomer@example.org"
    And I create my account as "Nora Newcomer" with the password "Secret1234"
    Then I am logged in with username "Nora Newcomer"

  Scenario: Register with an invite code where only invited people may join
    Given the network policy "publicRegistration" is "false"
    And the network policy "inviteRegistration" is "true"
    And the following "users" are in the database:
      | slug    | email               | password | id      | name    | termsAndConditionsAgreedVersion |
      | inviter | inviter@example.org | 1234     | inviter | Ingrid  | 0.0.4                           |
    And "inviter" has the invite code "E2EINV"
    When I navigate to page "/registration"
    And I enter the invite code "E2EINV"
    And I enter the e-mail address "invited@example.org"
    And I enter the code that was sent to "invited@example.org"
    And I create my account as "Ivan Invited" with the password "Secret1234"
    Then I am logged in with username "Ivan Invited"

  Scenario: No registration where the network admits nobody
    Given the network policy "publicRegistration" is "false"
    And the network policy "inviteRegistration" is "false"
    When I navigate to page "/registration"
    Then I see that registration is closed

  Scenario: A wrong code does not confirm the e-mail address
    Given the network policy "publicRegistration" is "true"
    When I navigate to page "/registration"
    And I enter the e-mail address "typo@example.org"
    And I enter a wrong code for "typo@example.org"
    Then I see a toaster with status "error"
    And I am still asked for the code

  Scenario: Reset a forgotten password
    Given the following "users" are in the database:
      | slug      | email                 | password | id        | name      | termsAndConditionsAgreedVersion |
      | forgetful | forgetful@example.org | OldPass1 | forgetful | Fritz     | 0.0.4                           |
    When I navigate to page "/password-reset/request"
    And I request a password reset for "forgetful@example.org"
    And I enter the reset code that was sent to "forgetful@example.org"
    And I choose the new password "NewPass1234"
    Then I can log in as "forgetful@example.org" with "NewPass1234"
    And I cannot log in as "forgetful@example.org" with "OldPass1"

  Scenario: A wrong reset code does not change the password
    Given the following "users" are in the database:
      | slug      | email                 | password | id        | name      | termsAndConditionsAgreedVersion |
      | forgetful | forgetful@example.org | OldPass1 | forgetful | Fritz     | 0.0.4                           |
    When I navigate to page "/password-reset/request"
    And I request a password reset for "forgetful@example.org"
    And I enter a wrong reset code for "forgetful@example.org"
    And I choose the new password "NewPass1234"
    Then I cannot log in as "forgetful@example.org" with "NewPass1234"
    And I can log in as "forgetful@example.org" with "OldPass1"

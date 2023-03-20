import CONFIG from '../../../config'
import logosWebapp from '../../../config/logos.js'
import {
  signupTemplate,
  emailVerificationTemplate,
  resetPasswordTemplate,
  wrongAccountTemplate,
  notificationTemplate,
} from './templateBuilder'

const englishHint = 'English version below!'
const welcomeImageUrl = new URL(logosWebapp.LOGO_WELCOME_PATH, CONFIG.CLIENT_URI)
const supportUrl = CONFIG.SUPPORT_URL.toString()
let actionUrl, name, settingsUrl

const signupTemplateData = () => ({
  email: 'test@example.org',
  variables: {
    nonce: '12345',
    inviteCode: 'AAAAAA',
  },
})
const emailVerificationTemplateData = () => ({
  email: 'test@example.org',
  variables: {
    nonce: '12345',
    name: 'Mr Example',
  },
})
const resetPasswordTemplateData = () => ({
  email: 'test@example.org',
  variables: {
    nonce: '12345',
    name: 'Mr Example',
  },
})
const wrongAccountTemplateData = () => ({
  email: 'test@example.org',
  variables: {},
})
const notificationTemplateData = (locale) => ({
  email: 'test@example.org',
  variables: {
    notification: {
      to: { name: 'Mr Example', locale },
    },
  },
})
const textsStandard = [
  {
    templPropName: 'from',
    isContaining: false,
    text: CONFIG.EMAIL_DEFAULT_SENDER,
  },
  {
    templPropName: 'to',
    isContaining: false,
    text: 'test@example.org',
  },
  // is contained in html
  welcomeImageUrl.toString(),
  CONFIG.ORGANIZATION_URL,
  CONFIG.APPLICATION_NAME,
]
const testEmailData = (emailTemplate, templateBuilder, templateData, texts) => {
  if (!emailTemplate) {
    emailTemplate = templateBuilder(templateData)
  }
  texts.forEach((element) => {
    if (typeof element === 'object') {
      if (element.isContaining) {
        expect(emailTemplate[element.templPropName]).toEqual(expect.stringContaining(element.text))
      } else {
        expect(emailTemplate[element.templPropName]).toEqual(element.text)
      }
    } else {
      expect(emailTemplate.html).toEqual(expect.stringContaining(element))
    }
  })
  return emailTemplate
}

describe('templateBuilder', () => {
  describe('signupTemplate', () => {
    describe('multi language', () => {
      it('e-mail is build with all data', () => {
        const subject = `Willkommen, Bienvenue, Welcome to ${CONFIG.APPLICATION_NAME}!`
        const actionUrl = new URL('/registration', CONFIG.CLIENT_URI).toString()
        const theSignupTemplateData = signupTemplateData()
        const enContent = "Thank you for joining our cause – it's awesome to have you on board."
        const deContent =
          'Danke, dass Du dich angemeldet hast – wir freuen uns, Dich dabei zu haben.'
        testEmailData(null, signupTemplate, theSignupTemplateData, [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          englishHint,
          actionUrl,
          theSignupTemplateData.variables.nonce,
          theSignupTemplateData.variables.inviteCode,
          enContent,
          deContent,
          supportUrl,
        ])
      })
    })
  })

  describe('emailVerificationTemplate', () => {
    describe('multi language', () => {
      it('e-mail is build with all data', () => {
        const subject = 'Neue E-Mail Adresse | New E-Mail Address'
        const actionUrl = new URL('/settings/my-email-address/verify', CONFIG.CLIENT_URI).toString()
        const theEmailVerificationTemplateData = emailVerificationTemplateData()
        const enContent = 'So, you want to change your e-mail? No problem!'
        const deContent = 'Du möchtest also deine E-Mail ändern? Kein Problem!'
        testEmailData(null, emailVerificationTemplate, theEmailVerificationTemplateData, [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          englishHint,
          actionUrl,
          theEmailVerificationTemplateData.variables.nonce,
          theEmailVerificationTemplateData.variables.name,
          enContent,
          deContent,
          supportUrl,
        ])
      })
    })
  })

  describe('resetPasswordTemplate', () => {
    describe('multi language', () => {
      it('e-mail is build with all data', () => {
        const subject = 'Neues Passwort | Reset Password'
        const actionUrl = new URL('/password-reset/change-password', CONFIG.CLIENT_URI).toString()
        const theResetPasswordTemplateData = resetPasswordTemplateData()
        const enContent = 'So, you forgot your password? No problem!'
        const deContent = 'Du hast also dein Passwort vergessen? Kein Problem!'
        testEmailData(null, resetPasswordTemplate, theResetPasswordTemplateData, [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          englishHint,
          actionUrl,
          theResetPasswordTemplateData.variables.nonce,
          theResetPasswordTemplateData.variables.name,
          enContent,
          deContent,
          supportUrl,
        ])
      })
    })
  })

  describe('wrongAccountTemplate', () => {
    describe('multi language', () => {
      it('e-mail is build with all data', () => {
        const subject = 'Falsche Mailadresse? | Wrong E-mail?'
        const actionUrl = new URL('/password-reset/request', CONFIG.CLIENT_URI).toString()
        const theWrongAccountTemplateData = wrongAccountTemplateData()
        const enContent =
          "You requested a password reset but unfortunately we couldn't find an account associated with your e-mail address."
        const deContent =
          'Du hast bei uns ein neues Passwort angefordert – leider haben wir aber keinen Account mit Deiner E-Mailadresse gefunden.'
        testEmailData(null, wrongAccountTemplate, theWrongAccountTemplateData, [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          englishHint,
          actionUrl,
          enContent,
          deContent,
          supportUrl,
        ])
      })
    })
  })

  describe('notificationTemplate', () => {
    beforeEach(() => {
      actionUrl = new URL('/notifications', CONFIG.CLIENT_URI).toString()
      name = notificationTemplateData('en').variables.notification.to.name
      settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)
    })

    describe('en', () => {
      it('e-mail is build with all data', () => {
        const subject = `${CONFIG.APPLICATION_NAME} – Notification`
        const content = 'You received at least one notification. Click on this button to view them:'
        testEmailData(null, notificationTemplate, notificationTemplateData('en'), [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          actionUrl,
          name,
          content,
          settingsUrl,
        ])
      })
    })

    describe('de', () => {
      it('e-mail is build with all data', async () => {
        const subject = `${CONFIG.APPLICATION_NAME} – Benachrichtigung`
        const content = `Du hast mindestens eine Benachrichtigung erhalten. Klick auf diesen Button, um sie anzusehen:`
        testEmailData(null, notificationTemplate, notificationTemplateData('de'), [
          ...textsStandard,
          {
            templPropName: 'subject',
            isContaining: false,
            text: subject,
          },
          actionUrl,
          name,
          content,
          settingsUrl,
        ])
      })
    })
  })
})

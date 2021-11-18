import CONFIG from '../../../config'
import logosWebapp from '../../../config/logos.js'
import {
  signupTemplate,
  // resetPasswordTemplate,
  // wrongAccountTemplate,
  // emailVerificationTemplate,
  notificationTemplate,
} from './templateBuilder'

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
  // is containing in html
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

beforeAll(async () => {
  // await cleanDatabase()
})

afterAll(async () => {
  // await cleanDatabase()
})

describe('templateBuilder', () => {
  describe('signupTemplate', () => {
    describe('multi language', () => {
      it('e-mail is build with all data', () => {
        const actionUrl = new URL('/registration', CONFIG.CLIENT_URI).toString()
        const theSignupTemplateData = signupTemplateData()
        // locale: en
        let content = "Thank you for joining our cause – it's awesome to have you on board."
        const emailTemplate = testEmailData(null, signupTemplate, theSignupTemplateData, [
          ...textsStandard,
          actionUrl,
          content,
          supportUrl,
          theSignupTemplateData.variables.nonce,
          theSignupTemplateData.variables.inviteCode,
        ])
        // locale: de
        content = 'Danke, dass Du dich angemeldet hast – wir freuen uns, Dich dabei zu haben.'
        testEmailData(emailTemplate, signupTemplate, theSignupTemplateData, [
          // ...textsStandard, // tested at locale: en
          content,
        ])
      })
    })
  })

  // describe('XXX', () => {
  //   it('e-mail is build with all data', async () => {
  //     XXX({
  //         email: 'test@example.org',
  //         XXX notification: notificationAdded,
  //       })
  //   })
  // })

  describe('notificationTemplate', () => {
    beforeEach(() => {
      actionUrl = new URL('/notifications', CONFIG.CLIENT_URI).toString()
      name = 'Mr Example'
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

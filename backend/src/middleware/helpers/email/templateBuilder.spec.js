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
const supportUrl = CONFIG.SUPPORT_URL
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
const testEmailData = (emailTemplate, templateBuilder, templateData, individuals) => {
  if (!emailTemplate) {
    emailTemplate = templateBuilder(templateData)
  }
  expect(emailTemplate.from).toEqual(CONFIG.EMAIL_DEFAULT_SENDER)
  expect(emailTemplate.to).toEqual('test@example.org')
  if (individuals.subject) {
    expect(emailTemplate.subject).toEqual(individuals.subject)
  }
  expect(emailTemplate.html).toEqual(expect.stringContaining(welcomeImageUrl.toString()))
  if (individuals.name) {
    expect(emailTemplate.html).toEqual(expect.stringContaining(individuals.name))
  }
  if (individuals.actionUrl) {
    expect(emailTemplate.html).toEqual(expect.stringContaining(individuals.actionUrl.toString()))
  }
  expect(emailTemplate.html).toEqual(expect.stringContaining(CONFIG.ORGANIZATION_URL))
  expect(emailTemplate.html).toEqual(expect.stringContaining(CONFIG.APPLICATION_NAME))
  if (individuals.settingsUrl) {
    expect(emailTemplate.html).toEqual(expect.stringContaining(individuals.settingsUrl.toString()))
  }
  expect(emailTemplate.html).toEqual(expect.stringContaining(individuals.content))
  if (individuals.supportUrl) {
    expect(emailTemplate.html).toEqual(expect.stringContaining(individuals.supportUrl.toString()))
  }
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
        const actionUrl = new URL('/registration', CONFIG.CLIENT_URI)
        const theSignupTemplateData = signupTemplateData()
        // locale: en
        let content = "Thank you for joining our cause – it's awesome to have you on board."
        const emailTemplate = testEmailData(null, signupTemplate, theSignupTemplateData, {
          actionUrl,
          content,
          supportUrl,
        })
        // locale: de
        content = 'Danke, dass Du dich angemeldet hast – wir freuen uns, Dich dabei zu haben.'
        testEmailData(emailTemplate, signupTemplate, theSignupTemplateData, {
          content,
        })
        // test additional
        expect(emailTemplate.html).toEqual(
          expect.stringContaining(theSignupTemplateData.variables.nonce),
        )
        expect(emailTemplate.html).toEqual(
          expect.stringContaining(theSignupTemplateData.variables.inviteCode),
        )
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
      actionUrl = new URL('/notifications', CONFIG.CLIENT_URI)
      name = 'Mr Example'
      settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)
    })

    describe('en', () => {
      it('e-mail is build with all data', () => {
        const subject = `${CONFIG.APPLICATION_NAME} – Notification`
        const content = 'You received at least one notification. Click on this button to view them:'
        testEmailData(null, notificationTemplate, notificationTemplateData('en'), {
          subject,
          actionUrl,
          name,
          settingsUrl,
          content,
        })
      })
    })

    describe('de', () => {
      it('e-mail is build with all data', async () => {
        const subject = `${CONFIG.APPLICATION_NAME} – Benachrichtigung`
        const content = `Du hast mindestens eine Benachrichtigung erhalten. Klick auf diesen Button, um sie anzusehen:`
        testEmailData(null, notificationTemplate, notificationTemplateData('de'), {
          subject,
          actionUrl,
          name,
          settingsUrl,
          content,
        })
      })
    })
  })
})

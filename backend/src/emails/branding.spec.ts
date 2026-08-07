// The brand-dependent locals of a mail, asserted on the RENDERED html rather than on the params
// object — that is the only place where "the mail carries the brand's logo" is actually true or false.
//
// The motivating failure: a production mail from a branded network showed
// `src="https://<brand>/img/custom/logo-squared.svg"`, the framework default, while the footer
// carried the brand's organisation name. Both values are read from the same composed config, so that
// combination can only arise when the two are read at DIFFERENT times — which is what a module-scope
// read of `branding` does. Snapshot tests cannot catch it: they run unbranded, where the default IS
// the expected value.
import CONFIG from '@config/index'
import { setBranding, brandingDefaults } from '@src/branding'

import { sendResetPasswordMail, defaultParams } from './sendEmail'

const BRAND = {
  ...brandingDefaults,
  metadata: { ...brandingDefaults.metadata, organizationName: 'Acme Network' },
  logos: { ...brandingDefaults.logos, welcomePath: '/branding/acme/assets/logo-squared.svg' },
}

const data = {
  email: 'user@example.org',
  nonce: '123456',
  locale: 'en',
  name: 'Jenny Rostock',
}

const render = async (): Promise<string> => {
  const message = await sendResetPasswordMail(data)
  return message.html
}

describe('branding in rendered mails', () => {
  // setBranding writes a process-global shared by every test in this file's worker, so a brand left
  // behind would leak into whatever runs next.
  afterEach(() => {
    setBranding(undefined)
  })

  describe('with a brand injected', () => {
    beforeEach(() => {
      setBranding(BRAND)
    })

    // The bug as reported: the logo stayed on the framework default while the rest of the mail was
    // branded. `/img/custom/…` is served by the webapp for vanilla only — on a branded network it is
    // the ocelot logo sitting under the brand's own domain.
    it('renders the brand logo, not the framework default', async () => {
      const html = await render()

      expect(html).toContain(
        `src="${new URL('/branding/acme/assets/logo-squared.svg', CONFIG.CLIENT_URI).toString()}"`,
      )
      expect(html).not.toContain('/img/custom/logo-squared.svg')
    })

    it('renders the brand organisation name', async () => {
      expect(await render()).toContain('Acme Network')
    })
  })

  // A brand injected AFTER this module was imported must still reach the mail. Reading `branding`
  // into a plain property at module scope passes every other test in this folder and fails this one.
  it('picks up a brand set after import rather than freezing the value', async () => {
    expect(await render()).toContain('/img/custom/logo-squared.svg') // vanilla first

    setBranding(BRAND)

    expect(await render()).toContain('/branding/acme/assets/logo-squared.svg')
  })

  it('falls back to the framework defaults when no brand is set', async () => {
    const html = await render()

    expect(html).toContain('/img/custom/logo-squared.svg')
    expect(html).toContain(brandingDefaults.metadata.organizationName)
  })

  // The support variants are switched by MUTATING defaultParams (see supportLine.spec.ts), so the
  // getters must not have turned it into something frozen or regenerated per read.
  it('keeps SUPPORT_EMAIL writable and deletable for the support-line variants', () => {
    const original = defaultParams.SUPPORT_EMAIL

    defaultParams.SUPPORT_EMAIL = 'support@example.org'
    expect(defaultParams.SUPPORT_EMAIL).toBe('support@example.org')

    delete defaultParams.SUPPORT_EMAIL
    expect(defaultParams.SUPPORT_EMAIL).toBeUndefined()

    defaultParams.SUPPORT_EMAIL = original
  })
})

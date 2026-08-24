import { mount } from '@vue/test-utils'
import SocialMedia from './SocialMedia.vue'

const stubs = {
  'ds-text': true,
}

describe('SocialMedia.vue', () => {
  let propsData
  let mocks

  beforeEach(() => {
    propsData = {}

    mocks = {
      $t: jest.fn(),
      // Feature on by default; individual scenarios flip it off to check the gate.
      $policy: { get: jest.fn(() => true) },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(SocialMedia, { propsData, mocks, stubs })
    }

    describe('socialMedia card title', () => {
      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava',
              __typename: 'SocialMedia',
            },
          ],
        }
      })

      it('renders socialMedia card title', () => {
        Wrapper()
        expect(mocks.$t).toHaveBeenCalledWith('profile.socialMedia')
      })
    })

    describe('socialMedia links', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'dc91aecb-3289-47d0-8770-4b24eb24fd9c',
              url: 'https://www.facebook.com/NimitBhargava',
              __typename: 'SocialMedia',
            },
            {
              id: 'db1dc400-9303-4b43-9451-87dcac13b913',
              url: 'https://www.youtube.com/channel/UCu3GiKBFn5I07V9hBxF2CRA',
              __typename: 'SocialMedia',
            },
          ],
        }
        // Now assign wrapper
        wrapper = Wrapper()
      })

      it('shows 3 social media links', () => {
        expect(wrapper.findAll('a')).toHaveLength(3)
      })

      it('renders a social media link', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.attributes('href')).toEqual('https://www.instagram.com/nimitbhargava')
      })

      it('shows the first favicon', () => {
        const favicon = wrapper.findAll('a').at(0).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.instagram.com/favicon.ico')
      })

      it('shows the second favicon', () => {
        const favicon = wrapper.findAll('a').at(1).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.facebook.com/favicon.ico')
      })

      it('shows the last favicon', () => {
        const favicon = wrapper.findAll('a').at(-1).find('img')
        expect(favicon.attributes('src')).toEqual('https://www.youtube.com/favicon.ico')
      })
    })

    describe('social media links with trailing slash', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava/',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('strips trailing slash and shows the username', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('nimitbhargava')
      })
    })

    describe('social media link that is just a domain with www', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.example.com/',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('strips leading www. from the displayed label', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('example.com')
        expect(link.text()).not.toContain('www.')
      })
    })

    describe('a url with a scheme the browser must not follow', () => {
      // This card sits on a PUBLIC profile, and Vue does not sanitise an href binding — a
      // stored `javascript:` url would run in the browser of whoever clicks it. The backend
      // now only accepts http and https, but rows written before that rule are still in the
      // database, which is why the check is repeated here.
      const wrapperFor = (url) => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            { id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e', url, __typename: 'SocialMedia' },
          ],
        }
        return Wrapper()
      }

      it.each([
        ['javascript', 'javascript:alert(document.cookie)'],
        ['javascript in mixed case', 'jaVaScRiPt:alert(1)'],
        ['data', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
        ['vbscript', 'vbscript:msgbox(1)'],
        ['file', 'file:///etc/passwd'],
        // Right scheme, no host: nothing for a browser to follow. A `^https?://` test let
        // these through and the card showed a dead link with a broken favicon.
        ['https without a host', 'https://'],
        ['http without a host', 'http://'],
        ['a string that is no url at all', 'not-a-url'],
      ])('renders no link at all for a %s url', (_scheme, url) => {
        const wrapper = wrapperFor(url)
        expect(wrapper.findAll('a')).toHaveLength(0)
        // Not by another route either: no href, and no favicon src derived from the value.
        expect(wrapper.html()).not.toContain(url)
      })

      it('renders no card at all when every url is unfollowable', () => {
        // The card is a list of links. With `v-if` still asking the RAW list while the loop
        // asked the filtered one, a profile like this rendered the heading over nothing.
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            { id: 'a', url: 'javascript:alert(1)', __typename: 'SocialMedia' },
            { id: 'b', url: 'file:///etc/passwd', __typename: 'SocialMedia' },
          ],
        }
        const wrapper = Wrapper()
        expect(wrapper.find('[data-test="social-media-list-headline"]').exists()).toBe(false)
        expect(wrapper.html()).toBe('')
      })

      it('still renders the card when only some urls are unfollowable', () => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            { id: 'a', url: 'javascript:alert(1)', __typename: 'SocialMedia' },
            { id: 'b', url: 'https://example.org/profile', __typename: 'SocialMedia' },
          ],
        }
        const wrapper = Wrapper()
        expect(wrapper.find('[data-test="social-media-list-headline"]').exists()).toBe(true)
        expect(wrapper.findAll('a')).toHaveLength(1)
        expect(wrapper.findAll('a').at(0).attributes('href')).toEqual('https://example.org/profile')
      })

      it.each([
        ['https', 'https://www.instagram.com/nimitbhargava'],
        ['http', 'http://example.org/profile'],
        ['an uppercase scheme, as a browser reads it', 'HTTPS://example.org/profile'],
      ])('still links a %s url', (_scheme, url) => {
        expect(wrapperFor(url).findAll('a').at(0).attributes('href')).toEqual(url)
      })

      it.each([
        ['https://www.instagram.com/nimitbhargava', 'https://www.instagram.com/favicon.ico'],
        ['http://example.org/profile', 'http://example.org/favicon.ico'],
        // Lower-cased, because the origin comes from the parsed url now and that is how a
        // browser reads a scheme. The href keeps whatever was stored.
        ['HTTPS://example.org/profile', 'https://example.org/favicon.ico'],
        // The port belongs to the origin: a site on 8443 does not serve its favicon on 443.
        ['https://example.org:8443/profile', 'https://example.org:8443/favicon.ico'],
        // Credentials do not. `origin` drops them, so nothing asks a host called `user` for an
        // icon and no secret travels in an image request.
        ['https://user:secret@example.org/profile', 'https://example.org/favicon.ico'],
      ])('derives the favicon from the origin of %s', (url, expected) => {
        const favicon = wrapperFor(url).findAll('a').at(0).find('img')
        expect(favicon.attributes('src')).toEqual(expected)
      })

      it('never puts credentials from a url into the page', () => {
        // The label used to be cut out of the raw string, so this profile rendered
        // "user:secret@example.org" as the name of the link — a password on a page every
        // visitor can open.
        const wrapper = wrapperFor('https://user:secret@example.org/')
        expect(wrapper.text()).not.toContain('secret')
        expect(wrapper.html()).not.toContain('secret')
        expect(wrapper.findAll('a').at(0).text()).toContain('example.org')
      })

      it('drops credentials from the href, and only from an href that has them', () => {
        // Rewriting every href would also normalise what needs no fixing — `toString()` adds a
        // slash to `https://example.org` and lower-cases the scheme — and the stored value is
        // what the owner chose to publish.
        const withCredentials = wrapperFor('https://user:secret@example.org/profile')
        expect(withCredentials.findAll('a').at(0).attributes('href')).toEqual(
          'https://example.org/profile',
        )
        const without = wrapperFor('HTTPS://example.org/profile')
        expect(without.findAll('a').at(0).attributes('href')).toEqual('HTTPS://example.org/profile')
      })

      it('shows the port in the label, because it is part of the address', () => {
        const link = wrapperFor('https://example.org:8443/').findAll('a').at(0)
        expect(link.text()).toContain('example.org:8443')
      })
    })

    describe('a mail address', () => {
      const wrapperFor = (url) => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            { id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e', url, __typename: 'SocialMedia' },
          ],
        }
        return Wrapper()
      }

      it('links a plain mailto', () => {
        const link = wrapperFor('mailto:jenny@example.org').findAll('a').at(0)
        expect(link.attributes('href')).toEqual('mailto:jenny@example.org')
      })

      it('shows the address as the label', () => {
        const link = wrapperFor('mailto:jenny@example.org').findAll('a').at(0)
        expect(link.text()).toContain('jenny@example.org')
      })

      it('shows an icon instead of a favicon, because a mail address has no host', () => {
        // The earlier version derived one from whatever it did not understand and would have
        // asked the browser for `ailto/favicon.ico`.
        const wrapper = wrapperFor('mailto:jenny@example.org')
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.favicon-fallback').exists()).toBe(true)
      })

      it('links a mailto whose scheme is uppercase, as a browser reads it', () => {
        const link = wrapperFor('MAILTO:jenny@example.org').findAll('a').at(0)
        expect(link.attributes('href')).toEqual('MAILTO:jenny@example.org')
      })

      it.each([
        // Query parameters pre-fill the composer. A reader who clicks "write to me" would send
        // a message they never wrote, to recipients they never saw.
        ['a bcc parameter', 'mailto:jenny@example.org?bcc=evil@example.tld'],
        ['a subject and body', 'mailto:jenny@example.org?subject=Hi&body=Please%20pay'],
        // Several recipients are the same trick without the query string.
        ['more than one recipient', 'mailto:jenny@example.org,evil@example.tld'],
        ['no address at all', 'mailto:'],
        ['something that is not an address', 'mailto:notanaddress'],
        ['an address without a domain', 'mailto:jenny@'],
      ])('renders no link for a mailto with %s', (_case, url) => {
        const wrapper = wrapperFor(url)
        expect(wrapper.findAll('a')).toHaveLength(0)
        expect(wrapper.html()).not.toContain(url)
      })
    })

    describe('social media link with a username that starts with www.', () => {
      let wrapper

      beforeEach(() => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/www.example',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
      })

      it('keeps the leading www. in the username path segment', () => {
        const link = wrapper.findAll('a').at(0)
        expect(link.text()).toContain('www.example')
      })
    })

    describe('when the socialMediaEnabled policy is off', () => {
      beforeEach(() => {
        mocks.$policy.get = jest.fn(() => false)
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://www.instagram.com/nimitbhargava',
              __typename: 'SocialMedia',
            },
          ],
        }
      })

      it('renders no links even though the user has some', () => {
        const wrapper = Wrapper()
        expect(wrapper.find('.social-media-bc').exists()).toBe(false)
        expect(wrapper.findAll('a')).toHaveLength(0)
      })
    })

    describe('when a favicon fails to load', () => {
      let wrapper

      beforeEach(async () => {
        propsData.userName = 'Jenny Rostock'
        propsData.user = {
          socialMedia: [
            {
              id: 'ee1e8ed6-fbef-4bcf-b411-a12926f2ea1e',
              url: 'https://broken.example.com/user',
              __typename: 'SocialMedia',
            },
          ],
        }
        wrapper = Wrapper()
        await wrapper.find('img').trigger('error')
      })

      it('replaces the broken favicon with a fallback icon', () => {
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.favicon-fallback').exists()).toBe(true)
      })
    })
  })
})

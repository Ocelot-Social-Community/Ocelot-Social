import { mount, RouterLinkStub } from '@vue/test-utils'
import Vuex from 'vuex'
import ReportRow from './ReportRow.vue'
import { OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import { reports } from '~/components/features/ReportList/ReportList.story.js'

const localVue = global.localVue

describe('ReportRow', () => {
  let propsData, mocks, stubs, getters, wrapper

  beforeEach(() => {
    propsData = {}
    mocks = {
      $t: jest.fn((string) => string),
    }
    stubs = {
      NuxtLink: RouterLinkStub,
      'client-only': true,
    }
    getters = {
      'auth/user': () => {
        return { slug: 'awesome-user' }
      },
      'auth/isModerator': () => true,
    }
  })

  describe('given a report', () => {
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters,
      })
      return mount(ReportRow, { propsData, mocks, stubs, localVue, store })
    }

    describe('has not been closed', () => {
      let confirmButton
      beforeEach(() => {
        propsData = { ...propsData, report: reports[1] }
        wrapper = Wrapper()
        confirmButton = wrapper.find('[data-test="confirm"]')
      })

      it('renders a confirm button', () => {
        expect(confirmButton.exists()).toBe(true)
      })

      it('emits confirm event', () => {
        confirmButton.trigger('click')
        expect(wrapper.emitted('confirm-report')).toHaveLength(1)
      })
    })

    describe('has been closed', () => {
      beforeEach(() => {
        propsData = { ...propsData, report: reports[2] }
        wrapper = Wrapper()
      })

      it('renders a decided text', () => {
        const decidedTitle = wrapper
          .findAll('.title')
          .filter((title) => title.text() === 'moderation.reports.decided')
        expect(decidedTitle.exists()).toBe(true)
      })
    })

    describe('has not been reviewed', () => {
      beforeEach(() => {
        propsData = { ...propsData, report: reports[1] }
        wrapper = Wrapper()
      })

      it('renders its current status', () => {
        expect(wrapper.find('.status-line').text()).toEqual('moderation.reports.enabled')
      })
    })

    describe('has been reviewed', () => {
      describe('and disabled', () => {
        beforeEach(() => {
          propsData = { ...propsData, report: reports[2] }
          wrapper = Wrapper()
        })
        it('renders the disabled icon', () => {
          expect(wrapper.find('.status-line').findComponent(OsIcon).props().icon).toBe(
            ocelotIcons.eyeSlash,
          )
        })

        it('renders its current status', () => {
          expect(wrapper.find('.status-line').text()).toEqual('moderation.reports.disabledBy')
        })
      })

      describe('and enabled', () => {
        beforeEach(() => {
          propsData = { ...propsData, report: reports[0] }
          wrapper = Wrapper()
        })
        it('renders the enabled icon', () => {
          expect(wrapper.find('.status-line').findComponent(OsIcon).props().icon).toBe(
            ocelotIcons.eye,
          )
        })

        it('renders its current status', () => {
          expect(wrapper.find('.status-line').text()).toEqual('moderation.reports.enabledBy')
        })

        it('renders the moderator who reviewed the resource', () => {
          const username = wrapper.find('[data-test="report-reviewer"]')
          expect(username.text()).toContain('Moderator')
        })
      })
    })

    describe('concerns a Comment', () => {
      beforeEach(() => {
        propsData = { ...propsData, report: reports[0] }
        wrapper = Wrapper()
      })

      it('renders a comments icon', () => {
        const icon = wrapper.findComponent(OsIcon).props().icon
        expect(icon).toBe(ocelotIcons.comments)
      })

      it('renders a link to the post, with the comment contentExcerpt', () => {
        const postLink = wrapper.find('.title')
        expect(postLink.text()).toEqual('@peter-lustig Lorem ipsum dolor sit amet, …')
      })

      it('renders the author', () => {
        const userSlug = wrapper.find('[data-test="report-author"]')
        expect(userSlug.text()).toContain('Louie')
      })
    })

    describe('concerns a Post', () => {
      beforeEach(() => {
        propsData = { ...propsData, report: reports[1] }
        wrapper = Wrapper()
      })

      it('renders a bookmark icon', () => {
        const icon = wrapper.findComponent(OsIcon).props().icon
        expect(icon).toBe(ocelotIcons.bookmark)
      })

      it('renders a link to the post', () => {
        const postLink = wrapper.find('.title')
        expect(postLink.text()).toEqual("I'm a bigoted post!")
      })

      it('renders the author', () => {
        const username = wrapper.find('[data-test="report-author"]')
        expect(username.text()).toContain('Dagobert')
      })
    })

    describe('concerns content in a group the moderator may not read', () => {
      beforeEach(() => {
        // The server blanked the content and said so with `resourceHidden`. The row must not
        // render a link to a post it cannot show, and must not offer a decision the shield
        // refuses on the very same condition.
        propsData = {
          ...propsData,
          report: {
            ...reports[1],
            resourceHidden: true,
            resource: { ...reports[1].resource, title: null, content: null },
          },
        }
        wrapper = Wrapper()
      })

      it('says that the content sits in a group it may not read', () => {
        expect(wrapper.find('[data-test="report-hidden"]').text()).toBe(
          'moderation.reports.hiddenContent',
        )
        expect(wrapper.find('.title').exists()).toBe(false)
      })

      it('offers no decision, because the server would refuse it', () => {
        expect(wrapper.find('[data-test="confirm"]').exists()).toBe(false)
        expect(wrapper.find('[data-test="report-undecidable"]').text()).toBe(
          'moderation.reports.hiddenDecision',
        )
      })

      it('still shows the metadata the report is escalated with', () => {
        expect(wrapper.find('[data-test="report-author"]').text()).toContain('Dagobert')
        expect(wrapper.find('[data-test="report-reviewer"]').exists()).toBe(true)
      })
    })

    describe('concerns a User', () => {
      beforeEach(() => {
        propsData = { ...propsData, report: reports[2] }
        wrapper = Wrapper()
      })

      it('renders a user icon', () => {
        const icon = wrapper.findComponent(OsIcon).props().icon
        expect(icon).toBe(ocelotIcons.user)
      })

      it('renders a link to the user profile', () => {
        const userLink = wrapper.find('[data-test="report-content"]')
        expect(userLink.text()).toContain('Abusive user')
      })
    })
  })
})

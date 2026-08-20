import { mount } from '@vue/test-utils'
import ContributionForm from './ContributionForm.vue'
import PostMutations from '~/graphql/PostMutations.js'

import Vuex from 'vuex'

import ImageUploader from '~/components/Uploader/ImageUploader'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage.vue'
import MutationObserver from 'mutation-observer'

global.MutationObserver = MutationObserver

const localVue = global.localVue

const stubs = {
  'client-only': true,
  'nuxt-link': true,
  'v-popover': true,
  'date-picker': true,
}

describe('ContributionForm.vue', () => {
  let wrapper, postTitleInput, expectedParams, cancelBtn, mocks, propsData
  const postTitle = 'this is a title for a post'
  const postTitleTooShort = 'xx'
  let postTitleTooLong = ''
  for (let i = 0; i < 101; i++) {
    postTitleTooLong += 'x'
  }
  const postContent = 'this is a post'
  const imageUpload = {
    file: {
      filename: 'avataar.svg',
      previewElement: '',
    },
    url: 'someUrlToImage',
  }
  const image = { sensitive: false, url: '/uploads/1562010976466-avataaars', aspectRatio: 1 }
  beforeEach(() => {
    mocks = {
      $t: jest.fn((t) => t),
      $apollo: {
        mutate: jest.fn().mockResolvedValueOnce({
          data: {
            CreatePost: {
              title: postTitle,
              slug: 'this-is-a-title-for-a-post',
              content: postContent,
              contentExcerpt: postContent,
              postType: ['Article'],
            },
          },
        }),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
      $i18n: {
        locale: () => 'en',
      },
      $router: {
        back: jest.fn(),
        push: jest.fn(),
      },
    }
    propsData = {}
  })

  describe('mount', () => {
    const getters = {
      'editor/placeholder': () => {
        return 'some cool placeholder'
      },
      'auth/isModerator': () => false,
      'auth/user': () => {
        return {
          id: '4711',
          name: 'You yourself',
          slug: 'you-yourself',
        }
      },
    }
    const store = new Vuex.Store({
      getters,
      actions: {
        'categories/init': jest.fn(),
      },
    })
    const Wrapper = () => {
      return mount(ContributionForm, {
        mocks,
        localVue,
        store,
        propsData,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    describe('CreatePost', () => {
      describe('invalid form submission', () => {
        beforeEach(async () => {
          postTitleInput = wrapper.find('.ds-input')
          postTitleInput.setValue(postTitle)
          await wrapper.vm.updateEditorContent(postContent)
        })

        it('has no event data block', () => {
          expect(wrapper.find('div.eventData').exists()).toBe(false)
        })

        it('title cannot be empty', async () => {
          postTitleInput.setValue('')
          wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })

        it('title cannot be too long', async () => {
          postTitleInput.setValue(postTitleTooLong)
          wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })

        it('title cannot be too short', async () => {
          postTitleInput.setValue(postTitleTooShort)
          wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })

        it('content cannot be empty', async () => {
          await wrapper.vm.updateEditorContent('')
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })

        it('shows error toast when submitting with invalid form', async () => {
          postTitleInput.setValue('')
          wrapper.find('form').trigger('submit')
          await wrapper.vm.$nextTick()
          expect(mocks.$toast.error).toHaveBeenCalledWith('common.validations.formHasErrors')
        })
      })

      describe('valid form submission', () => {
        beforeEach(async () => {
          expectedParams = {
            mutation: PostMutations().CreatePost,
            variables: {
              title: postTitle,
              content: postContent,
              categoryIds: [],
              id: null,
              image: null,
              groupId: null,
              postType: 'Article',
            },
          }
          postTitleInput = wrapper.find('.ds-input')
          postTitleInput.setValue(postTitle)
          await wrapper.vm.updateEditorContent(postContent)
        })

        it('creates a post with valid title and content', async () => {
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining(expectedParams))
        })

        it('blocks a permission-less create with a denied-hint toast, not a silent no-op', async () => {
          const denied = mount(ContributionForm, {
            mocks: { ...mocks, $can: () => false },
            localVue,
            store,
            propsData,
            stubs,
          })
          denied.find('.ds-input').setValue(postTitle)
          await denied.vm.updateEditorContent(postContent)
          await denied.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
          expect(mocks.$toast.error).toHaveBeenCalledWith('permissions.deniedHint')
        })

        it('supports adding a teaser image', async () => {
          expectedParams.variables.image = {
            aspectRatio: null,
            sensitive: false,
            upload: imageUpload,
            type: null,
          }
          const spy = jest
            .spyOn(FileReader.prototype, 'readAsDataURL')
            .mockImplementation(function () {
              this.onload({ target: { result: 'someUrlToImage' } })
            })
          wrapper.findComponent(ImageUploader).vm.$emit('addHeroImage', imageUpload)
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining(expectedParams))
          expect(spy).toHaveBeenCalledWith(imageUpload)
          spy.mockRestore()
        })

        it('content with only an HTML tag and no visible text is invalid', async () => {
          await wrapper.vm.updateEditorContent(
            '<a href="https://www.youtube.com/watch?v=smoEelV6FUk" target="_blank"></a>',
          )
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(0)
        })

        it('content with a link and visible text is valid', async () => {
          await wrapper.vm.updateEditorContent(
            '<a href="https://www.youtube.com/watch?v=smoEelV6FUk" target="_blank">YouTube</a>',
          )
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
        })

        it("pushes the user to the post's page", async () => {
          wrapper.find('form').trigger('submit')
          await mocks.$apollo.mutate
          expect(mocks.$router.push).toHaveBeenCalledTimes(1)
        })

        it('shows a success toaster', async () => {
          wrapper.find('form').trigger('submit')
          await mocks.$apollo.mutate
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })
      })

      describe('cancel', () => {
        it('calls $router.back() when cancel button clicked', () => {
          cancelBtn = wrapper.find('[data-test="cancel-button"]')
          cancelBtn.trigger('click')
          expect(mocks.$router.back).toHaveBeenCalledTimes(1)
        })
      })

      describe('handles errors', () => {
        beforeEach(async () => {
          jest.useFakeTimers()
          mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({
            message: 'Not Authorized!',
          })
          wrapper = Wrapper()
          postTitleInput = wrapper.find('.ds-input')
          postTitleInput.setValue(postTitle)
          await wrapper.vm.updateEditorContent(postContent)
        })

        it('shows an error toaster when apollo mutation rejects', async () => {
          await wrapper.find('form').trigger('submit')
          await mocks.$apollo.mutate
          await expect(mocks.$toast.error).toHaveBeenCalledWith('Not Authorized!')
        })
      })

      describe('contentLength', () => {
        it('returns 0 for HTML without visible text', async () => {
          await wrapper.vm.updateEditorContent(
            '<a href="https://www.youtube.com/watch?v=smoEelV6FUk" target="_blank"></a>',
          )
          expect(wrapper.vm.contentLength).toBe(0)
        })

        it('returns the visible text length, ignoring HTML tags', async () => {
          await wrapper.vm.updateEditorContent(
            '<a href="https://www.youtube.com/watch?v=smoEelV6FUk" target="_blank">YouTube</a>',
          )
          expect(wrapper.vm.contentLength).toBe('YouTube'.length)
        })
      })
    })

    describe('UpdatePost', () => {
      beforeEach(() => {
        propsData = {
          contribution: {
            id: 'p1456',
            slug: 'dies-ist-ein-post',
            title: 'dies ist ein Post',
            content: 'auf Deutsch geschrieben',
            image,
          },
        }
        wrapper = Wrapper()
      })

      it('sets title equal to contribution title', () => {
        expect(wrapper.vm.formData.title).toEqual(propsData.contribution.title)
      })

      it('sets content equal to contribution content', () => {
        expect(wrapper.vm.formData.content).toEqual(propsData.contribution.content)
      })

      describe('valid update', () => {
        beforeEach(() => {
          mocks.$apollo.mutate = jest.fn().mockResolvedValueOnce({
            data: {
              UpdatePost: {
                title: postTitle,
                slug: 'this-is-a-title-for-a-post',
                content: postContent,
                contentExcerpt: postContent,
              },
            },
          })
          wrapper = Wrapper()
          expectedParams = {
            mutation: PostMutations().UpdatePost,
            variables: {
              title: propsData.contribution.title,
              content: propsData.contribution.content,
              categoryIds: [],
              id: propsData.contribution.id,
              groupId: null,
              image: {
                sensitive: false,
              },
              postType: 'Article',
            },
          }
        })

        it('calls the UpdatePost apollo mutation', async () => {
          expectedParams.variables.content = postContent
          wrapper.vm.updateEditorContent(postContent)
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining(expectedParams))
        })

        it('supports deleting a teaser image', async () => {
          expectedParams.variables.image = null
          propsData.contribution.image = { url: '/uploads/someimage.png' }
          wrapper = Wrapper()
          wrapper.find('[data-test="delete-button"]').trigger('click')
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining(expectedParams))
        })

        it('renders an existing (already saved) teaser image via ResponsiveImage, not a plain <img src>', () => {
          propsData.contribution.image = {
            url: '/uploads/someimage.png',
            w320: '/uploads/someimage-320.png',
            w640: '/uploads/someimage-640.png',
            w1024: '/uploads/someimage-1024.png',
          }
          wrapper = Wrapper()
          expect(wrapper.findComponent(ResponsiveImage).exists()).toBe(true)
        })

        it('renders a freshly picked (not yet saved) image as a plain <img>, not ResponsiveImage', async () => {
          const spy = jest
            .spyOn(FileReader.prototype, 'readAsDataURL')
            .mockImplementation(function () {
              this.onload({ target: { result: 'someUrlToImage' } })
            })
          propsData.contribution.image = {
            url: '/uploads/someimage.png',
            w320: '/uploads/someimage-320.png',
            w640: '/uploads/someimage-640.png',
            w1024: '/uploads/someimage-1024.png',
          }
          wrapper = Wrapper()
          wrapper.findComponent(ImageUploader).vm.$emit('addHeroImage', imageUpload)
          await wrapper.vm.$nextTick()
          expect(wrapper.findComponent(ResponsiveImage).exists()).toBe(false)
          expect(wrapper.find('img.image').exists()).toBe(true)
          spy.mockRestore()
        })
      })
    })

    describe('Events', () => {
      beforeEach(() => {
        propsData.postType = 'Event'
        wrapper = Wrapper()
      })

      it('has event data block', () => {
        expect(wrapper.find('div.eventData').exists()).toBe(true)
      })

      it('shows past-start warning immediately when editing an event with a past start date', () => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // yesterday
        propsData.contribution = { eventStart: pastDate.toISOString() }
        wrapper = Wrapper()
        expect(wrapper.vm.eventStartIsInPast).toBe(true)
      })

      describe('is online event', () => {
        it('has false as default', () => {
          expect(wrapper.vm.formData.eventIsOnline).toBe(false)
        })

        it('has input for event location', () => {
          expect(wrapper.findComponent({ name: 'LocationSelect' }).exists()).toBe(true)
        })

        describe('click is online event', () => {
          beforeEach(() => {
            wrapper.find('input[name="eventIsOnline"]').setChecked(true)
          })

          it('event location input is disabled', () => {
            expect(wrapper.findComponent({ name: 'LocationSelect' }).props('disabled')).toBe(true)
          })

          it('does not show location error immediately after unchecking online', async () => {
            wrapper.find('input[name="eventIsOnline"]').setChecked(false)
            await wrapper.vm.$nextTick()
            expect(wrapper.vm.visibleErrors?.eventLocationName).toBeFalsy()
          })

          it('still requires venue description even when online is checked', async () => {
            await wrapper.find('form').trigger('submit')
            await Promise.resolve()
            expect(wrapper.vm.visibleErrors?.eventVenue).toBeTruthy()
            expect(wrapper.vm.visibleErrors?.eventLocationName).toBeFalsy()
          })
        })

        describe('invalid form', () => {
          beforeEach(() => {
            wrapper.find('input[name="title"]').setValue('Illegaler Kindergeburtstag')
            wrapper.vm.updateEditorContent('Elli hat Geburtstag!')
          })

          it('has submit button enabled before submit attempt', () => {
            expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
          })
        })

        describe('valid form', () => {
          const now = new Date()

          beforeEach(() => {
            wrapper.find('input[name="title"]').setValue('Illegaler Kindergeburtstag')
            wrapper.vm.updateEditorContent('Elli hat Geburtstag!')
            wrapper
              .findComponent({ name: 'DatePicker' })
              .vm.$emit('change', new Date(now.getFullYear(), now.getMonth() + 1).toISOString())
            wrapper.find('input[name="eventVenue"]').setValue('Ellis Kinderzimmer')
            wrapper.vm.updateFormField('eventLocationName', 'Deutschland')
          })

          it('has submit button not disabled', () => {
            expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBe(undefined)
          })

          describe('submit', () => {
            beforeEach(() => {
              wrapper.find('form').trigger('submit')
            })

            it('calls create post', () => {
              expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
                mutation: PostMutations().CreatePost,
                variables: expect.objectContaining({
                  title: 'Illegaler Kindergeburtstag',
                  content: 'Elli hat Geburtstag!',
                  eventInput: {
                    eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
                    eventVenue: 'Ellis Kinderzimmer',
                    eventLocationName: 'Deutschland',
                    eventIsOnline: false,
                    eventEnd: null,
                  },
                }),
              })
            })
          })

          describe('submit with LocationSelect object payload', () => {
            beforeEach(async () => {
              wrapper.vm.updateFormField('eventLocationName', {
                label: 'Deutschland, Germany',
                value: 'Deutschland, Germany',
                id: 'place.abc123',
              })
              await wrapper.find('form').trigger('submit')
              await wrapper.vm.$nextTick()
            })

            it('extracts the value string from the location object', () => {
              expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
                mutation: PostMutations().CreatePost,
                variables: expect.objectContaining({
                  eventInput: expect.objectContaining({
                    eventLocationName: 'Deutschland, Germany',
                  }),
                }),
              })
            })
          })
        })
      })
    })

    describe('validation watchers', () => {
      // A previous describe block enables fake timers (line 215) without
      // restoring real ones — isolate this suite to be timer-independent.
      beforeEach(() => {
        jest.useRealTimers()
      })

      it('re-runs validation when postType flips from Article to Event', async () => {
        wrapper = Wrapper()
        wrapper.find('.ds-input').setValue(postTitle)
        await wrapper.vm.updateEditorContent(postContent)
        expect(wrapper.vm.formErrors).toBeNull()

        await wrapper.setProps({ postType: 'Event' })
        await Promise.resolve()

        expect(wrapper.vm.formErrors).not.toBeNull()
        expect(wrapper.vm.formErrors).toEqual(
          expect.objectContaining({
            eventStart: expect.any(String),
            eventVenue: expect.any(String),
          }),
        )
      })

      it('re-runs validation when group prop changes', async () => {
        wrapper = Wrapper()
        const spy = jest.spyOn(wrapper.vm, '$validateForm')
        wrapper.setProps({ group: { id: 'g1', groupType: 'public' } })
        await wrapper.vm.$nextTick()
        expect(spy).toHaveBeenCalled()
      })
    })

    describe('validation visibility', () => {
      beforeEach(() => {
        jest.useRealTimers()
        wrapper = Wrapper()
      })

      it('shows no title error when blurring without having typed', async () => {
        wrapper.find('input[name="title"]').trigger('blur')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors?.title).toBeFalsy()
      })

      it('shows title error after user types an invalid value and blurs', async () => {
        wrapper.find('.ds-input').setValue('x') // too short — marks field dirty
        await wrapper.vm.$nextTick()
        await Promise.resolve()
        wrapper.find('input[name="title"]').trigger('blur')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.visibleErrors?.title).toBeTruthy()
      })

      it('makes all errors visible after a failed submit attempt', async () => {
        wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        await Promise.resolve()
        expect(wrapper.vm.submitAttempted).toBe(true)
        expect(wrapper.vm.visibleErrors?.title).toBeTruthy()
        expect(wrapper.vm.visibleErrors?.content).toBeTruthy()
      })
    })

    describe('image upload lives on formData', () => {
      it('stores the raw File on formData.imageUpload (not on component data)', () => {
        const spy = jest
          .spyOn(FileReader.prototype, 'readAsDataURL')
          .mockImplementation(function () {
            this.onload({ target: { result: 'someUrlToImage' } })
          })
        wrapper = Wrapper()
        wrapper.findComponent(ImageUploader).vm.$emit('addHeroImage', imageUpload)
        expect(wrapper.vm.formData.imageUpload).toBe(imageUpload)
        expect(wrapper.vm.imageUpload).toBeUndefined()
        spy.mockRestore()
      })

      it('uses formData.imageUpload (not a stale local ref) as the mutation upload', async () => {
        const spy = jest
          .spyOn(FileReader.prototype, 'readAsDataURL')
          .mockImplementation(function () {
            this.onload({ target: { result: 'someUrlToImage' } })
          })
        wrapper = Wrapper()
        wrapper.find('.ds-input').setValue(postTitle)
        await wrapper.vm.updateEditorContent(postContent)
        wrapper.findComponent(ImageUploader).vm.$emit('addHeroImage', imageUpload)
        await wrapper.find('form').trigger('submit')
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              image: expect.objectContaining({ upload: imageUpload }),
            }),
          }),
        )
        spy.mockRestore()
      })
    })

    describe('groupId sourcing', () => {
      it('submits with formData.groupId even before the group prop has loaded', async () => {
        // Simulates the race where ?groupId=g1 has already seeded the draft
        // but Apollo has not yet resolved the full group object.
        propsData = {
          externalFormData: {
            title: '',
            content: '',
            image: null,
            imageAspectRatio: null,
            imageType: null,
            imageBlurred: false,
            imageUpload: null,
            categoryIds: [],
            eventStart: null,
            eventEnd: null,
            eventLocation: '',
            eventLocationName: '',
            eventVenue: '',
            eventIsOnline: false,
            groupId: 'g1',
          },
          group: null,
        }
        wrapper = Wrapper()
        wrapper.find('.ds-input').setValue(postTitle)
        await wrapper.vm.updateEditorContent(postContent)
        await wrapper.find('form').trigger('submit')
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({ groupId: 'g1' }),
          }),
        )
      })
    })
  })
})

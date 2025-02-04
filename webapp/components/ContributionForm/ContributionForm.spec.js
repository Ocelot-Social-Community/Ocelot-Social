import { mount } from '@vue/test-utils'
import ContributionForm from './ContributionForm.vue'
import PostMutations from '~/graphql/PostMutations.js'

import Vuex from 'vuex'

import ImageUploader from '~/components/Uploader/ImageUploader'
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
      $t: jest.fn(),
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
      $env: {
        CATEGORIES_ACTIVE: false,
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
          spy.mockReset()
        })

        it('content is valid with just a link', async () => {
          await wrapper.vm.updateEditorContent(
            '<a href="https://www.youtube.com/watch?v=smoEelV6FUk" target="_blank"></a>',
          )
          wrapper.find('form').trigger('submit')
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
      })
    })

    describe('Events', () => {
      beforeEach(() => {
        propsData.createEvent = true
        wrapper = Wrapper()
      })

      it('has event data block', () => {
        expect(wrapper.find('div.eventDatas').exists()).toBe(true)
      })

      describe('is online event', () => {
        it('has false as default', () => {
          expect(wrapper.vm.formData.eventIsOnline).toBe(false)
        })

        it('has input for event location', () => {
          expect(wrapper.find('input[name="eventLocationName"]').exists()).toBe(true)
        })

        describe('click is online event', () => {
          beforeEach(() => {
            wrapper.find('input[name="eventIsOnline"]').setChecked(true)
          })

          it('has no input for event location', () => {
            expect(wrapper.find('input[name="eventLocationName"]').exists()).toBe(false)
          })
        })

        describe.skip('invalid form', () => {
          beforeEach(() => {
            wrapper.find('input[name="title"]').setValue('Illegaler Kindergeburtstag')
            wrapper.vm.updateEditorContent('Elli hat Geburtstag!')
          })

          it.skip('has submit button disabled', () => {
            expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBe('disabled')
          })
        })

        describe.skip('valid form', () => {
          const now = new Date()

          beforeEach(() => {
            wrapper.find('input[name="title"]').setValue('Illegaler Kindergeburtstag')
            wrapper.vm.updateEditorContent('Elli hat Geburtstag!')
            wrapper
              .findComponent({ name: 'DatePicker' })
              .vm.$emit('change', new Date(now.getFullYear(), now.getMonth() + 1).toISOString())
            wrapper.find('input[name="eventVenue"]').setValue('Ellis Kinderzimmer')
            wrapper.find('input[name="eventLocationName"]').setValue('Deutschland')
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
        })
      })
    })
  })
})

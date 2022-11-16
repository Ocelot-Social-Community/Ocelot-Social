import { mount } from '@vue/test-utils'
import MySomethingList from './MySomethingList.vue'
import Vue from 'vue'

const localVue = global.localVue

describe('MySomethingList.vue', () => {
  let wrapper
  let propsData
  let data
  let mocks

  beforeEach(() => {
    propsData = {
      useFormData: { dummy: '' },
      useItems: [{ id: 'id', dummy: 'dummy' }],
      namePropertyKey: 'dummy',
      callbacks: { edit: jest.fn(), submit: jest.fn(), delete: jest.fn() },
    }
    data = () => {
      return {}
    }
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    let form, slots
    const Wrapper = () => {
      slots = {
        'list-item': '<div class="list-item"></div>',
        'edit-item': '<div class="edit-item"></div>',
      }
      return mount(MySomethingList, {
        propsData,
        data,
        mocks,
        localVue,
        slots,
      })
    }

    describe('given existing item', () => {
      beforeEach(() => {
        wrapper = Wrapper()
      })

      describe('for each item it', () => {
        it('displays the item as slot "list-item"', () => {
          expect(wrapper.find('.list-item').exists()).toBe(true)
        })

        it('displays the edit button', () => {
          expect(wrapper.find('.base-button[data-test="edit-button"]').exists()).toBe(true)
        })

        it('displays the delete button', () => {
          expect(wrapper.find('.base-button[data-test="delete-button"]').exists()).toBe(true)
        })
      })

      describe('editing item', () => {
        beforeEach(async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
        })

        it('disables adding items while editing', () => {
          const submitButton = wrapper.find('.base-button[data-test="add-save-button"]')
          expect(submitButton.text()).not.toContain('settings.social-media.submit')
        })

        it('allows the user to cancel editing', async () => {
          expect(wrapper.find('.edit-item').exists()).toBe(true)
          const cancelButton = wrapper.find('button#cancel')
          cancelButton.trigger('click')
          await Vue.nextTick()
          expect(wrapper.find('.edit-item').exists()).toBe(false)
        })
      })

      describe('calls callback functions', () => {
        it('calls edit', async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: 'id', dummy: 'dummy' })
          expect(propsData.callbacks.edit).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.edit).toHaveBeenCalledWith(expect.any(Object), expectedItem)
        })

        it('calls submit', async () => {
          form = wrapper.find('form')
          form.trigger('submit')
          await Vue.nextTick()
          form.trigger('submit')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: '' })
          expect(propsData.callbacks.submit).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.submit).toHaveBeenCalledWith(
            expect.any(Object),
            true,
            expectedItem,
            { dummy: '' },
          )
        })

        it('calls delete', async () => {
          const deleteButton = wrapper.find('.base-button[data-test="delete-button"]')
          deleteButton.trigger('click')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: 'id', dummy: 'dummy' })
          expect(propsData.callbacks.delete).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.delete).toHaveBeenCalledWith(expect.any(Object), expectedItem)
        })
      })
    })
  })
})

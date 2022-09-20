import { config, mount } from '@vue/test-utils'
import GroupProfileSlug from './_slug.vue'

const localVue = global.localVue

localVue.filter('date', (d) => d)

config.stubs['client-only'] = '<span><slot /></span>'
// config.stubs['v-popover'] = '<span><slot /></span>'
config.stubs['nuxt-link'] = '<span><slot /></span>'
// config.stubs['infinite-loading'] = '<span><slot /></span>'
// config.stubs['follow-list'] = '<span><slot /></span>'

describe('GroupProfileSlug', () => {
  let wrapper
  let Wrapper
  let mocks
  let yogaPractice
  let schoolForCitizens
  let investigativeJournalism
  let peterLustig
  let jennyRostock
  let bobDerBaumeister
  let huey

  beforeEach(() => {
    mocks = {
      $env: {
        CATEGORIES_ACTIVE: true,
      },
      // post: {
      //   id: 'p23',
      //   name: 'It is a post',
      // },
      $t: jest.fn((a) => a),
      $filters: {
        removeLinks: (c) => c,
        truncate: (a) => a,
      },
      // If you're mocking router, then don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
      $route: {
        params: {
          id: 'g1',
          slug: 'school-for-citizens',
        },
      },
      $router: {
        history: {
          push: jest.fn(),
        },
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue(),
      },
    }
    yogaPractice = {
      id: 'g2',
      name: 'Yoga Practice',
      slug: 'yoga-practice',
      about: 'We do yoga around the clock.',
      description: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p class="">And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p class="">The important thing is:</p><ul><li><p>Use the exercises (consciously) for your personal development.</p></li></ul>`,
      descriptionExcerpt: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p>And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p>The important thing is:</p><ul><li><p>Use the exercises …</p></li></ul>`,
      groupType: 'public',
      actionRadius: 'interplanetary',
      // Wolle: categoryIds: ['cat4', 'cat5', 'cat17'],
      categories: [
        {
          id: 'cat4',
          icon: 'psyche',
          name: 'psyche',
          slug: 'psyche',
          description: 'Seele, Gefühle, Glück',
        },
        {
          id: 'cat5',
          icon: 'movement',
          name: 'body-and-excercise',
          slug: 'body-and-excercise',
          description: 'Sport, Yoga, Massage, Tanzen, Entspannung',
        },
        {
          id: 'cat17',
          icon: 'spirituality',
          name: 'spirituality',
          slug: 'spirituality',
          description: 'Religion, Werte, Ethik',
        },
      ],
      locationName: null,
      location: null,
      // myRole: 'usual',
    }
    schoolForCitizens = {
      id: 'g1',
      name: 'School For Citizens',
      slug: 'school-for-citizens',
      about: 'Our children shall receive education for life.',
      description: `<p class=""><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, the people, and satisfies it through a lot of experience.</p><p><br></p><p><em>Deutsch</em></p><h3>Unser Ziel</h3><p class="">Nur wer Spaß am Lernen hat und seine Neugier nicht verliert, kann gute Bildung für's Leben erlangen und sein ganzes Leben mit Freude weiter lernen.</p><h3>Neugier</h3><p class="">Dazu benötigen wir eine Schule, die die Neugier der Kinder, der Menschen, aufnimmt und durch viel Erfahrung befriedigt.</p>`,
      descriptionExcerpt: `<p><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, …</p>`,
      groupType: 'closed',
      actionRadius: 'national',
      // Wolle: categoryIds: ['cat8', 'cat14'],
      categories: [
        {
          id: 'cat8',
          icon: 'child',
          name: 'children',
          slug: 'children',
          description: 'Familie, Pädagogik, Schule, Prägung',
        },
        {
          id: 'cat14',
          icon: 'science',
          name: 'science',
          slug: 'science',
          description: 'Bildung, Hochschule, Publikationen, ...',
        },
      ],
      locationName: 'France',
      location: {
        name: 'Paris',
        nameDE: 'Paris',
        nameEN: 'Paris',
      },
      // myRole: 'usual',
    }
    investigativeJournalism = {
      id: 'g0',
      name: 'Investigative Journalism',
      slug: 'investigative-journalism',
      about: null,
      description: `<p class=""><em>English:</em></p><p class="">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class="">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class="">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class="">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>`,
      descriptionExcerpt:
        '<p><em>English:</em></p><p>This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br/></p><p><em>Deutsch:</em></p><p>Diese Gruppe ist verborgen.</p><h3>…</h3>',
      groupType: 'hidden',
      actionRadius: 'global',
      // Wolle: categoryIds: ['cat6', 'cat12', 'cat16'],
      categories: [
        {
          id: 'cat6',
          icon: 'balance-scale',
          name: 'law',
          slug: 'law',
          description: 'Menschenrechte, Gesetze, Verordnungen',
        },
        {
          id: 'cat12',
          icon: 'politics',
          name: 'politics',
          slug: 'politics',
          description: 'Demokratie, Mitbestimmung, Wahlen, Korruption, Parteien',
        },
        {
          id: 'cat16',
          icon: 'media',
          name: 'it-and-media',
          slug: 'it-and-media',
          description:
            'Nachrichten, Manipulation, Datenschutz, Überwachung, Datenkraken, AI, Software, Apps',
        },
      ],
      locationName: 'Hamburg, Germany',
      location: {
        name: 'Hamburg',
        nameDE: 'Hamburg',
        nameEN: 'Hamburg',
      },
      // myRole: 'usual',
    }
    peterLustig = {
      id: 'u1',
      name: 'Peter Lustig',
      slug: 'peter-lustig',
      role: 'user',
    }
    jennyRostock = {
      id: 'u3',
      name: 'Jenny Rostock',
      slug: 'jenny-rostock',
      role: 'user',
    }
    bobDerBaumeister = {
      id: 'u2',
      name: 'Bob der Baumeister',
      slug: 'bob-der-baumeister',
      role: 'user',
    }
    huey = {
      id: 'u4',
      name: 'Huey',
      slug: 'huey',
      role: 'user',
    }
  })

  describe('mount', () => {
    Wrapper = () => {
      return mount(GroupProfileSlug, {
        mocks,
        localVue,
      })
    }

    describe('given a puplic group – "yoga-practice"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': peterLustig,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...yogaPractice,
                  myRole: 'owner',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Yoga Practice')
          })

          it('has AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(true)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@yoga-practice')
          })

          describe('displays no(!) group location, because is "null"', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button disabled(!)', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBe('disabled')
          })

          it('has group role "owner"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.owner')
          })

          it('has group type "public"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.public')
          })

          it('has group action radius "interplanetary"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.interplanetary')
          })

          it('has group categories "psyche", "body-and-excercise", "spirituality"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.psyche')
            expect(wrapper.text()).toContain('contribution.category.name.body-and-excercise')
            expect(wrapper.text()).toContain('contribution.category.name.spirituality')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('We do yoga around the clock.')
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': jennyRostock,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...yogaPractice,
                  myRole: 'usual',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Yoga Practice')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@yoga-practice')
          })

          describe('displays no(!) group location, because is "null"', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has group role "usual"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.usual')
          })

          it('has group type "public"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.public')
          })

          it('has group action radius "interplanetary"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.interplanetary')
          })

          it('has group categories "psyche", "body-and-excercise", "spirituality"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.psyche')
            expect(wrapper.text()).toContain('contribution.category.name.body-and-excercise')
            expect(wrapper.text()).toContain('contribution.category.name.spirituality')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('We do yoga around the clock.')
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': bobDerBaumeister,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...yogaPractice,
                  myRole: 'pending',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Yoga Practice')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@yoga-practice')
          })

          describe('displays no(!) group location, because is "null"', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has group role "pending"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.pending')
          })

          it('has group type "public"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.public')
          })

          it('has group action radius "interplanetary"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.interplanetary')
          })

          it('has group categories "psyche", "body-and-excercise", "spirituality"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.psyche')
            expect(wrapper.text()).toContain('contribution.category.name.body-and-excercise')
            expect(wrapper.text()).toContain('contribution.category.name.spirituality')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('We do yoga around the clock.')
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': huey,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...yogaPractice,
                  myRole: null,
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Yoga Practice')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@yoga-practice')
          })

          describe('displays no(!) group location, because is "null"', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has no(!) group role', () => {
            expect(wrapper.text()).not.toContain('group.role')
            expect(wrapper.text()).not.toContain('group.roles')
          })

          it('has group type "public"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.public')
          })

          it('has group action radius "interplanetary"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.interplanetary')
          })

          it('has group categories "psyche", "body-and-excercise", "spirituality"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.psyche')
            expect(wrapper.text()).toContain('contribution.category.name.body-and-excercise')
            expect(wrapper.text()).toContain('contribution.category.name.spirituality')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('We do yoga around the clock.')
          })
        })
      })
    })

    describe('given a closed group – "school-for-citizens"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': peterLustig,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...schoolForCitizens,
                  myRole: 'owner',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('School For Citizens')
          })

          it('has AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(true)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@school-for-citizens')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Paris"', () => {
              expect(wrapper.text()).toContain('Paris')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button disabled(!)', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBe('disabled')
          })

          it('has group role "owner"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.owner')
          })

          it('has group type "closed"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.closed')
          })

          it('has group action radius "national"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.national')
          })

          it('has group categories "children", "science"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.children')
            expect(wrapper.text()).toContain('contribution.category.name.science')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('Our children shall receive education for life.')
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': jennyRostock,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...schoolForCitizens,
                  myRole: 'usual',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('School For Citizens')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@school-for-citizens')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Paris"', () => {
              expect(wrapper.text()).toContain('Paris')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has group role "usual"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.usual')
          })

          it('has group type "closed"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.closed')
          })

          it('has group action radius "national"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.national')
          })

          it('has group categories "children", "science"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.children')
            expect(wrapper.text()).toContain('contribution.category.name.science')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('Our children shall receive education for life.')
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': bobDerBaumeister,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...schoolForCitizens,
                  myRole: 'pending',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('School For Citizens')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@school-for-citizens')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Paris"', () => {
              expect(wrapper.text()).toContain('Paris')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has no(!) members count', () => {
            expect(wrapper.text()).not.toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has group role "pending"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.pending')
          })

          it('has group type "closed"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.closed')
          })

          it('has group action radius "national"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.national')
          })

          it('has group categories "children", "science"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.children')
            expect(wrapper.text()).toContain('contribution.category.name.science')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('Our children shall receive education for life.')
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': huey,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...schoolForCitizens,
                  myRole: null,
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('School For Citizens')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@school-for-citizens')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Paris"', () => {
              expect(wrapper.text()).toContain('Paris')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has no(!) members count', () => {
            expect(wrapper.text()).not.toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has no(!) group role', () => {
            expect(wrapper.text()).not.toContain('group.role')
            expect(wrapper.text()).not.toContain('group.roles')
          })

          it('has group type "closed"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.closed')
          })

          it('has group action radius "national"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.national')
          })

          it('has group categories "children", "science"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.children')
            expect(wrapper.text()).toContain('contribution.category.name.science')
          })

          it('has group goal', () => {
            expect(wrapper.text()).toContain('group.goal')
            expect(wrapper.text()).toContain('Our children shall receive education for life.')
          })
        })
      })
    })

    describe('given a hidden group – "investigative-journalism"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': peterLustig,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...investigativeJournalism,
                  myRole: 'owner',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Investigative Journalism')
          })

          it('has AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(true)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@investigative-journalism')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Hamburg"', () => {
              expect(wrapper.text()).toContain('Hamburg')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button disabled(!)', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBe('disabled')
          })

          it('has group role "owner"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.owner')
          })

          it('has group type "hidden"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.hidden')
          })

          it('has group action radius "global"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.global')
          })

          it('has group categories "law", "politics", "it-and-media"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.law')
            expect(wrapper.text()).toContain('contribution.category.name.politics')
            expect(wrapper.text()).toContain('contribution.category.name.it-and-media')
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': jennyRostock,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...investigativeJournalism,
                  myRole: 'usual',
                },
              ],
            })
          })

          it('has group name – to verificate the group', () => {
            expect(wrapper.text()).toContain('Investigative Journalism')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(true)
          })

          it('has group slug', () => {
            expect(wrapper.text()).toContain('@investigative-journalism')
          })

          describe('displays group location', () => {
            it('has group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(true)
            })

            it('has group location name "Hamburg"', () => {
              expect(wrapper.text()).toContain('Hamburg')
            })
          })

          it('has group foundation', () => {
            expect(wrapper.text()).toContain('group.foundation')
          })

          it('has members count', () => {
            expect(wrapper.text()).toContain('group.membersCount')
          })

          it('has join/leave button enabled', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(true)
            expect(wrapper.find('.join-leave-button').attributes('disabled')).toBeFalsy()
          })

          it('has group role "usual"', () => {
            expect(wrapper.text()).toContain('group.role')
            expect(wrapper.text()).toContain('group.roles.usual')
          })

          it('has group type "hidden"', () => {
            expect(wrapper.text()).toContain('group.type')
            expect(wrapper.text()).toContain('group.types.hidden')
          })

          it('has group action radius "global"', () => {
            expect(wrapper.text()).toContain('group.actionRadius')
            expect(wrapper.text()).toContain('group.actionRadii.global')
          })

          it('has group categories "law", "politics", "it-and-media"', () => {
            expect(wrapper.text()).toContain('group.categories')
            expect(wrapper.text()).toContain('contribution.category.name.law')
            expect(wrapper.text()).toContain('contribution.category.name.politics')
            expect(wrapper.text()).toContain('contribution.category.name.it-and-media')
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': bobDerBaumeister,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...investigativeJournalism,
                  myRole: 'pending',
                },
              ],
            })
          })

          it('has no(!) group name – to verificate the group', () => {
            expect(wrapper.text()).not.toContain('Investigative Journalism')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has not(!) ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(false)
          })

          it('has not(!) group slug', () => {
            expect(wrapper.text()).not.toContain('@investigative-journalism')
          })

          describe('displays not(!) group location', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })

            it('has no(!) group location name "Hamburg"', () => {
              expect(wrapper.text()).not.toContain('Hamburg')
            })
          })

          it('has no(!) group foundation', () => {
            expect(wrapper.text()).not.toContain('group.foundation')
          })

          it('has no(!) members count', () => {
            expect(wrapper.text()).not.toContain('group.membersCount')
          })

          it('has no(!) join/leave button', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(false)
          })

          it('has no(!) group role', () => {
            expect(wrapper.text()).not.toContain('group.role')
            expect(wrapper.text()).not.toContain('group.roles')
          })

          it('has no(!) group type', () => {
            expect(wrapper.text()).not.toContain('group.type')
            expect(wrapper.text()).not.toContain('group.types')
          })

          it('has no(!) group action radius', () => {
            expect(wrapper.text()).not.toContain('group.actionRadius')
            expect(wrapper.text()).not.toContain('group.actionRadii')
          })

          it('has no(!) group categories "law", "politics", "it-and-media"', () => {
            expect(wrapper.text()).not.toContain('group.categories')
            expect(wrapper.text()).not.toContain('contribution.category.name.law')
            expect(wrapper.text()).not.toContain('contribution.category.name.politics')
            expect(wrapper.text()).not.toContain('contribution.category.name.it-and-media')
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': huey,
              },
            }
            wrapper = Wrapper()
            wrapper.setData({
              Group: [
                {
                  ...investigativeJournalism,
                  myRole: null,
                },
              ],
            })
          })

          it('has no(!) group name – to verificate the group', () => {
            expect(wrapper.text()).not.toContain('Investigative Journalism')
          })

          it('has not(!) AvatarUploader', () => {
            expect(wrapper.find('.avatar-uploader').exists()).toBe(false)
          })

          it('has not(!) ProfileAvatar', () => {
            expect(wrapper.find('.profile-avatar').exists()).toBe(false)
          })

          it('has not(!) group slug', () => {
            expect(wrapper.text()).not.toContain('@investigative-journalism')
          })

          describe('displays not(!) group location', () => {
            it('has no(!) group location icon "map-marker"', () => {
              expect(wrapper.find('[data-test="map-marker"]').exists()).toBe(false)
            })

            it('has no(!) group location name "Hamburg"', () => {
              expect(wrapper.text()).not.toContain('Hamburg')
            })
          })

          it('has no(!) group foundation', () => {
            expect(wrapper.text()).not.toContain('group.foundation')
          })

          it('has no(!) members count', () => {
            expect(wrapper.text()).not.toContain('group.membersCount')
          })

          it('has no(!) join/leave button', () => {
            expect(wrapper.find('.join-leave-button').exists()).toBe(false)
          })

          it('has no(!) group role', () => {
            expect(wrapper.text()).not.toContain('group.role')
            expect(wrapper.text()).not.toContain('group.roles')
          })

          it('has no(!) group type', () => {
            expect(wrapper.text()).not.toContain('group.type')
            expect(wrapper.text()).not.toContain('group.types')
          })

          it('has no(!) group action radius', () => {
            expect(wrapper.text()).not.toContain('group.actionRadius')
            expect(wrapper.text()).not.toContain('group.actionRadii')
          })

          it('has no(!) group categories "law", "politics", "it-and-media"', () => {
            expect(wrapper.text()).not.toContain('group.categories')
            expect(wrapper.text()).not.toContain('contribution.category.name.law')
            expect(wrapper.text()).not.toContain('contribution.category.name.politics')
            expect(wrapper.text()).not.toContain('contribution.category.name.it-and-media')
          })
        })
      })
    })
  })
})

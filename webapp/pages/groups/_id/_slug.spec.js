import { mount } from '@vue/test-utils'
import GroupProfileSlug from './_slug.vue'

const localVue = global.localVue

localVue.filter('date', (d) => d)

const stubs = {
  'client-only': true,
  'v-popover': true,
  'nuxt-link': true,
  'router-link': true,
  'infinite-loading': true,
  'follow-list': true,
}

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
      about: null,
      description: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p class="">And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p class="">The important thing is:</p><ul><li><p>Use the exercises (consciously) for your personal development.</p></li></ul>`,
      descriptionExcerpt: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p>And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p>The important thing is:</p><ul><li><p>Use the exercises …</p></li></ul>`,
      groupType: 'public',
      actionRadius: 'interplanetary',
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
      isMutedByMe: false,
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
      isMutedByMe: true,
      // myRole: 'usual',
    }
    investigativeJournalism = {
      id: 'g0',
      name: 'Investigative Journalism',
      slug: 'investigative-journalism',
      about: 'Investigative journalists share ideas and insights and can collaborate.',
      description: `<p class=""><em>English:</em></p><p class="">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class="">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class="">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class="">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>`,
      descriptionExcerpt:
        '<p><em>English:</em></p><p>This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br/></p><p><em>Deutsch:</em></p><p>Diese Gruppe ist verborgen.</p><h3>…</h3>',
      groupType: 'hidden',
      actionRadius: 'global',
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
      isMutedByMe: false,
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
    Wrapper = (data = () => {}) => {
      return mount(GroupProfileSlug, {
        mocks,
        localVue,
        data,
        stubs,
      })
    }

    describe('given a puplic group – "yoga-practice"', () => {
      describe('given a current user', () => {
        describe('as group owner – "peter-lustig"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': peterLustig,
                'auth/isModerator': () => false,
              },
            }
            wrapper = Wrapper(() => {
              return {
                Group: [
                  {
                    ...yogaPractice,
                    myRole: 'owner',
                  },
                ],
                GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.element).toMatchSnapshot()
          })

          describe('after "show more" click displays full description', () => {
            let groupDescriptionBaseCard
            beforeEach(async () => {
              // TODO Use vue testing library
              groupDescriptionBaseCard = wrapper.find('.collaps-button')
              await groupDescriptionBaseCard.find('.collaps-button').trigger('click')
              await wrapper.vm.$nextTick()
            })

            it('has full description', () => {
              // test if end of full description is visible
              expect(groupDescriptionBaseCard.text()).toContain(
                `Use the exercises (consciously) for your personal development.`,
              )
            })

            it('has "show less" button', () => {
              expect(wrapper.vm.isDescriptionCollapsed).toBe(false)
              expect(groupDescriptionBaseCard.text()).toContain('comment.show.less')
            })
          })
        })

        describe('as usual member – "jenny-rostock"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': jennyRostock,
                'auth/isModerator': () => false,
              },
            }
            wrapper = Wrapper(() => {
              return {
                Group: [
                  {
                    ...yogaPractice,
                    myRole: 'usual',
                  },
                ],
                GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.element).toMatchSnapshot()
          })
        })

        describe('as pending member – "bob-der-baumeister"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': bobDerBaumeister,
                'auth/isModerator': () => false,
              },
            }
            wrapper = Wrapper(() => {
              return {
                Group: [
                  {
                    ...yogaPractice,
                    myRole: 'pending',
                  },
                ],
                GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.element).toMatchSnapshot()
          })
        })

        describe('as none(!) member – "huey"', () => {
          beforeEach(() => {
            mocks.$store = {
              getters: {
                'auth/user': huey,
                'auth/isModerator': () => false,
              },
            }
            wrapper = Wrapper(() => {
              return {
                Group: [
                  {
                    ...yogaPractice,
                    myRole: null,
                  },
                ],
                GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
              }
            })
          })

          it('renders', () => {
            expect(wrapper.element).toMatchSnapshot()
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
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...schoolForCitizens,
                      myRole: 'owner',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as usual member – "jenny-rostock"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': jennyRostock,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...schoolForCitizens,
                      myRole: 'usual',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as pending member – "bob-der-baumeister"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': bobDerBaumeister,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...schoolForCitizens,
                      myRole: 'pending',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as none(!) member – "huey"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': huey,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...schoolForCitizens,
                      myRole: null,
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
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
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...investigativeJournalism,
                      myRole: 'owner',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as usual member – "jenny-rostock"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': jennyRostock,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...investigativeJournalism,
                      myRole: 'usual',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as pending member – "bob-der-baumeister"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': bobDerBaumeister,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...investigativeJournalism,
                      myRole: 'pending',
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })

          describe('as none(!) member – "huey"', () => {
            beforeEach(() => {
              mocks.$store = {
                getters: {
                  'auth/user': huey,
                  'auth/isModerator': () => false,
                },
              }
              wrapper = Wrapper(() => {
                return {
                  Group: [
                    {
                      ...investigativeJournalism,
                      myRole: null,
                    },
                  ],
                  GroupMembers: [peterLustig, jennyRostock, bobDerBaumeister, huey],
                }
              })
            })

            it('renders', () => {
              expect(wrapper.element).toMatchSnapshot()
            })
          })
        })
      })
    })
  })
})

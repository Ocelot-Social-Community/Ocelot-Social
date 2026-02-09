/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTestClient } from 'apollo-server-testing'

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver, getNeode } from '@db/neo4j'
import { fileReport } from '@graphql/queries/fileReport'
import { reports } from '@graphql/queries/reports'
import { review } from '@graphql/queries/review'
import createServer from '@src/server'

const instance = getNeode()
const driver = getDriver()

describe('file a report on a resource', () => {
  let authenticatedUser, currentUser, mutate, query, moderator, abusiveUser, otherReportingUser
  const categoryIds = ['cat9']
  const variables = {
    resourceId: 'invalid',
    reasonCategory: 'other',
    reasonDescription: 'Violates code of conduct !!!',
  }

  beforeAll(async () => {
    await cleanDatabase()

    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
          user: authenticatedUser,
        }
      },
    })
    mutate = createTestClient(server).mutate
    query = createTestClient(server).query
  })

  afterAll(async () => {
    await cleanDatabase()
    await driver.close()
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('report a resource', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: fileReport, variables })).resolves.toMatchObject({
          data: { fileReport: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        currentUser = await Factory.build(
          'user',
          {
            id: 'current-user-id',
            role: 'user',
          },
          {
            email: 'test@example.org',
            password: '1234',
          },
        )
        moderator = await Factory.build(
          'user',
          {
            id: 'moderator-id',
            role: 'moderator',
          },
          {
            email: 'moderator@example.org',
            password: '1234',
          },
        )
        otherReportingUser = await Factory.build(
          'user',
          {
            id: 'other-reporting-user-id',
            role: 'user',
          },
          {
            email: 'reporting@example.org',
            password: '1234',
          },
        )
        await Factory.build(
          'user',
          {
            id: 'abusive-user-id',
            role: 'user',
            name: 'abusive-user',
          },
          {
            email: 'abusive-user@example.org',
          },
        )
        await instance.create('Category', {
          id: 'cat9',
          name: 'Democracy & Politics',
          icon: 'university',
        })

        authenticatedUser = await currentUser.toJson()
      })

      describe('invalid resource id', () => {
        it('returns null', async () => {
          await expect(mutate({ mutation: fileReport, variables })).resolves.toMatchObject({
            data: { fileReport: null },
            errors: undefined,
          })
        })
      })

      describe('valid resource', () => {
        describe('creates report', () => {
          it('which belongs to resource', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: { ...variables, resourceId: 'abusive-user-id' },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  reportId: expect.any(String),
                  resource: {
                    name: 'abusive-user',
                  },
                },
              },
              errors: undefined,
            })
          })

          it('only one report for multiple reports on the same resource', async () => {
            const firstReport = await mutate({
              mutation: fileReport,
              variables: { ...variables, resourceId: 'abusive-user-id' },
            })
            authenticatedUser = await otherReportingUser.toJson()
            const secondReport = await mutate({
              mutation: fileReport,
              variables: { ...variables, resourceId: 'abusive-user-id' },
            })

            expect(firstReport.data.fileReport.reportId).toEqual(
              secondReport.data.fileReport.reportId,
            )
          })

          describe('report properties are set correctly', () => {
            const reportsCypherQuery =
              'MATCH (resource:User {id: $resourceId})<-[:BELONGS_TO]-(report:Report {closed: false})<-[filed:FILED]-(user:User {id: $currentUserId}) RETURN report'

            it('with the rule for how the report will be decided', async () => {
              await mutate({
                mutation: fileReport,
                variables: { ...variables, resourceId: 'abusive-user-id' },
              })

              const reportsCypherQueryResponse = await instance.cypher(reportsCypherQuery, {
                resourceId: 'abusive-user-id',
                currentUserId: authenticatedUser.id,
              })
              expect(reportsCypherQueryResponse.records).toHaveLength(1)
              const [reportProperties] = reportsCypherQueryResponse.records.map(
                (record) => record.get('report').properties,
              )
              expect(reportProperties).toMatchObject({ rule: 'latestReviewUpdatedAtRules' })
            })

            describe('with overtaken disabled from resource in disable property', () => {
              it('disable is false', async () => {
                await mutate({
                  mutation: fileReport,
                  variables: { ...variables, resourceId: 'abusive-user-id' },
                })

                const reportsCypherQueryResponse = await instance.cypher(reportsCypherQuery, {
                  resourceId: 'abusive-user-id',
                  currentUserId: authenticatedUser.id,
                })
                expect(reportsCypherQueryResponse.records).toHaveLength(1)
                const [reportProperties] = reportsCypherQueryResponse.records.map(
                  (record) => record.get('report').properties,
                )
                expect(reportProperties).toMatchObject({ disable: false })
              })

              it('disable is true', async () => {
                // first time filling a report to enable a moderator the disable the resource
                await mutate({
                  mutation: fileReport,
                  variables: { ...variables, resourceId: 'abusive-user-id' },
                })
                authenticatedUser = await moderator.toJson()
                await mutate({
                  mutation: review,
                  variables: {
                    resourceId: 'abusive-user-id',
                    disable: true,
                    closed: true,
                  },
                })
                authenticatedUser = await currentUser.toJson()
                // second time filling a report to see if the "disable is true" of the resource is overtaken
                await mutate({
                  mutation: fileReport,
                  variables: { ...variables, resourceId: 'abusive-user-id' },
                })

                const reportsCypherQueryResponse = await instance.cypher(reportsCypherQuery, {
                  resourceId: 'abusive-user-id',
                  currentUserId: authenticatedUser.id,
                })
                expect(reportsCypherQueryResponse.records).toHaveLength(1)
                const [reportProperties] = reportsCypherQueryResponse.records.map(
                  (record) => record.get('report').properties,
                )
                expect(reportProperties).toMatchObject({ disable: true })
              })
            })
          })

          it.todo('creates multiple filed reports')
        })

        describe('reported resource is a user', () => {
          it('returns __typename "User"', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: { ...variables, resourceId: 'abusive-user-id' },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'User',
                  },
                },
              },
              errors: undefined,
            })
          })

          it('returns user attribute info', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: { ...variables, resourceId: 'abusive-user-id' },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'User',
                    name: 'abusive-user',
                  },
                },
              },
              errors: undefined,
            })
          })

          it('returns a createdAt', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: { ...variables, resourceId: 'abusive-user-id' },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  createdAt: expect.any(String),
                },
              },
              errors: undefined,
            })
          })

          it('returns the reason category', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'abusive-user-id',
                  reasonCategory: 'criminal_behavior_violation_german_law',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  reasonCategory: 'criminal_behavior_violation_german_law',
                },
              },
              errors: undefined,
            })
          })

          it('gives an error if the reason category is not in enum "ReasonCategory"', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'abusive-user-id',
                  reasonCategory: 'category_missing_from_enum_reason_category',
                },
              }),
            ).resolves.toMatchObject({
              data: undefined,
              errors: [
                {
                  message:
                    'Variable "$reasonCategory" got invalid value "category_missing_from_enum_reason_category"; Expected type ReasonCategory.',
                },
              ],
            })
          })

          it('returns the reason description', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'abusive-user-id',
                  reasonDescription: 'My reason!',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  reasonDescription: 'My reason!',
                },
              },
              errors: undefined,
            })
          })

          it('sanitizes the reason description', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'abusive-user-id',
                  reasonDescription: 'My reason <sanitize></sanitize>!',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  reasonDescription: 'My reason !',
                },
              },
              errors: undefined,
            })
          })
        })

        describe('reported resource is a post', () => {
          beforeEach(async () => {
            await Factory.build(
              'post',
              {
                id: 'post-to-report-id',
                title: 'This is a post that is going to be reported',
              },
              {
                author: currentUser,
                categoryIds,
              },
            )
          })

          it('returns type "Post"', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'post-to-report-id',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'Post',
                  },
                },
              },
              errors: undefined,
            })
          })

          it('returns resource in post attribute', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'post-to-report-id',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'Post',
                    title: 'This is a post that is going to be reported',
                  },
                },
              },
              errors: undefined,
            })
          })
        })

        describe('reported resource is a comment', () => {
          beforeEach(async () => {
            await Factory.build(
              'post',
              {
                id: 'p1',
                title: 'post to comment on',
                content: 'please comment on me',
              },
              {
                categoryIds,
                author: currentUser,
              },
            )
            await Factory.build(
              'comment',
              {
                id: 'comment-to-report-id',
                content: 'Post comment to be reported.',
              },
              {
                author: currentUser,
                postId: 'p1',
              },
            )
          })

          it('returns type "Comment"', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'comment-to-report-id',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'Comment',
                  },
                },
              },
              errors: undefined,
            })
          })

          it('returns resource in comment attribute', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'comment-to-report-id',
                },
              }),
            ).resolves.toMatchObject({
              data: {
                fileReport: {
                  resource: {
                    __typename: 'Comment',
                    content: 'Post comment to be reported.',
                  },
                },
              },
              errors: undefined,
            })
          })
        })

        describe('reported resource is a tag', () => {
          beforeEach(async () => {
            await Factory.build('tag', {
              id: 'tag-to-report-id',
            })
          })

          it('returns null', async () => {
            await expect(
              mutate({
                mutation: fileReport,
                variables: {
                  ...variables,
                  resourceId: 'tag-to-report-id',
                },
              }),
            ).resolves.toMatchObject({
              data: { fileReport: null },
              errors: undefined,
            })
          })
        })
      })
    })
  })

  describe('query for reported resource', () => {
    beforeEach(async () => {
      authenticatedUser = null
      moderator = await Factory.build(
        'user',
        {
          id: 'moderator-1',
          role: 'moderator',
        },
        {
          email: 'moderator@example.org',
          password: '1234',
        },
      )
      currentUser = await Factory.build(
        'user',
        {
          id: 'current-user-id',
          role: 'user',
        },
        {
          email: 'current.user@example.org',
          password: '1234',
        },
      )
      abusiveUser = await Factory.build(
        'user',
        {
          id: 'abusive-user-1',
          role: 'user',
          name: 'abusive-user',
        },
        {
          email: 'abusive-user@example.org',
        },
      )
      await instance.create('Category', {
        id: 'cat9',
        name: 'Democracy & Politics',
        icon: 'university',
      })

      await Promise.all([
        Factory.build(
          'post',
          {
            id: 'abusive-post-1',
            content: 'Interesting Knowledge',
          },
          {
            categoryIds,
            author: abusiveUser,
          },
        ),
        Factory.build(
          'post',
          {
            id: 'post-2',
            content: 'More things to do …',
          },
          {
            author: moderator,
            categoryIds,
          },
        ),
        Factory.build(
          'post',
          {
            id: 'post-3',
            content: 'I am at school …',
          },
          {
            categoryIds,
            author: currentUser,
          },
        ),
      ])
      await Promise.all([
        Factory.build(
          'comment',
          {
            id: 'abusive-comment-1',
          },
          {
            postId: 'post-2',
            author: currentUser,
          },
        ),
      ])
      authenticatedUser = await currentUser.toJson()
      await Promise.all([
        mutate({
          mutation: fileReport,
          variables: {
            resourceId: 'abusive-post-1',
            reasonCategory: 'other',
            reasonDescription: 'This comment is bigoted',
          },
        }),
        mutate({
          mutation: fileReport,
          variables: {
            resourceId: 'abusive-comment-1',
            reasonCategory: 'discrimination_etc',
            reasonDescription: 'This post is bigoted',
          },
        }),
        mutate({
          mutation: fileReport,
          variables: {
            resourceId: 'abusive-user-1',
            reasonCategory: 'doxing',
            reasonDescription: 'This user is harassing me with bigoted remarks',
          },
        }),
      ])
      authenticatedUser = null
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(query({ query: reports })).resolves.toMatchObject({
          data: { reports: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      it('role "user" gets no reports', async () => {
        authenticatedUser = await currentUser.toJson()
        await expect(query({ query: reports })).resolves.toMatchObject({
          data: { reports: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })

      it('role "moderator" gets reports', async () => {
        const expected = {
          reports: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              closed: false,
              resource: {
                __typename: 'User',
                id: 'abusive-user-1',
              },
              filed: expect.arrayContaining([
                expect.objectContaining({
                  submitter: expect.objectContaining({
                    id: 'current-user-id',
                  }),
                  createdAt: expect.any(String),
                  reasonCategory: 'doxing',
                  reasonDescription: 'This user is harassing me with bigoted remarks',
                }),
              ]),
            }),
            expect.objectContaining({
              id: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              closed: false,
              resource: {
                __typename: 'Post',
                id: 'abusive-post-1',
              },
              filed: expect.arrayContaining([
                expect.objectContaining({
                  submitter: expect.objectContaining({
                    id: 'current-user-id',
                  }),
                  createdAt: expect.any(String),
                  reasonCategory: 'other',
                  reasonDescription: 'This comment is bigoted',
                }),
              ]),
            }),
            expect.objectContaining({
              id: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              closed: false,
              resource: {
                __typename: 'Comment',
                id: 'abusive-comment-1',
              },
              filed: expect.arrayContaining([
                expect.objectContaining({
                  submitter: expect.objectContaining({
                    id: 'current-user-id',
                  }),
                  createdAt: expect.any(String),
                  reasonCategory: 'discrimination_etc',
                  reasonDescription: 'This post is bigoted',
                }),
              ]),
            }),
          ]),
        }
        authenticatedUser = await moderator.toJson()
        const { data } = await query({ query: reports })
        expect(data).toEqual(expected)
      })

      describe('orderBy', () => {
        it('createdAt_asc returns reports in ascending order', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_asc' },
          })
          const sorted = [...data.reports].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
          expect(data.reports).toEqual(sorted)
        })

        it('createdAt_desc returns reports in descending order', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_desc' },
          })
          const sorted = [...data.reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          expect(data.reports).toEqual(sorted)
        })
      })

      describe('reviewed filter', () => {
        it('reviewed: false returns only unreviewed reports', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { reviewed: false },
          })
          expect(data.reports).toHaveLength(3)
        })

        it('reviewed: true returns only reviewed reports', async () => {
          authenticatedUser = await moderator.toJson()
          // review one report
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-post-1', disable: false, closed: false },
          })
          const { data } = await query({
            query: reports,
            variables: { reviewed: true },
          })
          expect(data.reports).toHaveLength(1)
          expect(data.reports[0].resource.id).toBe('abusive-post-1')
        })
      })

      describe('closed filter', () => {
        it('closed: false returns only open reports', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { closed: false },
          })
          expect(data.reports).toHaveLength(3)
          data.reports.forEach((report) => {
            expect(report.closed).toBe(false)
          })
        })

        it('closed: true returns only closed reports', async () => {
          authenticatedUser = await moderator.toJson()
          // close one report via review
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-post-1', disable: false, closed: true },
          })
          const { data } = await query({
            query: reports,
            variables: { closed: true },
          })
          expect(data.reports).toHaveLength(1)
          expect(data.reports[0].resource.id).toBe('abusive-post-1')
          expect(data.reports[0].closed).toBe(true)
        })
      })

      describe('combined reviewed and closed filter', () => {
        it('returns only reports matching both filters', async () => {
          authenticatedUser = await moderator.toJson()
          // review and close one report
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-post-1', disable: false, closed: true },
          })
          // review but keep open another report
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-user-1', disable: false, closed: false },
          })
          const { data } = await query({
            query: reports,
            variables: { reviewed: true, closed: true },
          })
          expect(data.reports).toHaveLength(1)
          expect(data.reports[0].resource.id).toBe('abusive-post-1')
          expect(data.reports[0].closed).toBe(true)
        })

        it('reviewed: true, closed: false returns reviewed but open reports', async () => {
          authenticatedUser = await moderator.toJson()
          // review and close one report
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-post-1', disable: false, closed: true },
          })
          // review but keep open another report
          await mutate({
            mutation: review,
            variables: { resourceId: 'abusive-user-1', disable: false, closed: false },
          })
          const { data } = await query({
            query: reports,
            variables: { reviewed: true, closed: false },
          })
          expect(data.reports).toHaveLength(1)
          expect(data.reports[0].resource.id).toBe('abusive-user-1')
          expect(data.reports[0].closed).toBe(false)
        })
      })

      describe('pagination', () => {
        it('first: 2 returns only 2 reports', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { first: 2 },
          })
          expect(data.reports).toHaveLength(2)
        })

        it('first: 1 returns only 1 report', async () => {
          authenticatedUser = await moderator.toJson()
          const { data } = await query({
            query: reports,
            variables: { first: 1 },
          })
          expect(data.reports).toHaveLength(1)
        })

        it('offset: 1 skips the first report', async () => {
          authenticatedUser = await moderator.toJson()
          const { data: allData } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_asc' },
          })
          const { data: offsetData } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_asc', offset: 1 },
          })
          expect(offsetData.reports).toHaveLength(allData.reports.length - 1)
          expect(offsetData.reports[0].id).toBe(allData.reports[1].id)
        })

        it('first and offset combined for paging', async () => {
          authenticatedUser = await moderator.toJson()
          const { data: allData } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_asc' },
          })
          const { data: pageData } = await query({
            query: reports,
            variables: { orderBy: 'createdAt_asc', first: 1, offset: 1 },
          })
          expect(pageData.reports).toHaveLength(1)
          expect(pageData.reports[0].id).toBe(allData.reports[1].id)
        })
      })
    })
  })
})

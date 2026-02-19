/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export default {
  Query: {
    Donations: async (_parent, _params, context, _resolveInfo) => {
      const { driver } = context
      const session = driver.session()
      try {
        const txResult = await session.readTransaction(async (txc) => {
          const donationsTransactionResponse = await txc.run(
            `
              MATCH (donations:Donations)
              WITH donations LIMIT 1
              RETURN donations
            `,
            {},
          )
          return donationsTransactionResponse.records.map(
            (record) => record.get('donations').properties,
          )
        })
        return txResult[0] || null
      } finally {
        await session.close()
      }
    },
  },
  Mutation: {
    UpdateDonations: async (_parent, params, context, _resolveInfo) => {
      const { driver } = context
      const session = driver.session()
      try {
        const txResult = await session.writeTransaction(async (txc) => {
          const updateDonationsTransactionResponse = await txc.run(
            `
              MATCH (donations:Donations)
              WITH donations LIMIT 1
              SET donations += $params
              SET donations.updatedAt = toString(datetime())
              RETURN donations
            `,
            { params },
          )
          return updateDonationsTransactionResponse.records.map(
            (record) => record.get('donations').properties,
          )
        })
        return txResult[0] || null
      } finally {
        await session.close()
      }
    },
  },
}

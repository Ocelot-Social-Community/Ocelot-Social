export default {
  Query: {
    Donations: async (_parent, _params, context, _resolveInfo) => {
      const { driver } = context
      let donations
      const session = driver.session()
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
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
      try {
        const txResult = await writeTxResultPromise
        if (!txResult[0]) return null
        donations = txResult[0]
      } finally {
        session.close()
      }
      return donations
    },
  },
  Mutation: {
    UpdateDonations: async (_parent, params, context, _resolveInfo) => {
      const { driver } = context
      let donations
      const session = driver.session()
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
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
      try {
        const txResult = await writeTxResultPromise
        if (!txResult[0]) return null
        donations = txResult[0]
      } finally {
        session.close()
      }
      return donations
    },
  },
}

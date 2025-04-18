/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export async function validateInviteCode(session, inviteCode) {
  const readTxResultPromise = session.readTransaction(async (txc) => {
    const result = await txc.run(
      `MATCH (ic:InviteCode { code: toUpper($inviteCode) })
       RETURN
       CASE
       WHEN ic.expiresAt IS NULL THEN true
       WHEN datetime(ic.expiresAt) >=  datetime() THEN true
       ELSE false END AS result`,
      {
        inviteCode,
      },
    )
    return result.records.map((record) => record.get('result'))
  })
  try {
    const txResult = await readTxResultPromise
    return !!txResult[0]
  } finally {
    session.close()
  }
}

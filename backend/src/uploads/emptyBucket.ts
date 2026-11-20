import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

import type { S3Config } from '@config/index'

/**
 * Deletes every object in the configured bucket and returns how many went. The bucket itself
 * stays, with its policy: what the instance uploads next lands there as before.
 *
 * For `db:reset --with-uploads`, after the database is wiped: `db:reset` alone leaves the files
 * behind, and every seeding adds its own, until the drive is full (XMinioStorageFull). Through the
 * S3 API rather than by removing the MinIO volume, so it works the same against a real S3.
 */
export const emptyBucket = async (config: S3Config): Promise<number> => {
  const { AWS_BUCKET: Bucket } = config
  // A client of its own, not the uploads' cached one: this runs once, in a script.
  const s3 = new S3Client({
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
    endpoint: config.AWS_ENDPOINT,
    region: config.AWS_REGION,
    forcePathStyle: true,
  })
  let deleted = 0
  let ContinuationToken: string | undefined
  do {
    // At most 1000 keys per page, and DeleteObjects takes at most 1000: one request per page.
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken }))
    const keys = (page.Contents ?? []).flatMap(({ Key }) => (Key ? [{ Key }] : []))
    if (keys.length > 0) {
      const result = await s3.send(
        new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys, Quiet: true } }),
      )
      // Quiet: only what could not be deleted is reported, and that must not pass for done.
      if (result.Errors && result.Errors.length > 0) {
        const [{ Key = '?', Message = 'no reason given' }] = result.Errors
        throw new Error(
          `Could not delete ${String(result.Errors.length)} file(s) from bucket ${Bucket}, e.g. ${Key}: ${Message}`,
        )
      }
      deleted += keys.length
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (ContinuationToken)
  return deleted
}

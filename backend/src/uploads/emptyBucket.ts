import { DeleteObjectsCommand, ListObjectVersionsCommand, S3Client } from '@aws-sdk/client-s3'

import type { S3Config } from '@config/index'

/**
 * Deletes every object in the configured bucket for good and returns how many versions went —
 * without versioning, how many files. The bucket
 * itself stays, with its policy: what the instance uploads next lands there as before.
 *
 * For `db:reset --with-uploads`, after the database is wiped: `db:reset` alone leaves the files
 * behind, and every seeding adds its own, until the drive is full (XMinioStorageFull). Through the
 * S3 API rather than by removing the MinIO volume, so it works the same against a real S3.
 *
 * Every version and delete marker is deleted by its version id: in a bucket with versioning on,
 * deleting by key alone only adds a delete marker and keeps the data, and with it the space. A
 * bucket without versioning lists each object once, with the version id "null".
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
  let KeyMarker: string | undefined
  let VersionIdMarker: string | undefined
  do {
    // At most 1000 versions and markers together per page, and DeleteObjects takes at most 1000:
    // one request per page.
    const page = await s3.send(
      new ListObjectVersionsCommand({ Bucket, KeyMarker, VersionIdMarker }),
    )
    const objects = [...(page.Versions ?? []), ...(page.DeleteMarkers ?? [])].flatMap(
      ({ Key, VersionId }) => (Key ? [{ Key, VersionId }] : []),
    )
    if (objects.length > 0) {
      const result = await s3.send(
        new DeleteObjectsCommand({ Bucket, Delete: { Objects: objects, Quiet: true } }),
      )
      // Quiet: only what could not be deleted is reported, and that must not pass for done.
      if (result.Errors && result.Errors.length > 0) {
        const [{ Key = '?', Message = 'no reason given' }] = result.Errors
        throw new Error(
          `Could not delete ${String(result.Errors.length)} file(s) from bucket ${Bucket}, e.g. ${Key}: ${Message}`,
        )
      }
      // Counted is what held data — every version, not the markers. Without versioning, that is
      // every file.
      deleted += (page.Versions ?? []).filter(({ Key }) => Key).length
    }
    KeyMarker = page.IsTruncated ? page.NextKeyMarker : undefined
    VersionIdMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined
  } while (KeyMarker)
  return deleted
}

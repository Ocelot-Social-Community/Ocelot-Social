/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { existsSync, createReadStream } from 'node:fs'
import path from 'node:path'

import { S3Client, ObjectCannedACL } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { lookup } from 'mime-types'

import CONFIG from '@config/index'
import { getDriver } from '@db/neo4j'

export const description =
  'Upload all image files to a S3 compatible object storage in order to reduce load on our backend.'

export async function up() {
  if (CONFIG.NODE_ENV === 'test') {
    // Let's skip this migration for simplicity.
    // There is nothing to migrate in test environment and setting up the S3 services seems overkill.
  }
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT, AWS_BUCKET } = CONFIG
  if (!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_ENDPOINT && AWS_BUCKET)) {
    throw new Error('No S3 configuration given, cannot upload image files')
  }

  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  const s3 = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  })
  try {
    const { records } = await transaction.run('MATCH (image:Image) RETURN image.url as url')
    let urls: string[] = records.map((r) => r.get('url') as string)
    urls = urls.filter((url) => url.startsWith('/uploads'))
    const locations = await Promise.all(
      urls
        .map((url) => {
          return async () => {
            const { pathname } = new URL(url, 'http://example.org')
            const fileLocation = path.join(__dirname, `../../../public/${pathname}`)
            const s3Location = `original${pathname}`
            // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename
            if (existsSync(fileLocation)) {
              const mimeType = lookup(fileLocation)
              const params = {
                Bucket: AWS_BUCKET,
                Key: s3Location,
                ACL: ObjectCannedACL.public_read,
                ContentType: mimeType || 'image/jpeg',
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                Body: createReadStream(fileLocation),
              }

              const command = new Upload({ client: s3, params })
              const data = await command.done()
              const { Location: spacesUrl } = data

              const updatedRecord = await transaction.run(
                'MATCH (image:Image {url: $url}) SET image.url = $spacesUrl RETURN image.url as url',
                { url, spacesUrl },
              )
              const [updatedUrl] = updatedRecord.records.map(
                (record) => record.get('url') as string,
              )
              return updatedUrl
            }
          }
        })
        .map((p) => p()),
    )
    // eslint-disable-next-line no-console
    console.log('these are the locations', locations)
    await transaction.commit()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    await session.close()
  }
}

export async function down() {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(``)
    await transaction.commit()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    await session.close()
  }
}

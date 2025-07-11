import { S3Client, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

import type { S3Config } from '@config/index'

import { FileUploadCallback, FileDeleteCallback } from './types'

export const s3Service = (config: S3Config, prefix: string) => {
  const { AWS_BUCKET: Bucket } = config

  const { AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_PUBLIC_GATEWAY } = config
  const s3 = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  })

  const uploadFile: FileUploadCallback = async ({ createReadStream, uniqueFilename, mimetype }) => {
    const s3Location = prefix.length > 0 ? `${prefix}/${uniqueFilename}` : uniqueFilename

    const params = {
      Bucket,
      Key: s3Location,
      ACL: ObjectCannedACL.public_read,
      ContentType: mimetype,
      Body: createReadStream(),
    }
    const command = new Upload({ client: s3, params })
    const data = await command.done()
    let { Location: location } = data
    if (!location) {
      throw new Error('File upload did not return `Location`')
    }

    if (!location.startsWith('https://') && !location.startsWith('http://')) {
      // Ensure the location has a protocol. Hetzner sometimes does not return a protocol in the location.
      location = `https://${location}`
    }

    if (!S3_PUBLIC_GATEWAY) {
      return location
    }

    const publicLocation = new URL(S3_PUBLIC_GATEWAY)
    publicLocation.pathname = new URL(location).pathname
    return publicLocation.href
  }

  const deleteFile: FileDeleteCallback = async (url) => {
    let { pathname } = new URL(url, 'http://example.org') // dummy domain to avoid invalid URL error
    pathname = pathname.substring(1) // remove first character '/'
    const prefix = `${Bucket}/`
    if (pathname.startsWith(prefix)) {
      pathname = pathname.slice(prefix.length)
    }
    const params = {
      Bucket,
      Key: pathname,
    }
    await s3.send(new DeleteObjectCommand(params))
  }

  return {
    uploadFile,
    deleteFile,
  }
}

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob'

function getCredential(): StorageSharedKeyCredential {
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!name || !key) throw new Error('Azure Storage credentials not configured')
  return new StorageSharedKeyCredential(name, key)
}

function getContainerClient() {
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME!
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!
  const credential = getCredential()
  const serviceClient = new BlobServiceClient(
    `https://${name}.blob.core.windows.net`,
    credential,
  )
  return serviceClient.getContainerClient(containerName)
}

export async function uploadDocument(
  buffer: Buffer,
  blobPath: string,
  contentType: string,
): Promise<void> {
  const containerClient = getContainerClient()
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath)
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
}

export function generatePresignedUrl(blobPath: string): string {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!
  const credential = getCredential()

  const expiresOn = new Date()
  expiresOn.setMinutes(expiresOn.getMinutes() + 5)

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn,
    },
    credential,
  ).toString()

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`
}

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

/**
 * L7 — best-effort blob delete. Used when a Document/DealDocument row is removed
 * so we don't accumulate orphaned blobs. Non-fatal: failures are logged but the
 * caller's DB delete is the source of truth (an orphaned blob is recoverable;
 * a row whose blob deletion threw and rolled back the request would be worse).
 */
export async function deleteBlob(blobPath: string): Promise<void> {
  try {
    const containerClient = getContainerClient()
    await containerClient.getBlockBlobClient(blobPath).deleteIfExists()
  } catch (e) {
    console.error('[azure-blob] deleteBlob failed (non-fatal):', blobPath, e)
  }
}

/**
 * Read-only SAS URL good for 5 minutes. Used by admin and portal document
 * downloads. `startsOn` is back-dated 60s to tolerate clock skew between this
 * host and Azure Storage; the blob path is URI-encoded so segments containing
 * spaces or non-ASCII characters resolve correctly.
 */
export function generatePresignedUrl(blobPath: string): string {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!
  const credential = getCredential()

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 60_000),
      expiresOn: new Date(Date.now() + 5 * 60_000),
    },
    credential,
  ).toString()

  return `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURI(blobPath)}?${sasToken}`
}

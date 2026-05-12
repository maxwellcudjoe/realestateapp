import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@azure/storage-blob', () => {
  const uploadMock = vi.fn().mockResolvedValue({})
  const getBlockBlobClientMock = vi.fn().mockReturnValue({ upload: uploadMock })
  const getContainerClientMock = vi.fn().mockReturnValue({
    getBlockBlobClient: getBlockBlobClientMock,
  })
  return {
    BlobServiceClient: vi.fn().mockImplementation(function () {
      return { getContainerClient: getContainerClientMock }
    }),
    StorageSharedKeyCredential: vi.fn().mockImplementation(function () {}),
    generateBlobSASQueryParameters: vi.fn().mockReturnValue({ toString: () => 'sig=mock' }),
    BlobSASPermissions: { parse: vi.fn().mockReturnValue({}) },
  }
})

describe('azure-blob', () => {
  beforeEach(() => {
    vi.stubEnv('AZURE_STORAGE_ACCOUNT_NAME', 'testaccount')
    vi.stubEnv('AZURE_STORAGE_ACCOUNT_KEY', 'dGVzdGtleQ==')
    vi.stubEnv('AZURE_STORAGE_CONTAINER_NAME', 'kyc-documents')
  })

  it('uploadDocument calls Azure Blob upload', async () => {
    const { uploadDocument } = await import('@/lib/azure-blob')
    const buf = Buffer.from('test-content')
    await expect(uploadDocument(buf, 'kyc/123/passport/abc.pdf', 'application/pdf')).resolves.toBeUndefined()
  })

  it('generatePresignedUrl returns a URL with SAS token', async () => {
    const { generatePresignedUrl } = await import('@/lib/azure-blob')
    const url = generatePresignedUrl('kyc/123/passport/abc.pdf')
    expect(url).toContain('testaccount.blob.core.windows.net')
    expect(url).toContain('kyc-documents')
    expect(url).toContain('sig=mock')
  })

  it('throws when credentials are missing', async () => {
    vi.stubEnv('AZURE_STORAGE_ACCOUNT_NAME', '')
    vi.stubEnv('AZURE_STORAGE_ACCOUNT_KEY', '')
    vi.resetModules()
    const mod = await import('@/lib/azure-blob')
    expect(() => mod.generatePresignedUrl('any/path')).toThrow('Azure Storage credentials not configured')
  })
})

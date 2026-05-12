---
title: Task 4 - Azure Blob Storage Helpers
date_created: 2026-05-12
language: TypeScript
use_case: Upload documents to Azure Blob Storage and generate short-lived pre-signed SAS URLs
related_project: 2026-05-12-investor-platform-expansion
tags:
  - snippet
  - typescript
  - azure
  - storage
  - kyc
---

# Task 4 - Azure Blob Storage Helpers

## Overview

| Field | Value |
|---|---|
| **Function / Pattern** | `uploadDocument`, `generatePresignedUrl` |
| **Language** | TypeScript |
| **Use Case** | Upload KYC documents to Azure Blob Storage and generate 5-minute pre-signed read URLs |
| **Related Project** | [[2026-05-12-investor-platform-expansion]] |
| **Source** | AI-generated (TDD — tests written first) |

---

## Code

```typescript
// src/lib/azure-blob.ts
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

export async function uploadDocument(
  buffer: Buffer,
  blobPath: string,
  contentType: string,
): Promise<void> { ... }

export function generatePresignedUrl(blobPath: string): string { ... }
```

---

## How It Works

- `getCredential()` reads env vars and throws if either is missing — fail-fast pattern.
- `getContainerClient()` builds a `BlobServiceClient` from the account URL and credentials, then returns the named container client.
- `uploadDocument` wraps the `blockBlobClient.upload()` call, setting the Content-Type header.
- `generatePresignedUrl` creates a SAS token with read-only permission and 5-minute expiry, then assembles the full blob URL.

---

## Use Case Example

```typescript
// Upload a document
await uploadDocument(fileBuffer, 'kyc/userId/passport/file.pdf', 'application/pdf')

// Generate a temporary URL to serve to an investor
const url = generatePresignedUrl('kyc/userId/passport/file.pdf')
// => https://account.blob.core.windows.net/kyc-documents/kyc/userId/passport/file.pdf?sig=...
```

---

## Gotchas & Edge Cases

- `StorageSharedKeyCredential` and `BlobServiceClient` must be called as constructors (`new`). Vitest 4.x mocks require `function` keyword (not arrow functions) in `mockImplementation` when mocking constructors.
- The 5-minute SAS expiry is hardcoded. Adjust `expiresOn.setMinutes(+5)` to change.
- `AZURE_STORAGE_CONTAINER_NAME` defaults to `kyc-documents` in the environment.

---

## Test Approach

Tests use `vi.mock('@azure/storage-blob')` to stub all Azure SDK constructors and methods. Dynamic `import('@/lib/azure-blob')` after `vi.stubEnv` ensures environment variable changes are picked up per test. `vi.resetModules()` in the credentials-missing test forces a fresh module import.

---

## AI Context

**Prompt used:** Task 4 from investor-platform implementation plan — TDD: write failing test, implement to green, commit.

---

## Related Snippets & Notes

- [[Task_3_Prisma_Singleton_Client]]
- [[2026-05-12-investor-platform-expansion]]

---

*Created: 2026-05-12*

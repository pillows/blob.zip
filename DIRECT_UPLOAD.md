# Direct Upload for Large Files

This document explains how to use the direct upload approach to handle files larger than 4.5MB, bypassing Vercel's request body size limits.

## Problem

Vercel serverless functions have a hard limit of 4.5MB for request bodies. This cannot be overridden by configuration. When uploading large files through the API, you'll get a 413 "Content Too Large" error.

## Solution: Direct Upload to Vercel Blob

The solution is to upload files directly to Vercel Blob using their client SDK, bypassing your API entirely for the file upload. Your API is only used to:
1. Generate a file ID and create a database record
2. Receive completion notification and update the database

## How It Works

### Step 1: Get Upload Information
```javascript
const response = await fetch('/api/upload-presigned', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'blob.generate-client-token',
    payload: {
      pathname: file.name,
      contentType: file.type,
    },
  }),
});

const uploadInfo = await response.json();
// Returns: { fileId, filename, contentType, uploadMethod, completionUrl }
```

### Step 2: Upload Directly to Vercel Blob
```javascript
import { put } from '@vercel/blob';

const { url, pathname } = await put(uploadInfo.filename, file, {
  access: 'public',
  addRandomSuffix: false,
});
```

### Step 3: Notify Completion
```javascript
const completionResponse = await fetch(uploadInfo.completionUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blobUrl: url,
    blobPathname: pathname,
    size: file.size,
  }),
});

const result = await completionResponse.json();
// Returns: { success: true, id, url, filename, size, expiresAt }
```

## Complete Example

See `examples/direct-upload-example.js` for a complete working example.

## Benefits

- ✅ No file size limits (up to Vercel Blob's limits)
- ✅ Better performance (direct upload)
- ✅ Reduced server load
- ✅ Works with any file size
- ✅ Maintains your existing URL structure

## Requirements

- Install `@vercel/blob` in your client application:
  ```bash
  npm install @vercel/blob
  ```

## API Endpoints

### POST /api/upload-presigned
Creates a database record and returns upload information.

**Request:**
```json
{
  "type": "blob.generate-client-token",
  "payload": {
    "pathname": "filename.ext",
    "contentType": "application/octet-stream"
  }
}
```

**Response:**
```json
{
  "fileId": "abc123",
  "filename": "filename.ext",
  "contentType": "application/octet-stream",
  "uploadMethod": "direct",
  "instructions": "Use @vercel/blob client SDK to upload directly to Vercel Blob",
  "completionUrl": "https://blob.zip/api/upload-complete?fileId=abc123"
}
```

### POST /api/upload-complete?fileId={fileId}
Updates the database record with the actual blob information.

**Request:**
```json
{
  "blobUrl": "https://example.blob.vercel-storage.com/filename.ext",
  "blobPathname": "filename.ext",
  "size": 1048576
}
```

**Response:**
```json
{
  "success": true,
  "id": "abc123",
  "url": "https://blob.zip/abc123",
  "filename": "filename.ext",
  "size": 1048576,
  "expiresAt": "2025-08-02T07:51:00.836Z"
}
```

## Migration from Old Approach

If you're currently using the old upload endpoints, you can:

1. Keep the old endpoints for files under 4.5MB
2. Use the new direct upload approach for larger files
3. Gradually migrate all uploads to use the direct approach

The final URLs and download experience remain exactly the same for your users. 
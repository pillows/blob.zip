// Example: Direct Upload to Vercel Blob
// This approach bypasses the 4.5MB request body limit by uploading directly to Vercel Blob

import { put } from '@vercel/blob';

async function uploadLargeFile(file) {
  try {
    // Step 1: Get upload information from your API
    const response = await fetch('/api/upload-presigned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'blob.generate-client-token',
        payload: {
          pathname: file.name,
          contentType: file.type,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload information');
    }

    const uploadInfo = await response.json();
    console.log('Upload info:', uploadInfo);

    // Step 2: Upload directly to Vercel Blob using the client SDK
    const { url, pathname } = await put(uploadInfo.filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('Direct upload successful:', { url, pathname });

    // Step 3: Notify your API that the upload is complete
    const completionResponse = await fetch(uploadInfo.completionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobUrl: url,
        blobPathname: pathname,
        size: file.size,
      }),
    });

    if (!completionResponse.ok) {
      throw new Error('Failed to complete upload');
    }

    const result = await completionResponse.json();
    console.log('Upload completed:', result);

    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Usage example:
// const fileInput = document.getElementById('file-input');
// fileInput.addEventListener('change', async (event) => {
//   const file = event.target.files[0];
//   if (file) {
//     try {
//       const result = await uploadLargeFile(file);
//       console.log('File uploaded successfully:', result.url);
//     } catch (error) {
//       console.error('Upload failed:', error);
//     }
//   }
// });

export { uploadLargeFile }; 
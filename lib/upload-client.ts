import { upload } from '@vercel/blob/client';

interface UploadOptions {
  file: File;
  fileId: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

export async function uploadFileWithPresigned({
  file,
  fileId,
  onProgress
}: UploadOptions): Promise<UploadResult> {
  try {
    // First, get the upload URL
    const presignedResponse = await fetch('/api/upload-presigned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileId: fileId,
      }),
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { uploadUrl, method, headers } = await presignedResponse.json();

    // Upload the file directly to the upload URL
    const uploadResponse = await fetch(uploadUrl, {
      method: method || 'PUT',
      body: file,
      headers: headers || {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return {
      success: true,
      id: fileId,
      url: result.url,
      filename: file.name,
      size: file.size,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Direct upload approach using multipart form data
export async function uploadFileWithDirect({
  file,
  fileId,
  onProgress
}: UploadOptions): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    // Upload using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', '/api/upload-direct');
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Alternative approach using fetch for more control
export async function uploadFileWithFetch({
  file,
  fileId,
  onProgress
}: UploadOptions): Promise<UploadResult> {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);

    // Upload directly to our API
    const response = await fetch('/api/upload-direct', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Chunked upload approach that bypasses serverless function limits
export async function uploadFileWithChunks({
  file,
  fileId,
  onProgress
}: UploadOptions): Promise<UploadResult> {
  try {
    // Initialize chunked upload
    const initResponse = await fetch('/api/upload-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        fileId: fileId,
        totalSize: file.size,
      }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.error || 'Failed to initialize chunked upload');
    }

    const { chunkSize } = await initResponse.json();
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const isLastChunk = i === totalChunks - 1;

      const chunkResponse = await fetch(`/api/upload-direct?fileId=${fileId}&chunkIndex=${i}&isLastChunk=${isLastChunk}`, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`);
      }

      const chunkResult = await chunkResponse.json();
      
      // Update progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(progress);
      }

      // If this was the last chunk, return the final result
      if (chunkResult.completed) {
        return {
          success: true,
          id: chunkResult.id,
          url: chunkResult.url,
          filename: chunkResult.filename,
          size: chunkResult.size,
          expiresAt: chunkResult.expiresAt,
        };
      }
    }

    throw new Error('Upload completed but no final result received');
  } catch (error) {
    console.error('Chunked upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chunked upload failed',
    };
  }
}
'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Always try the regular upload endpoint first
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/', {
        method: 'POST',
        body: formData,
      });

      // If we get a 413 error, use chunked upload
      if (response.status === 413) {
        console.log('File too large for direct upload, using chunked upload');
        
        // First, create a database record
        const createRecordResponse = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
          }),
        });

        if (!createRecordResponse.ok) {
          throw new Error('Failed to create upload record');
        }

        const { fileId: createdFileId } = await createRecordResponse.json();

        // Use chunked upload for large files
        await uploadWithChunks(file, createdFileId);
      } else if (!response.ok) {
        throw new Error('Upload failed');
      } else {
        const result = await response.json();

        if (result.success) {
          setResult({
            success: true,
            id: result.id,
            url: result.url,
            filename: result.filename,
            size: result.size,
            expiresAt: result.expiresAt,
          });
        } else {
          setError(result.error || 'Upload failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  // Helper function for chunked upload
  const uploadWithChunks = async (file: File, fileId: string) => {
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks (under Vercel's 4.5MB limit)
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`Uploading ${file.name} in ${totalChunks} chunks of ${chunkSize} bytes each`);
    
    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const isLastChunk = i === totalChunks - 1;

      console.log(`Uploading chunk ${i + 1}/${totalChunks} (${chunk.size} bytes)`);

      const chunkResponse = await fetch(`/api/upload-stream?fileId=${fileId}&filename=${encodeURIComponent(file.name)}&chunkIndex=${i}&isLastChunk=${isLastChunk}`, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`);
      }

      const chunkResult = await chunkResponse.json();
      
      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setProgress(progress);

      // If this was the last chunk, use the final result
      if (isLastChunk && chunkResult.success) {
        setResult({
          success: true,
          id: chunkResult.id,
          url: chunkResult.url,
          filename: chunkResult.filename,
          size: chunkResult.size,
          expiresAt: chunkResult.expiresAt,
        });
        return;
      }
    }

    throw new Error('Upload completed but no final result received');
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '0 auto', 
      padding: '24px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' 
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Upload Large Files
      </h2>
      
      <div style={{ marginBottom: '16px' }}>
        <input
          type="file"
          onChange={handleFileChange}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px'
          }}
          disabled={uploading}
        />
      </div>

      {file && (
        <div style={{ 
          marginBottom: '16px', 
          fontSize: '14px', 
          color: '#6b7280' 
        }}>
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          width: '100%',
          backgroundColor: !file || uploading ? '#d1d5db' : '#3b82f6',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          border: 'none',
          cursor: !file || uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? `Uploading... ${progress}%` : 'Upload File'}
      </button>

      {uploading && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            width: '100%',
            backgroundColor: '#e5e7eb',
            borderRadius: '9999px',
            height: '8px'
          }}>
            <div
              style={{
                backgroundColor: '#2563eb',
                height: '8px',
                borderRadius: '9999px',
                transition: 'width 0.3s',
                width: `${progress}%`
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#dc2626',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#16a34a',
          borderRadius: '4px'
        }}>
          <p>Upload successful!</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            <strong>URL:</strong>{' '}
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ textDecoration: 'underline' }}
            >
              {result.url}
            </a>
          </p>
          <p style={{ fontSize: '14px' }}>
            <strong>Size:</strong> {(result.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}
    </div>
  );
}
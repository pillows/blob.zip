'use client';

import React, { useState, useEffect } from 'react';

interface FileData {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  details?: string;
  files?: FileData[];
  count?: number;
  url?: string;
  downloadUrl?: string;
  pathname?: string;
  size?: number;
  uploadedAt?: string;
  message?: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);  
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3000');

  // Fetch files and set server URL on component mount
  useEffect(() => {
    fetchFiles();
    setServerUrl(window.location.origin);
  }, []);

  const fetchFiles = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/files');
      const data: ApiResponse = await response.json();
      if (data.success && data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(file.name);

    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        await fetchFiles(); // Refresh the file list
        event.target.value = ''; // Clear the input
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (pathname: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pathname }),
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        await fetchFiles(); // Refresh the file list
      } else {
        alert('Delete failed: ' + data.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + (error as Error).message);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <div className="container">
        <header className="header">
          <h1 className="title">🗂️ BlobZip</h1>
          <p className="subtitle">Temporary file hosting made simple</p>
        </header>

        <main className="main">
          {/* Upload Section */}
          <section className="upload-section">
            <div className="upload-area">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className={`upload-label ${uploading ? 'uploading' : ''}`}>
                {uploading ? (
                  <div className="upload-progress">
                    <div className="spinner"></div>
                    <span>Uploading {uploadProgress}...</span>
                  </div>
                ) : (
                  <div className="upload-content">
                    <div className="upload-icon">📁</div>
                    <span>Click to upload a file</span>
                    <small>Maximum file size: 50MB</small>
                  </div>
                )}
              </label>
            </div>
          </section>

          {/* Files Section */}
          <section className="files-section">
            <div className="section-header">
              <h2>Uploaded Files ({files.length})</h2>
              <button onClick={fetchFiles} disabled={loading} className="refresh-btn">
                {loading ? '🔄' : '↻'} Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="empty-state">
                <p>No files uploaded yet</p>
                <small>Upload a file to get started</small>
              </div>
            ) : (
              <div className="files-grid">
                {files.map((file) => (
                  <div key={file.pathname} className="file-card">
                    <div className="file-info">
                      <div className="file-name">{file.pathname.split('/').pop()}</div>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-date">{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-btn download-btn"
                        title="Download file"
                      >
                        ⬇️
                      </a>
                      <button
                        onClick={() => copyToClipboard(file.url)}
                        className="action-btn copy-btn"
                        title="Copy URL"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDelete(file.pathname)}
                        className="action-btn delete-btn"
                        title="Delete file"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CLI Info Section */}
          <section className="cli-section">
            <h3>TypeScript CLI Available</h3>
            <div className="cli-info">
              <p>Use the powerful TypeScript CLI for advanced file management:</p>
              <div className="cli-commands">
                <code>npm install -g .</code>
                <code>blobzip upload ./myfile.pdf</code>
                <code>blobzip list</code>
                <code>blobzip config</code>
              </div>
              <p><small>See README for complete CLI documentation with examples and TypeScript development guide.</small></p>
            </div>
          </section>

          {/* cURL Commands Section */}
          <section className="curl-section">
            <h3>🔧 cURL Commands</h3>
            <div className="curl-info">
              <p>Use these cURL commands to interact with the API directly:</p>
              
              <div className="curl-command-group">
                <h4>📤 Upload a File</h4>
                <div className="curl-command-container">
                  <code className="curl-command">
                    curl -X POST "{serverUrl}/api/upload?filename=myfile.txt" \<br/>
                    &nbsp;&nbsp;-H "Content-Type: application/octet-stream" \<br/>
                    &nbsp;&nbsp;--data-binary @./myfile.txt
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -X POST "${serverUrl}/api/upload?filename=myfile.txt" -H "Content-Type: application/octet-stream" --data-binary @./myfile.txt`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="curl-command-group">
                <h4>📋 List All Files</h4>
                <div className="curl-command-container">
                  <code className="curl-command">
                    curl -X GET "{serverUrl}/api/files"
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -X GET "${serverUrl}/api/files"`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="curl-command-group">
                <h4>⬇️ Download a File</h4>
                <div className="curl-command-container">
                  <code className="curl-command">
                    curl -X GET "{serverUrl}/api/download?url=BLOB_URL" \<br/>
                    &nbsp;&nbsp;-L -o downloaded-file.ext
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -X GET "${serverUrl}/api/download?url=BLOB_URL" -L -o downloaded-file.ext`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="curl-command-group">
                <h4>🗑️ Delete a File</h4>
                <div className="curl-command-container">
                  <code className="curl-command">
                    curl -X DELETE "{serverUrl}/api/files" \<br/>
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                    &nbsp;&nbsp;-d '{"{"}"pathname": "file-pathname-here"{"}"}'
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -X DELETE "${serverUrl}/api/files" -H "Content-Type: application/json" -d '{"pathname": "file-pathname-here"}'`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="curl-tips">
                <h4>💡 Tips:</h4>
                <ul>
                  <li>Replace <code>myfile.txt</code> with your actual filename</li>
                  <li>Replace <code>BLOB_URL</code> with the actual blob URL from upload response</li>
                  <li>Replace <code>file-pathname-here</code> with the pathname from list response</li>
                  <li>Use <code>-L</code> flag to follow redirects for downloads</li>
                  <li>Add <code>| jq</code> to pretty-print JSON responses</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <style jsx>{`
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
          }

          .title {
            font-size: 3rem;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin: 10px 0 0 0;
          }

          .main {
            display: flex;
            flex-direction: column;
            gap: 40px;
          }

          .upload-section {
            display: flex;
            justify-content: center;
          }

          .upload-area {
            width: 100%;
            max-width: 500px;
          }

          .file-input {
            display: none;
          }

          .upload-label {
            display: block;
            padding: 60px 20px;
            border: 3px dashed #ddd;
            border-radius: 12px;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
          }

          .upload-label:hover {
            border-color: #667eea;
            background: #f0f4ff;
          }

          .upload-label.uploading {
            border-color: #667eea;
            background: #f0f4ff;
            cursor: not-allowed;
          }

          .upload-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .upload-icon {
            font-size: 3rem;
          }

          .upload-progress {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }

          .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .files-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .section-header h2 {
            margin: 0;
            color: #333;
          }

          .refresh-btn {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.2s;
          }

          .refresh-btn:hover {
            background: #e9ecef;
          }

          .loading, .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
          }

          .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
          }

          .file-card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fafafa;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .file-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }

          .file-info {
            flex: 1;
            min-width: 0;
          }

          .file-name {
            font-weight: 600;
            margin-bottom: 5px;
            word-break: break-all;
          }

          .file-meta {
            display: flex;
            gap: 15px;
            font-size: 0.9rem;
            color: #666;
          }

          .file-actions {
            display: flex;
            gap: 8px;
            margin-left: 15px;
          }

          .action-btn {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            transition: background 0.2s;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .action-btn:hover {
            background: rgba(0, 0, 0, 0.1);
          }

          .delete-btn:hover {
            background: rgba(220, 53, 69, 0.1);
          }

          .cli-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 30px;
          }

          .cli-section h3 {
            margin-top: 0;
            color: #333;
          }

          .cli-commands {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 15px;
          }

          .cli-commands code {
            background: #333;
            color: #f8f8f2;
            padding: 10px 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            display: block;
          }

          .curl-section {
            background: #f0f9ff;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #e0f2fe;
          }

          .curl-section h3 {
            margin-top: 0;
            color: #0f172a;
          }

          .curl-command-group {
            margin-bottom: 25px;
          }

          .curl-command-group h4 {
            margin: 0 0 10px 0;
            color: #475569;
            font-size: 1rem;
          }

          .curl-command-container {
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }

          .curl-command {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 0.85rem;
            line-height: 1.5;
            display: block;
            flex: 1;
            word-break: break-all;
            white-space: pre-wrap;
          }

          .copy-curl-btn {
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
            flex-shrink: 0;
            margin-top: 5px;
          }

          .copy-curl-btn:hover {
            background: #2563eb;
          }

          .curl-tips {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
          }

          .curl-tips h4 {
            margin-top: 0;
            color: #92400e;
          }

          .curl-tips ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
          }

          .curl-tips li {
            margin-bottom: 8px;
            color: #78350f;
          }

          .curl-tips code {
            background: #fbbf24;
            color: #92400e;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85rem;
          }

          @media (max-width: 768px) {
            .container {
              padding: 15px;
            }

            .title {
              font-size: 2rem;
            }

            .files-grid {
              grid-template-columns: 1fr;
            }

            .section-header {
              flex-direction: column;
              gap: 15px;
              align-items: flex-start;
            }

            .file-card {
              flex-direction: column;
              align-items: flex-start;
              gap: 15px;
            }

            .file-actions {
              margin-left: 0;
              align-self: flex-end;
            }

            .curl-command-container {
              flex-direction: column;
              gap: 15px;
            }

            .curl-command {
              font-size: 0.8rem;
              padding: 12px;
            }

            .copy-curl-btn {
              align-self: flex-end;
              margin-top: 0;
            }

            .curl-tips {
              padding: 15px;
            }
          }
        `}</style>
      </div>
    </>
  );
} 
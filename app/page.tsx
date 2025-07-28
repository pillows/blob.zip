'use client';

import React, { useState, useEffect } from 'react';

// File listing removed - now admin-only feature

interface ApiResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
  details?: string;
}

export default function Home() {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3000');

  // Set server URL on component mount
  useEffect(() => {
    setServerUrl(window.location.origin); // Set URL on client-side
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(`Uploading ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        alert(`File uploaded successfully!\nID: ${data.id}\nURL: ${data.url}\nExpires: ${new Date(data.expiresAt).toLocaleDateString()}`)
      } else {
        alert(`Upload failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: Network error')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      // Clear the file input
      event.target.value = ''
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <main className="container">
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
                id="file-input"
                className="file-input"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="file-input" className={`upload-label ${uploading ? 'uploading' : ''}`}>
                <div className="upload-content">
                  <div className="upload-icon">📁</div>
                  <span>{uploadProgress || 'Click to upload a file'}</span>
                  <small>Maximum file size: 50MB</small>
                </div>
              </label>
            </div>
          </section>

          {/* CLI Section */}
          <section className="cli-section">
            <h3>TypeScript CLI Available</h3>
            <div className="cli-info">
              <p>Use the powerful TypeScript CLI for advanced file management:</p>
              <div className="cli-commands">
                <code>npm install -g .</code>
                <code>blobzip upload ./myfile.pdf</code>
                <code>blobzip config</code>
              </div>
              <p>
                <small>See README for complete CLI documentation with examples and TypeScript development guide.</small>
              </p>
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
                    curl -F "file=@myfile.txt" {serverUrl}/upload
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -F "file=@myfile.txt" ${serverUrl}/upload`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
                <small>Or with custom filename: <code>curl "{serverUrl}/upload?f=custom.txt" --data-binary @./myfile.txt</code></small>
                <p><strong>✨ Simple!</strong> Just <code>/upload</code> - no complex API paths to remember.</p>
              </div>

              <div className="curl-command-group">
                <h4>⬇️ Download a File</h4>
                <div className="curl-command-container">
                  <code className="curl-command">
                    curl -o myfile.txt {serverUrl}/FILE_ID
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`curl -o myfile.txt ${serverUrl}/FILE_ID`)}
                    className="copy-curl-btn"
                    title="Copy cURL command"
                  >
                    📋
                  </button>
                </div>
                <small>Replace FILE_ID with the ID from upload response</small>
              </div>

              <div className="curl-tips">
                <h4>💡 Tips:</h4>
                <ul>
                  <li><strong>⚠️ Files can only be downloaded once!</strong></li>
                  <li>Files expire automatically after 3 days</li>
                  <li>Use the short URL from upload response for downloads</li>
                  <li>Replace <code>FILE_ID</code> with the actual ID from upload response</li>
                  <li>Add <code>| jq</code> to pretty-print JSON responses</li>
                  <li>Use <code>-F</code> for form uploads or <code>--data-binary</code> with <code>?f=filename</code></li>
                </ul>
              </div>
            </div>
          </section>

          <section className="info-section">
            <div className="info-card">
              <h3>📝 How It Works</h3>
              <ol>
                <li>Upload your files using the form above or cURL commands</li>
                <li>Get a short, shareable URL instantly</li>
                <li><strong>⚠️ Files can only be downloaded once</strong></li>
                <li>Files are automatically deleted after 3 days</li>
                <li>No registration required - completely anonymous</li>
              </ol>
            </div>
            
            <div className="info-card">
              <h3>🔒 Privacy & Security</h3>
              <ul>
                <li>Files are stored securely with Vercel Blob</li>
                <li>IP-based rate limiting prevents abuse</li>
                <li>No file content scanning or tracking</li>
                <li>Automatic cleanup after expiration</li>
              </ul>
            </div>

            <div className="info-card">
              <h3>⚡ Features</h3>
              <ul>
                <li>Up to 50MB file size limit</li>
                                  <li>Ultra-simple upload: just POST to the root URL</li>
                <li>TypeScript CLI tool available</li>
                <li>Download tracking and statistics</li>
              </ul>
            </div>
          </section>


        </main>
      </main>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          color: white;
        }

        .title {
          font-size: 3rem;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .subtitle {
          font-size: 1.2rem;
          margin: 10px 0 0 0;
          opacity: 0.9;
        }

        .main {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .upload-section {
          margin-bottom: 40px;
        }

        .upload-area {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .file-input {
          display: none;
        }

        .upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 500px;
          padding: 40px;
          border: 3px dashed #cbd5e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8f9fa;
        }

        .upload-label:hover {
          border-color: #667eea;
          background: #f0f4ff;
          transform: translateY(-2px);
        }

        .upload-label.uploading {
          cursor: not-allowed;
          opacity: 0.7;
          border-color: #fbbf24;
          background: #fffbeb;
        }

        .upload-content {
          text-align: center;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .upload-content span {
          display: block;
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .upload-content small {
          color: #6b7280;
          font-size: 0.9rem;
        }

        .cli-section, .curl-section {
          margin: 40px 0;
          padding: 30px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e1e5e9;
        }

        .cli-section h3, .curl-section h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 1.5rem;
        }

        .cli-info, .curl-info {
          color: #555;
        }

        .cli-commands {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 20px 0;
        }

        .cli-commands code {
          background: #2d3748;
          color: #e2e8f0;
          padding: 12px;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9rem;
        }

        .curl-command-group {
          margin: 30px 0;
        }

        .curl-command-group h4 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .curl-command-container {
          position: relative;
          display: flex;
          align-items: flex-start;
          background: #2d3748;
          border-radius: 6px;
          overflow: hidden;
        }

        .curl-command {
          flex: 1;
          background: #2d3748;
          color: #e2e8f0;
          padding: 15px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .copy-curl-btn {
          background: #4a5568;
          color: white;
          border: none;
          padding: 15px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s ease;
          border-left: 1px solid #2d3748;
        }

        .copy-curl-btn:hover {
          background: #e6e6e6;
        }

        .info-section {
          margin: 3rem 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .info-card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e1e5e9;
        }

        .info-card h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.2rem;
        }

        .info-card ol, .info-card ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .info-card li {
          margin-bottom: 0.5rem;
          color: #666;
          line-height: 1.5;
        }

        

        .curl-tips {
          margin-top: 30px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .curl-tips h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .curl-tips ul {
          margin: 0;
          padding-left: 20px;
        }

        .curl-tips li {
          margin-bottom: 8px;
          color: #555;
          line-height: 1.4;
        }

        .curl-tips code {
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
          
          .main {
            padding: 20px;
          }
          
          .title {
            font-size: 2rem;
          }
          
          .info-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
} 
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { initializeDatabase, isIpBanned, createFileRecord, updateFileRecordFixed } from '../lib/db';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

interface UploadResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
  details?: string;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// Serve the frontend for GET requests
export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🗂️ BlobZip - Temporary File Hosting</title>
</head>
<body>
  <div id="root">
    <main class="container">
      <header class="header">
        <h1 class="title">🗂️ BlobZip</h1>
        <p class="subtitle">Temporary file hosting made simple</p>
      </header>

             <main class="main">
         <!-- Upload Section -->
         <section class="upload-section">
           <div class="upload-area">
             <input
               type="file"
               id="file-input"
               class="file-input"
             />
             <label for="file-input" class="upload-label" id="upload-label">
               <div class="upload-content">
                 <div class="upload-icon">📁</div>
                                      <span id="upload-text">Click to upload or drag & drop a file</span>
                     <small>Maximum file size: 50MB</small>
               </div>
             </label>
           </div>
           
           <!-- Upload Result Section -->
           <div id="upload-result" class="upload-result" style="display: none;">
             <div class="result-content">
               <div class="result-icon">✅</div>
               <h3>File Uploaded Successfully!</h3>
               <div class="result-details">
                 <div class="result-row">
                   <label>File URL:</label>
                   <div class="url-container">
                     <input type="text" id="file-url" class="url-input" readonly>
                     <button id="copy-url-btn" class="copy-btn">📋</button>
                   </div>
                 </div>
                 <div class="result-row">
                   <label>Expires:</label>
                   <span id="file-expiry" class="expiry-text"></span>
                 </div>
                 <div class="result-row">
                   <label>File ID:</label>
                   <span id="file-id" class="file-id"></span>
                 </div>
               </div>
               <button id="upload-another" class="upload-another-btn">Upload Another File</button>
             </div>
           </div>
         </section>

        

        <!-- cURL Commands Section -->
        <section class="curl-section">
          <h3>🔧 cURL Commands</h3>
          <div class="curl-info">
            <p>Use these cURL commands to interact with the API directly:</p>
            
            <div class="curl-command-group">
              <h4>📤 Upload a File</h4>
                             <div class="curl-command-container">
                 <code class="curl-command">curl -F "file=@myfile.txt" ${process.env.BLOBZIP_URL || 'http://localhost:3000'}</code>
                 <button class="copy-curl-btn" onclick="copyToClipboard('curl -F \\"file=@myfile.txt\\" ${process.env.BLOBZIP_URL || 'http://localhost:3000'}')">📋</button>
               </div>
               <small>For files under 4.5MB. For larger files, use the one-liner command below.</small>
              <p><strong>✨ Ultra-simple!</strong> Just post to the root URL - as simple as it gets!</p>
            </div>

                         <div class="curl-command-group">
               <h4>📤 Upload Large Files (>4.5MB)</h4>
               <p>Due to Vercel's 4.5MB function payload limit, large files require chunked upload:</p>
               
               <h5>One-Liner Command:</h5>
               <div class="curl-command-container">
                 <code class="curl-command">curl -s https://raw.githubusercontent.com/pillows/blob.zip/main/upload-one-liner.sh | bash -s "/path/to/file.mov"</code>
                 <button class="copy-curl-btn" onclick="copyToClipboard('curl -s https://raw.githubusercontent.com/pillows/blob.zip/main/upload-one-liner.sh | bash -s \\"/path/to/file.mov\\"')">📋</button>
               </div>
               
               <h5>Example:</h5>
               <div class="curl-command-container">
                 <code class="curl-command">curl -s https://raw.githubusercontent.com/pillows/blob.zip/main/upload-one-liner.sh | bash -s "/Users/snow/Downloads/Screen Recording 2025-07-24 at 4.13.56 PM (4).mov"</code>
                 <button class="copy-curl-btn" onclick="copyToClipboard('curl -s https://raw.githubusercontent.com/pillows/blob.zip/main/upload-one-liner.sh | bash -s \\"/Users/snow/Downloads/Screen Recording 2025-07-24 at 4.13.56 PM (4).mov\\"')">📋</button>
               </div>
               
               <small>✨ Super simple! Just one command handles everything automatically.</small>
             </div>

            <div class="curl-command-group">
              <h4>⬇️ Download a File</h4>
              <div class="curl-command-container">
                <code class="curl-command">curl -o myfile.txt ${process.env.BLOBZIP_URL || 'http://localhost:3000'}/FILE_ID</code>
                <button class="copy-curl-btn" onclick="copyToClipboard('curl -o myfile.txt ${process.env.BLOBZIP_URL || 'http://localhost:3000'}/FILE_ID')">📋</button>
              </div>
              <small>Replace FILE_ID with the ID from upload response</small>
            </div>

            <div class="curl-tips">
              <h4>💡 Tips:</h4>
              <ul>
                <li><strong>⚠️ Files can only be downloaded once!</strong></li>
                <li><strong>🗑️ Files are deleted immediately after download</strong></li>
                <li>Files expire automatically after 3 days</li>
                <li><strong>📦 Files over 4.5MB:</strong> Use the chunked upload script due to Vercel's function payload limits</li>
                <li>Use the short URL from upload response for downloads</li>
                <li>Replace <code>FILE_ID</code> with the actual ID from upload response</li>
                <li>Add <code>| jq</code> to pretty-print JSON responses</li>
                <li>Use <code>-F</code> for form uploads or <code>--data-binary</code> with <code>?f=filename</code></li>
              </ul>
            </div>
          </div>
        </section>

        <section class="info-section">
          <div class="info-card">
            <h3>📝 How It Works</h3>
            <ol>
              <li>Upload your files using the form above or cURL commands</li>
              <li>Get a short, shareable URL instantly</li>
              <li><strong>⚠️ Files can only be downloaded once</strong></li>
              <li>Files are automatically deleted after 3 days</li>
              <li>No registration required - completely anonymous</li>
            </ol>
          </div>
          
          <div class="info-card">
                               <h3>🔒 Privacy & Security</h3>
                   <ul>
                     <li>Files are stored securely with Vercel Blob</li>
                     <li>IP-based rate limiting prevents abuse</li>
                     <li>No file content scanning or tracking</li>
                     <li>Automatic cleanup after expiration</li>
                     <li>Optional Discord notifications for monitoring</li>
                   </ul>
          </div>

                      <div class="info-card">
              <h3>⚡ Features</h3>
              <ul>
                <li>Up to 50MB file size limit</li>
                <li>Ultra-simple upload: just POST to the root domain</li>
                <li>One-time downloads for enhanced security</li>
              </ul>
            </div>
        </section>
      </main>
    </main>
  </div>

  <style>
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

    .upload-label.drag-over {
      border-color: #10b981;
      background: #ecfdf5;
      border-style: solid;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
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

     .upload-result {
       margin-top: 2rem;
       background: #f0f9ff;
       border: 2px solid #0ea5e9;
       border-radius: 12px;
       padding: 2rem;
       text-align: center;
     }

     .result-content {
       max-width: 500px;
       margin: 0 auto;
     }

     .result-icon {
       font-size: 3rem;
       margin-bottom: 1rem;
     }

     .result-content h3 {
       margin: 0 0 1.5rem 0;
       color: #0c4a6e;
       font-size: 1.5rem;
     }

     .result-details {
       display: flex;
       flex-direction: column;
       gap: 1rem;
       margin-bottom: 2rem;
       text-align: left;
     }

     .result-row {
       display: flex;
       flex-direction: column;
       gap: 0.5rem;
     }

     .result-row label {
       font-weight: 600;
       color: #374151;
       font-size: 0.9rem;
     }

     .url-container {
       display: flex;
       gap: 0.5rem;
     }

     .url-input {
       flex: 1;
       padding: 0.75rem;
       border: 1px solid #d1d5db;
       border-radius: 6px;
       font-family: 'Monaco', 'Menlo', monospace;
       font-size: 0.9rem;
       background: white;
     }

     .copy-btn {
       background: #3b82f6;
       color: white;
       border: none;
       padding: 0.75rem 1rem;
       border-radius: 6px;
       cursor: pointer;
       font-size: 1rem;
       transition: background 0.2s ease;
     }

     .copy-btn:hover {
       background: #2563eb;
     }

     .expiry-text, .file-id {
       color: #6b7280;
       font-family: 'Monaco', 'Menlo', monospace;
       font-size: 0.9rem;
     }

     .upload-another-btn {
       background: #10b981;
       color: white;
       border: none;
       padding: 0.75rem 1.5rem;
       border-radius: 8px;
       cursor: pointer;
       font-size: 1rem;
       font-weight: 600;
       transition: background 0.2s ease;
     }

     .upload-another-btn:hover {
       background: #059669;
     }

         .curl-section {
       margin: 40px 0;
       padding: 30px;
       background: #f8f9fa;
       border-radius: 12px;
       border: 1px solid #e1e5e9;
     }

     .curl-section h3 {
       margin: 0 0 20px 0;
       color: #333;
       font-size: 1.5rem;
     }

     .curl-info {
       color: #555;
     }

    .curl-command-group {
      margin: 30px 0;
    }

    .curl-command-group h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 1.1rem;
    }

    .curl-command-group h5 {
      margin: 15px 0 10px 0;
      color: #555;
      font-size: 1rem;
      font-weight: 600;
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
  </style>

           <script>
           // Simple nanoid implementation for client-side
           function nanoid() {
             const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
             let result = '';
             for (let i = 0; i < 8; i++) {
               result += chars.charAt(Math.floor(Math.random() * chars.length));
             }
             return result;
           }

           function copyToClipboard(text) {
             navigator.clipboard.writeText(text).then(() => {
               alert('Copied to clipboard!');
             }).catch(() => {
               alert('Failed to copy to clipboard');
             });
           }

           // Handle drag and drop functionality
           function setupDragAndDrop() {
             const uploadLabel = document.getElementById('upload-label');
             const fileInput = document.getElementById('file-input');

             // Prevent default drag behaviors
             ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
               uploadLabel.addEventListener(eventName, preventDefaults, false);
               document.body.addEventListener(eventName, preventDefaults, false);
             });

             // Highlight drop area when item is dragged over it
             ['dragenter', 'dragover'].forEach(eventName => {
               uploadLabel.addEventListener(eventName, highlight, false);
             });

             ['dragleave', 'drop'].forEach(eventName => {
               uploadLabel.addEventListener(eventName, unhighlight, false);
             });

             // Handle dropped files
             uploadLabel.addEventListener('drop', handleDrop, false);

             function preventDefaults(e) {
               e.preventDefault();
               e.stopPropagation();
             }

             function highlight(e) {
               uploadLabel.classList.add('drag-over');
               document.getElementById('upload-text').textContent = 'Drop your file here';
             }

             function unhighlight(e) {
               uploadLabel.classList.remove('drag-over');
               document.getElementById('upload-text').textContent = 'Click to upload or drag & drop a file';
             }

             function handleDrop(e) {
               const dt = e.dataTransfer;
               const files = dt.files;

               if (files.length > 0) {
                 handleFileUpload(files[0]);
               }
             }
           }

           // Handle file upload with optimized approach for different file sizes
           async function handleFileUpload(file) {
             if (!file) return;

             const uploadLabel = document.getElementById('upload-label');
             const uploadText = document.getElementById('upload-text');
             const uploadResult = document.getElementById('upload-result');
             
             // Show uploading state
             uploadLabel.classList.add('uploading');
             uploadText.textContent = \`Uploading \${file.name}...\`;

             try {
               let result;
               
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
                 
                 const chunkSize = 4 * 1024 * 1024; // 4MB chunks (under Vercel's 4.5MB limit)
                 const totalChunks = Math.ceil(file.size / chunkSize);
                 
                 console.log(\`Uploading \${file.name} in \${totalChunks} chunks of \${chunkSize} bytes each\`);
                 
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

                 // Upload chunks
                 for (let i = 0; i < totalChunks; i++) {
                   const start = i * chunkSize;
                   const end = Math.min(start + chunkSize, file.size);
                   const chunk = file.slice(start, end);
                   const isLastChunk = i === totalChunks - 1;

                   console.log(\`Uploading chunk \${i + 1}/\${totalChunks} (\${chunk.size} bytes)\`);

                   const chunkResponse = await fetch(\`/api/upload-stream?fileId=\${createdFileId}&filename=\${encodeURIComponent(file.name)}&chunkIndex=\${i}&isLastChunk=\${isLastChunk}\`, {
                     method: 'PUT',
                     body: chunk,
                     headers: {
                       'Content-Type': file.type || 'application/octet-stream',
                     },
                   });

                   if (!chunkResponse.ok) {
                     throw new Error(\`Failed to upload chunk \${i + 1}/\${totalChunks}\`);
                   }

                   const chunkResult = await chunkResponse.json();
                   
                   // If this was the last chunk, use the final result
                   if (isLastChunk && chunkResult.success) {
                     result = chunkResult;
                     break;
                   }
                 }
               } else if (!response.ok) {
                 throw new Error('Upload failed');
               } else {
                 result = await response.json();
               }

               if (result.success) {
                 // Show success result
                 document.getElementById('file-url').value = result.url;
                 document.getElementById('file-expiry').textContent = new Date(result.expiresAt).toLocaleString();
                 document.getElementById('file-id').textContent = result.id;
                 
                 uploadResult.style.display = 'block';
                 uploadLabel.style.display = 'none';
               } else {
                 throw new Error(result.error || 'Upload failed');
               }

             } catch (error) {
               console.error('Upload error:', error);
               alert(\`Upload failed: \${error.message}\`);
               // Reset upload state
               uploadLabel.classList.remove('uploading');
               uploadText.textContent = 'Click to upload or drag & drop a file';
             }
           }

           document.getElementById('file-input').addEventListener('change', async function(event) {
             const file = event.target.files[0];
             if (file) {
               await handleFileUpload(file);
               // Clear the file input
               event.target.value = '';
             }
           });

     // Handle copy URL button
     document.addEventListener('click', function(event) {
       if (event.target.id === 'copy-url-btn') {
         const urlInput = document.getElementById('file-url');
         urlInput.select();
         navigator.clipboard.writeText(urlInput.value).then(() => {
           const btn = event.target;
           const originalText = btn.textContent;
           btn.textContent = '✅';
           setTimeout(() => {
             btn.textContent = originalText;
           }, 2000);
         }).catch(() => {
           alert('Failed to copy URL');
         });
       }
     });

     // Handle upload another file button
     document.addEventListener('click', function(event) {
       if (event.target.id === 'upload-another') {
         const uploadLabel = document.getElementById('upload-label');
         const uploadText = document.getElementById('upload-text');
         const uploadResult = document.getElementById('upload-result');
         
                        // Reset to initial state
               uploadResult.style.display = 'none';
               uploadLabel.style.display = 'flex';
               uploadLabel.classList.remove('uploading');
               uploadText.textContent = 'Click to upload or drag & drop a file';
             }
           });

           // Initialize drag and drop functionality
           document.addEventListener('DOMContentLoaded', function() {
             setupDragAndDrop();
           });
         </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Initialize database
    await initializeDatabase();

    // Check IP ban
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get filename from query params or form data
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get('f') || searchParams.get('filename');
    let fileBuffer: Buffer;
    let fileSize = 0;

    // Check if this is a raw binary upload (--data-binary)
    const contentType = request.headers.get('content-type');
    const isRawBinary = !contentType || contentType === 'application/octet-stream';
    
    // Check content-length to determine if we need streaming approach
    const contentLength = request.headers.get('content-length');
    const estimatedSize = contentLength ? parseInt(contentLength, 10) : 0;

    // If the request is likely to exceed Vercel's limits and it's raw binary, use streaming approach
    if (estimatedSize > 4 * 1024 * 1024 && isRawBinary) {
      console.log('Large raw binary request detected, using streaming approach:', {
        estimatedSize,
        filename,
        contentType
      });

      // For large files, we need to process them in chunks to avoid Vercel's function payload limit
      return await handleLargeFileUpload(request, filename, clientIP);
    }

    // Try to get from form data first for smaller files
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file && file.name) {
        filename = filename || file.name;
        // Convert File to ArrayBuffer then to Buffer
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        fileSize = fileBuffer.length;
      } else {
        throw new Error('No file in form data');
      }
    } catch (formError) {
      // If form data parsing fails, try to read as raw binary data
      if (!filename) {
        return NextResponse.json(
          { success: false, error: 'Filename is required. Use ?f=filename.ext or form data with file field' }, 
          { status: 400 }
        );
      }
      // Read the body as raw binary data
      const arrayBuffer = await request.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileSize = fileBuffer.length;
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required. Use ?f=filename.ext or form data' }, 
        { status: 400 }
      );
    }

    // Generate short ID
    const fileId = nanoid();

    // Double-check file size after reading
    if (fileSize > 4 * 1024 * 1024) {
      console.log('Large file detected after reading, returning 413 error:', {
        filename,
        fileSize,
        fileId
      });

      return NextResponse.json({
        success: false,
        error: 'FUNCTION_PAYLOAD_TOO_LARGE',
        message: 'File is too large for direct upload. Use chunked upload.',
        fileSize,
        maxDirectUploadSize: 4 * 1024 * 1024,
        useChunkedUpload: true
      }, { status: 413 });
    }

    console.log('Small file, using direct upload:', {
      filename,
      fileSize,
      fileId
    });

    // Upload to Vercel Blob
    console.log('Attempting to upload to Vercel Blob:', {
      filename,
      fileSize,
      fileId
    });
    
    let blob;
    try {
      blob = await put(filename, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
      });
      console.log('Vercel Blob upload successful:', {
        url: blob.url,
        pathname: blob.pathname
      });
    } catch (blobError) {
      console.error('Vercel Blob upload failed:', blobError);
      throw new Error(`Blob upload failed: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`);
    }

    // Create database record
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: fileSize,
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    return NextResponse.json({
      success: true,
      id: fileId,
      url: `${baseUrl}/${fileId}`,
      filename,
      size: fileSize,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Handle large file uploads using streaming approach
async function handleLargeFileUpload(
  request: NextRequest, 
  filename: string | null, 
  clientIP: string
): Promise<NextResponse<UploadResponse>> {
  if (!filename) {
    return NextResponse.json(
      { success: false, error: 'Filename is required for large file uploads. Use ?f=filename.ext' }, 
      { status: 400 }
    );
  }

  const fileId = nanoid();
  console.log('Processing large file upload with streaming:', { fileId, filename });

  try {
    // Create database record first
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: '', // Will be updated after upload
      blobPathname: '', // Will be updated after upload
      size: 0, // Will be updated after upload
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || '',
    });

    // Process the request body as a stream to avoid loading everything into memory
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const maxTotalSize = 100 * 1024 * 1024; // 100MB limit

    // Read the request body as a stream
    const reader = request.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { success: false, error: 'No request body' },
        { status: 400 }
      );
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        totalSize += value.length;
        
        // Check file size limit
        if (totalSize > maxTotalSize) {
          return NextResponse.json(
            { success: false, error: 'File too large (max 100MB)' },
            { status: 413 }
          );
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log('Streaming read complete. Total size:', totalSize, 'bytes');

    // Combine chunks into a single buffer
    const fileBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      fileBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Upload to Vercel Blob
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('Large file blob upload successful:', {
      url: blob.url,
      pathname: blob.pathname,
      size: totalSize
    });

    // Update database record with actual file info
    await updateFileRecordFixed(fileId, {
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: totalSize,
    });

    // Calculate expiration date (3 days from now)
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Return the shortened URL format
    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');
    
    const shortenedUrl = `${baseUrl}/${fileId}`;

    return NextResponse.json({
      success: true,
      id: fileId,
      url: shortenedUrl,
      filename,
      size: totalSize,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Large file upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload large file' },
      { status: 500 }
    );
  }
} 
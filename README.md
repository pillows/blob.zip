# 🗂️ BlobZip

A simple, modern file hosting service that allows users to upload and download files temporarily using Vercel Blob storage. Features both a web interface and a CLI tool for seamless file sharing.

## ✨ Features

- **Web Interface**: Modern, responsive UI for drag-and-drop file uploads
- **CLI Tool**: Command-line interface for programmatic file operations
- **Temporary Storage**: Files stored using Vercel Blob with global CDN
- **File Management**: View, download, copy URLs, and delete files
- **Cross-platform**: Works on Windows, macOS, and Linux
- **No Database Required**: Stateless architecture using Vercel Blob

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A Vercel account (for Blob storage)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd blobzip
npm install
```

### 2. Environment Setup

1. Create a Vercel Blob storage in your [Vercel Dashboard](https://vercel.com/dashboard)
2. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```
3. Add your Vercel Blob token to `.env.local`:
   ```env
   BLOB_READ_WRITE_TOKEN=your_actual_token_here
   ```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the web interface.

## 🌐 Web Interface

The web interface provides:

- **Drag & Drop Upload**: Simply click to select or drag files to upload
- **File Management**: View all uploaded files with metadata
- **One-Click Actions**: Download, copy URL, or delete files
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Automatic refresh of file listings

### Supported File Types

All file types are supported with a 50MB size limit per file.

## 💻 CLI Usage

The BlobZip CLI is built with TypeScript and provides a powerful command-line interface for managing your files.

### Prerequisites

- Node.js 18+ with TypeScript support
- A running BlobZip server (local or deployed)

### Installation

#### Method 1: Global Installation (Recommended)
```bash
# Install dependencies first
npm install

# Install globally for system-wide access
npm install -g .

# Now you can use blobzip from anywhere
blobzip --help
```

#### Method 2: Local Development
```bash
# Install dependencies
npm install

# Run CLI commands directly
npm run cli -- <command>

# Or use tsx directly
npx tsx cli/index.ts <command>
```

#### Method 3: Using tsx (for development)
```bash
# Install tsx globally for TypeScript execution
npm install -g tsx

# Run the CLI directly
tsx cli/index.ts <command>
```

### Commands

#### 📤 Upload a File
Upload any file to your BlobZip server:

```bash
# Upload a file
blobzip upload ./document.pdf
blobzip upload ./image.jpg
blobzip upload ./archive.zip

# Upload with custom server URL
blobzip upload ./file.txt --url https://your-blobzip.vercel.app

# Example output:
# ✓ File uploaded successfully!
# Download URL: https://blob.vercel-storage.com/document-abc123.pdf
# File size: 2.5 MB
# Uploaded at: 12/13/2024, 3:45:22 PM
# 💡 Copy the URL above to share your file
```

#### 📋 List All Files
View all files stored on your server:

```bash
# List files from default server
blobzip list

# List files from custom server
blobzip list --url https://your-blobzip.vercel.app

# Example output:
# ✓ Found 3 files
# 
# 1. document.pdf
#    Size: 2.5 MB
#    Uploaded: 12/13/2024, 3:45:22 PM
#    URL: https://blob.vercel-storage.com/document-abc123.pdf
# 
# 2. image.jpg
#    Size: 1.2 MB
#    Uploaded: 12/13/2024, 2:30:15 PM
#    URL: https://blob.vercel-storage.com/image-def456.jpg
```

#### ⬇️ Download a File
Download files from any accessible URL:

```bash
# Download to current directory (auto-named)
blobzip download https://blob.vercel-storage.com/file-xyz.pdf

# Download with custom output name
blobzip download https://blob.vercel-storage.com/file-xyz.pdf ./my-document.pdf

# Example output:
# ✓ File downloaded successfully as my-document.pdf
# File size: 2.5 MB
```

#### 🗑️ Delete a File
Remove files from storage (requires pathname from list command):

```bash
# Delete a file (use pathname from 'blobzip list')
blobzip delete document-abc123.pdf

# Delete with custom server URL
blobzip delete document-abc123.pdf --url https://your-blobzip.vercel.app

# Example output:
# ✓ File deleted successfully!
```

#### ⚙️ Show Configuration
Display current CLI configuration:

```bash
blobzip config

# Example output:
# BlobZip CLI Configuration:
# Server URL: http://localhost:3000
# Version: 1.0.0
# 
# Environment Variables:
# BLOBZIP_URL: not set
```

### CLI Options

All commands support these global options:

- `--url, -u <url>`: Custom server URL (overrides default/env)
- `--help, -h`: Show command help
- `--version, -V`: Show version number

### Environment Variables

Configure the CLI behavior with these environment variables:

```bash
# Set custom server URL (applies to all commands)
export BLOBZIP_URL=https://your-blobzip.vercel.app

# For server-side configuration
export BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Examples

#### Complete Workflow Example
```bash
# 1. Check configuration
blobzip config

# 2. Upload a file
blobzip upload ./presentation.pptx
# Output: Download URL: https://blob.vercel-storage.com/presentation-xyz789.pptx

# 3. List all files to verify
blobzip list

# 4. Share the URL with someone, they can download it
blobzip download https://blob.vercel-storage.com/presentation-xyz789.pptx

# 5. Clean up when done
blobzip delete presentation-xyz789.pptx
```

#### Working with Different Servers
```bash
# Local development
blobzip upload ./file.txt --url http://localhost:3000

# Staging environment
blobzip upload ./file.txt --url https://staging-blobzip.vercel.app

# Production environment
export BLOBZIP_URL=https://blobzip.vercel.app
blobzip upload ./file.txt  # Uses environment variable
```

### TypeScript Development

The CLI is built with TypeScript and can be extended:

```bash
# Type checking
npm run type-check

# Build CLI for distribution
npm run build-cli

# Run in development mode
npm run cli -- upload ./test.txt
```

## 🚀 Deployment

### Deploy to Vercel

1. **Prepare for deployment:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   npx vercel
   ```

3. **Set Environment Variables:**
   In your Vercel dashboard, add:
   ```
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

4. **Update CLI Configuration:**
   ```bash
   export BLOBZIP_URL=https://your-app.vercel.app
   ```

### Deploy to Other Platforms

The app can be deployed to any platform that supports Node.js:

- **Netlify**: Use `npm run build` and deploy the `.next` folder
- **Railway**: Connect your GitHub repo and set environment variables
- **Heroku**: Add `heroku/nodejs` buildpack and set config vars

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   CLI Client    │    │   API Client    │
│   (React/Next)  │    │   (Node.js)     │    │   (curl/wget)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────┐
                    │  Next.js 15 App Router  │
                    │   /api/upload           │
                    │   /api/files            │
                    │   /api/download         │
                    └─────────────┬───────────┘
                                  │
                        ┌─────────▼─────────┐
                        │   Vercel Blob     │
                        │   Storage         │
                        └───────────────────┘
```

## 📁 Project Structure

```
blobzip/
├── cli/
│   └── index.js          # CLI tool
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.js  # File upload API
│   │   ├── files/
│   │   │   └── route.js  # File listing/delete API
│   │   └── download/
│   │       └── route.js  # File download API
│   ├── layout.js         # Root layout
│   └── page.js           # Main web interface
├── package.json          # Dependencies and scripts
├── next.config.js        # Next.js configuration
├── vercel.json           # Vercel deployment config
├── env.example           # Environment variables template
└── README.md            # This file
```

## 🔧 Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## 📝 API Reference

### Upload File
```http
POST /api/upload?filename=example.pdf
Content-Type: application/octet-stream
Body: <file-data>
```

### List Files
```http
GET /api/files
```

### Delete File
```http
DELETE /api/files
Content-Type: application/json
Body: {"pathname": "file-path"}
```

### Download File
```http
GET /api/download?url=<blob-url>
```

## 🔧 cURL Examples

For users who prefer command-line tools or want to integrate BlobZip into scripts, here are ready-to-use cURL commands:

### Upload a File
```bash
curl -X POST "http://localhost:3000/api/upload?filename=myfile.txt" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @./myfile.txt
```

### List All Files
```bash
curl -X GET "http://localhost:3000/api/files"
```

### Download a File
```bash
curl -X GET "http://localhost:3000/api/download?url=BLOB_URL" \
  -L -o downloaded-file.ext
```

### Delete a File
```bash
curl -X DELETE "http://localhost:3000/api/files" \
  -H "Content-Type: application/json" \
  -d '{"pathname": "file-pathname-here"}'
```

### cURL Tips
- Replace `myfile.txt` with your actual filename
- Replace `BLOB_URL` with the actual blob URL from upload response
- Replace `file-pathname-here` with the pathname from list response
- Use `-L` flag to follow redirects for downloads
- Add `| jq` to pretty-print JSON responses
- For production, replace `http://localhost:3000` with your deployed URL

### Example Workflow with cURL
```bash
# 1. Upload a file
curl -X POST "http://localhost:3000/api/upload?filename=document.pdf" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @./document.pdf

# Response: {"success":true,"url":"https://blob.vercel-storage.com/document-abc123.pdf",...}

# 2. List files to get pathname
curl -X GET "http://localhost:3000/api/files" | jq

# 3. Download the file
curl -X GET "http://localhost:3000/api/download?url=https://blob.vercel-storage.com/document-abc123.pdf" \
  -L -o downloaded-document.pdf

# 4. Delete the file when done
curl -X DELETE "http://localhost:3000/api/files" \
  -H "Content-Type: application/json" \
  -d '{"pathname": "document-abc123.pdf"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**"BLOB_READ_WRITE_TOKEN not found"**
- Make sure you've set the environment variable in `.env.local`
- Verify the token is correct from your Vercel dashboard

**"Network error: Unable to reach server"**
- Ensure the development server is running (`npm run dev`)
- Check the CLI URL with `blobzip config`

**File upload fails**
- Check file size (max 50MB)
- Verify your Vercel Blob storage quota

**CLI command not found**
- Install globally: `npm install -g .`
- Or use: `npm run cli -- <command>`
- For TypeScript: `npx tsx cli/index.ts <command>`

**TypeScript compilation errors**
- Run `npm run type-check` to verify types
- Ensure Node.js 18+ is installed
- Install tsx globally: `npm install -g tsx`

**CLI fails with "Cannot find module" errors**
- Run `npm install` to install dependencies
- For global installation, reinstall: `npm uninstall -g . && npm install -g .`

### Support

For issues and questions:
1. Check the [Issues](../../issues) page
2. Create a new issue with details about your problem
3. Include error messages and system information

## 🌟 Acknowledgments

- [Vercel Blob](https://vercel.com/storage/blob) for reliable file storage
- [Next.js](https://nextjs.org) for the web framework
- [Commander.js](https://github.com/tj/commander.js) for CLI interface
- [Chalk](https://github.com/chalk/chalk) for terminal styling 
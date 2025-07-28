// Tests for validation utilities

describe('Validation Utilities', () => {
  describe('File upload validation', () => {
    const validateFileUpload = (filename: string, fileSize: number) => {
      const errors: string[] = []
      const maxSize = 50 * 1024 * 1024 // 50MB

      if (!filename || filename.trim() === '') {
        errors.push('Filename is required')
      }

      if (fileSize <= 0) {
        errors.push('File size must be greater than 0')
      }

      if (fileSize > maxSize) {
        errors.push(`File size must be less than ${maxSize} bytes`)
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    }

    it('should validate valid files', () => {
      const result = validateFileUpload('test.txt', 1024)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty filename', () => {
      const result = validateFileUpload('', 1024)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Filename is required')
    })

    it('should reject zero file size', () => {
      const result = validateFileUpload('test.txt', 0)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size must be greater than 0')
    })

    it('should reject oversized files', () => {
      const result = validateFileUpload('test.txt', 100 * 1024 * 1024) // 100MB
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size must be less than 52428800 bytes')
    })

    it('should handle whitespace-only filename', () => {
      const result = validateFileUpload('   ', 1024)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Filename is required')
    })
  })

  describe('URL validation', () => {
    const isValidUrl = (urlString: string): boolean => {
      try {
        new URL(urlString)
        return true
      } catch (error) {
        return false
      }
    }

    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
      expect(isValidUrl('https://blob.vercel-storage.com/file-abc123.txt')).toBe(true)
      expect(isValidUrl('ftp://files.example.com/path')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('invalid-url')).toBe(false)
      expect(isValidUrl('not a url at all')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('http://')).toBe(false)
      expect(isValidUrl('://missing-protocol')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidUrl('file:///local/path')).toBe(true)
      expect(isValidUrl('data:text/plain;base64,SGVsbG8=')).toBe(true)
    })
  })

  describe('Filename sanitization', () => {
    const sanitizeFilename = (filename: string): string => {
      return filename
        .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    }

    it('should sanitize problematic characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file_________.txt')
      expect(sanitizeFilename('file with spaces.txt')).toBe('file_with_spaces.txt')
      expect(sanitizeFilename('file___multiple___underscores.txt')).toBe('file_multiple_underscores.txt')
    })

    it('should handle normal filenames', () => {
      expect(sanitizeFilename('normal-file.txt')).toBe('normal-file.txt')
      expect(sanitizeFilename('file123.pdf')).toBe('file123.pdf')
      expect(sanitizeFilename('image_001.jpg')).toBe('image_001.jpg')
    })

    it('should handle edge cases', () => {
      expect(sanitizeFilename('___leading_trailing___')).toBe('leading_trailing')
      expect(sanitizeFilename('')).toBe('')
      expect(sanitizeFilename('   ')).toBe('')
    })
  })

  describe('Content type detection', () => {
    const getContentType = (filename: string): string => {
      const extension = filename.split('.').pop()?.toLowerCase()
      
      const mimeTypes: Record<string, string> = {
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'json': 'application/json',
        'xml': 'application/xml',
        'csv': 'text/csv',
        'zip': 'application/zip',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
      }

      return mimeTypes[extension || ''] || 'application/octet-stream'
    }

    it('should detect common file types', () => {
      expect(getContentType('document.pdf')).toBe('application/pdf')
      expect(getContentType('image.jpg')).toBe('image/jpeg')
      expect(getContentType('image.jpeg')).toBe('image/jpeg')
      expect(getContentType('image.png')).toBe('image/png')
      expect(getContentType('notes.txt')).toBe('text/plain')
      expect(getContentType('data.json')).toBe('application/json')
    })

    it('should handle case insensitive extensions', () => {
      expect(getContentType('IMAGE.PNG')).toBe('image/png')
      expect(getContentType('Document.PDF')).toBe('application/pdf')
      expect(getContentType('FILE.TXT')).toBe('text/plain')
    })

    it('should default to octet-stream for unknown types', () => {
      expect(getContentType('unknown.xyz')).toBe('application/octet-stream')
      expect(getContentType('no-extension')).toBe('application/octet-stream')
      expect(getContentType('')).toBe('application/octet-stream')
      expect(getContentType('file.')).toBe('application/octet-stream')
    })

    it('should handle files with multiple dots', () => {
      expect(getContentType('archive.tar.gz')).toBe('application/gzip')
      expect(getContentType('backup.2024.01.01.zip')).toBe('application/zip')
    })
  })

  describe('API response validation', () => {
    const validateApiResponse = (response: any) => {
      const errors: string[] = []

      if (typeof response !== 'object' || response === null) {
        errors.push('Response must be an object')
        return { isValid: false, errors }
      }

      if (typeof response.success !== 'boolean') {
        errors.push('Response must include success boolean')
      }

      if (response.success) {
        if (!response.url || typeof response.url !== 'string') {
          errors.push('Successful response must include valid URL')
        }
        if (!response.pathname || typeof response.pathname !== 'string') {
          errors.push('Successful response must include pathname')
        }
      } else {
        if (!response.error || typeof response.error !== 'string') {
          errors.push('Error response must include error message')
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    }

    it('should validate successful API responses', () => {
      const response = {
        success: true,
        url: 'https://blob.vercel-storage.com/file-abc123.txt',
        pathname: 'file-abc123.txt',
        uploadedAt: '2024-01-01T10:00:00.000Z',
      }

      const result = validateApiResponse(response)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate error API responses', () => {
      const response = {
        success: false,
        error: 'File upload failed',
        details: 'File too large',
      }

      const result = validateApiResponse(response)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid responses', () => {
      const result1 = validateApiResponse(null)
      expect(result1.isValid).toBe(false)
      
      const result2 = validateApiResponse({ success: true }) // Missing required fields
      expect(result2.isValid).toBe(false)
      expect(result2.errors).toContain('Successful response must include valid URL')

      const result3 = validateApiResponse({ success: false }) // Missing error
      expect(result3.isValid).toBe(false)
      expect(result3.errors).toContain('Error response must include error message')
    })
  })
}) 
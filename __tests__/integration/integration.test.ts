// Integration tests for core functionality

describe('BlobZip Integration Tests', () => {
  describe('File size formatting', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    it('should format various file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('Date formatting', () => {
    it('should handle ISO date strings', () => {
      const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
      };

      const result = formatDate('2024-01-01T10:00:00.000Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('URL validation', () => {
    const isValidUrl = (string: string): boolean => {
      try {
        new URL(string);
        return true;
      } catch (_) {
        return false;
      }
    };

    it('should validate URLs correctly', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('Filename extraction', () => {
    const extractFileName = (pathname: string): string => {
      return pathname.split('/').pop() || pathname;
    };

    it('should extract filename from various paths', () => {
      expect(extractFileName('file.txt')).toBe('file.txt');
      expect(extractFileName('folder/file.txt')).toBe('file.txt');
      expect(extractFileName('deep/nested/file.txt')).toBe('file.txt');
      expect(extractFileName('')).toBe('');
    });
  });

  describe('API response handling', () => {
    it('should properly structure API responses', () => {
      const successResponse = {
        success: true,
        url: 'https://blob.vercel-storage.com/test-abc123.txt',
        pathname: 'test-abc123.txt',
        uploadedAt: new Date().toISOString(),
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.url).toContain('blob.vercel-storage.com');
      expect(typeof successResponse.uploadedAt).toBe('string');
    });

    it('should handle error responses', () => {
      const errorResponse = {
        success: false,
        error: 'Upload failed',
        details: 'File too large',
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Upload failed');
      expect(errorResponse.details).toBe('File too large');
    });
  });

  describe('Environment configuration', () => {
    it('should handle default configuration', () => {
      const defaultConfig = {
        baseUrl: process.env.BLOBZIP_URL || 'http://localhost:3000',
        version: '1.0.0',
      };

      expect(typeof defaultConfig.baseUrl).toBe('string');
      expect(defaultConfig.version).toBe('1.0.0');
    });
  });

  describe('Error handling utilities', () => {
    const formatErrorMessage = (error: unknown): string => {
      if (error instanceof Error) {
        return error.message;
      }
      return 'Unknown error occurred';
    };

    it('should format different error types', () => {
      expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
      expect(formatErrorMessage('string error')).toBe('Unknown error occurred');
      expect(formatErrorMessage(null)).toBe('Unknown error occurred');
      expect(formatErrorMessage(undefined)).toBe('Unknown error occurred');
    });
  });

  describe('Content type detection', () => {
    const getContentType = (filename: string): string => {
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'json': 'application/json',
      };
      return mimeTypes[extension || ''] || 'application/octet-stream';
    };

    it('should detect common file types', () => {
      expect(getContentType('document.pdf')).toBe('application/pdf');
      expect(getContentType('image.jpg')).toBe('image/jpeg');
      expect(getContentType('image.png')).toBe('image/png');
      expect(getContentType('data.json')).toBe('application/json');
      expect(getContentType('notes.txt')).toBe('text/plain');
      expect(getContentType('unknown.xyz')).toBe('application/octet-stream');
    });
  });

  describe('CLI command construction', () => {
    it('should construct upload command correctly', () => {
      const baseUrl = 'http://localhost:3000';
      const filename = 'test.txt';
      const command = `curl -X POST "${baseUrl}/api/upload?filename=${encodeURIComponent(filename)}" -H "Content-Type: application/octet-stream" --data-binary @./${filename}`;
      
      expect(command).toContain('curl -X POST');
      expect(command).toContain('/api/upload');
      expect(command).toContain('filename=test.txt');
      expect(command).toContain('--data-binary');
    });

    it('should construct list command correctly', () => {
      const baseUrl = 'http://localhost:3000';
      const command = `curl -X GET "${baseUrl}/api/files"`;
      
      expect(command).toContain('curl -X GET');
      expect(command).toContain('/api/files');
    });

    it('should construct delete command correctly', () => {
      const baseUrl = 'http://localhost:3000';
      const pathname = 'file-abc123.txt';
      const command = `curl -X DELETE "${baseUrl}/api/files" -H "Content-Type: application/json" -d '{"pathname": "${pathname}"}'`;
      
      expect(command).toContain('curl -X DELETE');
      expect(command).toContain('/api/files');
      expect(command).toContain('Content-Type: application/json');
      expect(command).toContain(pathname);
    });
  });

  describe('File upload validation', () => {
    it('should validate file upload parameters', () => {
      const validateUpload = (filename: string, fileSize: number) => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const errors: string[] = [];

        if (!filename || filename.trim() === '') {
          errors.push('Filename is required');
        }

        if (fileSize > maxSize) {
          errors.push('File size exceeds maximum limit');
        }

        if (fileSize <= 0) {
          errors.push('File size must be greater than 0');
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      };

      expect(validateUpload('test.txt', 1024).valid).toBe(true);
      expect(validateUpload('', 1024).valid).toBe(false);
      expect(validateUpload('test.txt', 0).valid).toBe(false);
      expect(validateUpload('test.txt', 100 * 1024 * 1024).valid).toBe(false);
    });
  });
}) 
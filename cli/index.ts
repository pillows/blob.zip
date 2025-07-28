#!/usr/bin/env tsx

import { Command } from 'commander';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

const program = new Command();

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000';
const BASE_URL = process.env.BLOBZIP_URL || DEFAULT_BASE_URL;

// Types
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

interface CommandOptions {
  url: string;
}

program
  .name('blobzip')
  .description('CLI tool for BlobZip file hosting service')
  .version('1.0.0');

// Upload command
program
  .command('upload <file>')
  .description('Upload a file to BlobZip')
  .option('-u, --url <url>', 'Custom server URL', BASE_URL)
  .action(async (filePath: string, options: CommandOptions) => {
    const spinner: Ora = ora('Uploading file...').start();
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        spinner.fail(chalk.red(`File not found: ${filePath}`));
        process.exit(1);
      }

      const fileName = path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);
      const fileStats = fs.statSync(filePath);

      spinner.text = `Uploading ${fileName} (${formatFileSize(fileStats.size)})...`;

      const response: AxiosResponse<ApiResponse> = await axios.post(
        `${options.url}?f=${encodeURIComponent(fileName)}`,
        fileStream,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          maxContentLength: 50 * 1024 * 1024, // 50MB
          maxBodyLength: 50 * 1024 * 1024,
        }
      );

      if (response.data.success) {
        spinner.succeed(chalk.green('File uploaded successfully!'));
        console.log(chalk.cyan('Download URL:'), response.data.url);
        if (response.data.size) {
          console.log(chalk.cyan('File size:'), formatFileSize(response.data.size));
        }
        if (response.data.uploadedAt) {
          console.log(chalk.cyan('Uploaded at:'), new Date(response.data.uploadedAt).toLocaleString());
        }
        
        // Note: URL can be manually copied from the output above
        console.log(chalk.gray('💡 Copy the URL above to share your file'));
      } else {
        spinner.fail(chalk.red('Upload failed'));
        console.error(chalk.red(response.data.error));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Upload failed'));
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(chalk.red(`Server error (${error.response.status}):`, error.response.data?.error || error.response.statusText));
        } else if (error.request) {
          console.error(chalk.red('Network error: Unable to reach server'));
          console.error(chalk.gray(`Make sure the server is running at ${options.url}`));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      } else {
        console.error(chalk.red('Error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List all uploaded files')
  .option('-u, --url <url>', 'Custom server URL', BASE_URL)
  .action(async (options: CommandOptions) => {
    const spinner: Ora = ora('Fetching files...').start();
    
    try {
      const response: AxiosResponse<ApiResponse> = await axios.get(`${options.url}/api/files`);
      
      if (response.data.success) {
        spinner.succeed(chalk.green(`Found ${response.data.count || 0} files`));
        
        if (!response.data.files || response.data.files.length === 0) {
          console.log(chalk.gray('No files found'));
          return;
        }

        console.log('');
        response.data.files.forEach((file: FileData, index: number) => {
          const fileName = file.pathname.split('/').pop();
          const uploadDate = new Date(file.uploadedAt).toLocaleString();
          
          console.log(chalk.cyan(`${index + 1}. ${fileName}`));
          console.log(chalk.gray(`   Size: ${formatFileSize(file.size)}`));
          console.log(chalk.gray(`   Uploaded: ${uploadDate}`));
          console.log(chalk.gray(`   URL: ${file.url}`));
          console.log('');
        });
      } else {
        spinner.fail(chalk.red('Failed to fetch files'));
        console.error(chalk.red(response.data.error));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch files'));
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(chalk.red(`Server error (${error.response.status}):`, error.response.data?.error || error.response.statusText));
        } else if (error.request) {
          console.error(chalk.red('Network error: Unable to reach server'));
          console.error(chalk.gray(`Make sure the server is running at ${options.url}`));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      } else {
        console.error(chalk.red('Error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Download command
program
  .command('download <url> [output]')
  .description('Download a file from BlobZip')
  .action(async (fileUrl: string, outputPath?: string) => {
    const spinner: Ora = ora('Downloading file...').start();
    
    try {
      // Extract filename from URL if no output path provided
      if (!outputPath) {
        const urlParts = fileUrl.split('/');
        outputPath = urlParts[urlParts.length - 1] || 'downloaded-file';
      }

      const response = await axios.get(fileUrl, {
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      const totalSize = parseInt(response.headers['content-length'] || '0');
      let downloadedSize = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          spinner.text = `Downloading... ${progress}% (${formatFileSize(downloadedSize)}/${formatFileSize(totalSize)})`;
        } else {
          spinner.text = `Downloading... ${formatFileSize(downloadedSize)}`;
        }
      });

      writer.on('finish', () => {
        spinner.succeed(chalk.green(`File downloaded successfully as ${outputPath}`));
        if (totalSize > 0) {
          console.log(chalk.cyan('File size:'), formatFileSize(totalSize));
        }
      });

      writer.on('error', (error: Error) => {
        spinner.fail(chalk.red('Download failed'));
        console.error(chalk.red('Write error:'), error.message);
        process.exit(1);
      });

    } catch (error) {
      spinner.fail(chalk.red('Download failed'));
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(chalk.red(`Server error (${error.response.status}):`, error.response.statusText));
        } else if (error.request) {
          console.error(chalk.red('Network error: Unable to reach server'));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      } else {
        console.error(chalk.red('Error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete <pathname>')
  .description('Delete a file from BlobZip (requires pathname from list command)')
  .option('-u, --url <url>', 'Custom server URL', BASE_URL)
  .action(async (pathname: string, options: CommandOptions) => {
    const spinner: Ora = ora('Deleting file...').start();
    
    try {
      const response: AxiosResponse<ApiResponse> = await axios.delete(`${options.url}/api/files`, {
        data: { pathname },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        spinner.succeed(chalk.green('File deleted successfully!'));
      } else {
        spinner.fail(chalk.red('Delete failed'));
        console.error(chalk.red(response.data.error));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Delete failed'));
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(chalk.red(`Server error (${error.response.status}):`, error.response.data?.error || error.response.statusText));
        } else if (error.request) {
          console.error(chalk.red('Network error: Unable to reach server'));
          console.error(chalk.gray(`Make sure the server is running at ${options.url}`));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      } else {
        console.error(chalk.red('Error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.cyan('BlobZip CLI Configuration:'));
    console.log(chalk.gray('Server URL:'), BASE_URL);
    console.log(chalk.gray('Version:'), program.version());
    console.log('');
    console.log(chalk.cyan('Environment Variables:'));
    console.log(chalk.gray('BLOBZIP_URL:'), process.env.BLOBZIP_URL || 'not set');
  });

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Global error handler
process.on('unhandledRejection', (error: Error) => {
  console.error(chalk.red('Unhandled error:'), error.message);
  process.exit(1);
});

program.parse(); 
#!/usr/bin/env node

// Simple test script to test chunked upload functionality
const fs = require('fs');
const path = require('path');

async function testChunkedUpload() {
  const baseUrl = process.env.BLOBZIP_URL || 'http://localhost:3000';
  
  // Create a test file larger than 4MB
  const testFileName = 'large-test-file.txt';
  const testContent = 'A'.repeat(5 * 1024 * 1024); // 5MB of 'A' characters
  
  console.log('Creating test file:', testFileName, 'Size:', testContent.length, 'bytes');
  fs.writeFileSync(testFileName, testContent);
  
  try {
    // Step 1: Create upload record
    console.log('Step 1: Creating upload record...');
    const createResponse = await fetch(`${baseUrl}/api/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: testFileName,
      }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create upload record: ${createResponse.status}`);
    }
    
    const { fileId } = await createResponse.json();
    console.log('Upload record created with fileId:', fileId);
    
    // Step 2: Upload in chunks
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks
    const totalChunks = Math.ceil(testContent.length / chunkSize);
    
    console.log(`Step 2: Uploading ${totalChunks} chunks...`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, testContent.length);
      const chunk = testContent.slice(start, end);
      const isLastChunk = i === totalChunks - 1;
      
      console.log(`Uploading chunk ${i + 1}/${totalChunks} (${chunk.length} bytes)`);
      
      const chunkResponse = await fetch(`${baseUrl}/api/upload-stream?fileId=${fileId}&filename=${encodeURIComponent(testFileName)}&chunkIndex=${i}&isLastChunk=${isLastChunk}`, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}: ${chunkResponse.status}`);
      }
      
      const chunkResult = await chunkResponse.json();
      console.log(`Chunk ${i + 1} result:`, chunkResult);
      
      if (isLastChunk && chunkResult.success) {
        console.log('Upload completed successfully!');
        console.log('File URL:', chunkResult.url);
        console.log('File ID:', chunkResult.id);
        console.log('File size:', chunkResult.size);
        break;
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up test file
    if (fs.existsSync(testFileName)) {
      fs.unlinkSync(testFileName);
      console.log('Test file cleaned up');
    }
  }
}

// Run the test
testChunkedUpload();
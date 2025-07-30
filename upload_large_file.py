#!/usr/bin/env python3
"""
Script to upload large files to BlobZip using chunked upload
Usage: python3 upload_large_file.py <file_path> [base_url]
"""

import sys
import os
import requests
import json
from pathlib import Path

def upload_large_file(file_path, base_url="https://blob.zip"):
    """Upload a large file using chunked upload"""
    
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        return False
    
    filename = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    chunk_size = 4 * 1024 * 1024  # 4MB chunks
    
    print(f"Uploading file: {filename}")
    print(f"File size: {file_size:,} bytes")
    print(f"Chunk size: {chunk_size:,} bytes")
    
    # Calculate number of chunks
    total_chunks = (file_size + chunk_size - 1) // chunk_size
    print(f"Total chunks: {total_chunks}")
    
    # Initialize upload session
    print("Initializing upload session...")
    init_url = f"{base_url}/api/upload-chunked"
    init_params = {
        'action': 'init',
        'filename': filename,
        'totalSize': file_size,
        'chunkSize': chunk_size
    }
    
    try:
        init_response = requests.post(init_url, params=init_params)
        init_response.raise_for_status()
        init_data = init_response.json()
        
        if not init_data.get('success'):
            print(f"Error: Failed to initialize upload session: {init_data.get('error')}")
            return False
        
        file_id = init_data['fileId']
        print(f"Upload session initialized with ID: {file_id}")
        
    except requests.RequestException as e:
        print(f"Error: Failed to initialize upload session: {e}")
        return False
    
    # Upload chunks
    chunk_url = f"{base_url}/api/upload-chunked"
    
    with open(file_path, 'rb') as f:
        for i in range(total_chunks):
            offset = i * chunk_size
            chunk_data = f.read(chunk_size)
            
            print(f"Uploading chunk {i+1}/{total_chunks} (offset: {offset:,})...")
            
            chunk_params = {
                'action': 'chunk',
                'fileId': file_id,
                'chunkIndex': i
            }
            
            try:
                chunk_response = requests.post(
                    chunk_url,
                    params=chunk_params,
                    data=chunk_data,
                    headers={'Content-Type': 'application/octet-stream'}
                )
                chunk_response.raise_for_status()
                chunk_data_response = chunk_response.json()
                
                if not chunk_data_response.get('success'):
                    print(f"Error: Failed to upload chunk {i+1}: {chunk_data_response.get('error')}")
                    return False
                
                # Check if this was the final chunk
                if 'url' in chunk_data_response:
                    print("Upload completed successfully!")
                    print(f"Download URL: {chunk_data_response['url']}")
                    print(f"File ID: {chunk_data_response['id']}")
                    print(f"Expires: {chunk_data_response['expiresAt']}")
                    return True
                    
            except requests.RequestException as e:
                print(f"Error: Failed to upload chunk {i+1}: {e}")
                return False
    
    print("Error: Upload completed but no final response received")
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 upload_large_file.py <file_path> [base_url]")
        print("Example: python3 upload_large_file.py large-file.zip https://blob.zip")
        sys.exit(1)
    
    file_path = sys.argv[1]
    base_url = sys.argv[2] if len(sys.argv) > 2 else "https://blob.zip"
    
    success = upload_large_file(file_path, base_url)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
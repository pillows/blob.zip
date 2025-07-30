#!/bin/bash

# Script to upload large files to BlobZip using chunked upload
# Usage: ./upload-large-file.sh <file_path> [base_url]

if [ $# -lt 1 ]; then
    echo "Usage: $0 <file_path> [base_url]"
    echo "Example: $0 large-file.zip https://blob.zip"
    exit 1
fi

FILE_PATH="$1"
BASE_URL="${2:-https://blob.zip}"
CHUNK_SIZE=4194304  # 4MB chunks

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' not found"
    exit 1
fi

FILENAME=$(basename "$FILE_PATH")
FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)

if [ -z "$FILE_SIZE" ]; then
    echo "Error: Could not determine file size"
    exit 1
fi

echo "Uploading file: $FILENAME"
echo "File size: $FILE_SIZE bytes"
echo "Chunk size: $CHUNK_SIZE bytes"

# Calculate number of chunks
TOTAL_CHUNKS=$(( (FILE_SIZE + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo "Total chunks: $TOTAL_CHUNKS"

# Initialize upload session
echo "Initializing upload session..."
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/upload-chunked?action=init&filename=$(echo "$FILENAME" | sed 's/ /%20/g')&totalSize=$FILE_SIZE&chunkSize=$CHUNK_SIZE")

if [ $? -ne 0 ]; then
    echo "Error: Failed to initialize upload session"
    exit 1
fi

FILE_ID=$(echo "$INIT_RESPONSE" | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$FILE_ID" ]; then
    echo "Error: Failed to get file ID from response: $INIT_RESPONSE"
    exit 1
fi

echo "Upload session initialized with ID: $FILE_ID"

# Upload chunks
for ((i=0; i<TOTAL_CHUNKS; i++)); do
    OFFSET=$((i * CHUNK_SIZE))
    echo "Uploading chunk $((i+1))/$TOTAL_CHUNKS (offset: $OFFSET)..."
    
    # Extract chunk and upload
    dd if="$FILE_PATH" bs=$CHUNK_SIZE skip=$i count=1 2>/dev/null | \
    curl -s -X POST \
        -H "Content-Type: application/octet-stream" \
        --data-binary @- \
        "$BASE_URL/api/upload-chunked?action=chunk&fileId=$FILE_ID&chunkIndex=$i"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to upload chunk $((i+1))"
        exit 1
    fi
done

echo "Upload completed! Check the final response for the download URL."
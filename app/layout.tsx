import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'BlobZip - Temporary File Hosting',
  description: 'Upload and share files temporarily using Vercel Blob storage',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 
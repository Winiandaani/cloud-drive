import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cloud Drive — Store, Share, and Access Your Files Anywhere',
  description: 'A simple, secure cloud storage app to upload, organize, and share your files from any device.',
  openGraph: {
    title: 'Cloud Drive',
    description: 'Store, share, and access your files anywhere.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
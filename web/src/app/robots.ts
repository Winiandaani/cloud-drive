import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/signup'],
      disallow: ['/drive'],
    },
    sitemap: 'https://cloud-drive-theta.vercel.app/sitemap.xml',
  };
}
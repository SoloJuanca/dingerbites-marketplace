import { getCategories } from '../lib/firebaseProducts';
import { db } from '../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const [categories, productsSnapshot] = await Promise.all([
    getCategories(),
    db.collection('products').get()
  ]);

  const staticRoutes = ['/', '/catalog', '/services', '/contact', '/privacidad', '/terminos'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7
  }));

  const categoryRoutes = categories
    .filter((category) => category?.slug && !category?.parent_id)
    .map((category) => ({
      url: `${baseUrl}/catalog/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8
    }));

  const productRoutes = productsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((product) => product?.is_active !== false && product?.slug)
    .map((product) => ({
      url: `${baseUrl}/catalog/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.6
    }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

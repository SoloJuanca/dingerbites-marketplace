import { getCategories } from '../lib/firebaseProducts';
import { getTypesenseConfig, getTypesenseServerClient, isTypesenseConfigured } from '../lib/typesenseServer';

export const revalidate = 21600; // 6h

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const categories = await getCategories();

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

  const productRoutes = [];
  const MAX_PRODUCT_URLS = 5000;

  // IMPORTANT: Avoid Firestore full-scans for sitemap generation.
  // Prefer Typesense (no Firestore reads) and cap to keep response bounded.
  if (isTypesenseConfigured() && getTypesenseConfig().enableSearch !== false) {
    try {
      const client = getTypesenseServerClient();
      const { collectionName } = getTypesenseConfig();
      const perPage = 250;
      let page = 1;

      while (productRoutes.length < MAX_PRODUCT_URLS) {
        const result = await client.collections(collectionName).documents().search({
          q: '*',
          query_by: 'name',
          page,
          per_page: perPage,
          filter_by: 'is_active:=true',
          sort_by: 'updated_at_ts:desc'
        });

        const hits = Array.isArray(result?.hits) ? result.hits : [];
        if (hits.length === 0) break;

        hits.forEach((hit) => {
          const doc = hit?.document || {};
          if (!doc?.slug) return;
          if (productRoutes.length >= MAX_PRODUCT_URLS) return;
          productRoutes.push({
            url: `${baseUrl}/catalog/${doc.slug}`,
            lastModified: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            changeFrequency: 'daily',
            priority: 0.6
          });
        });

        page += 1;
      }
    } catch (error) {
      console.error('Sitemap Typesense lookup failed; omitting product URLs to avoid Firestore full-scan.', error);
    }
  } else {
    // If Typesense isn't configured, omit product URLs rather than doing a Firestore full scan.
    // Category + static routes still cover most SEO without exploding read costs.
    console.warn('Typesense not configured; sitemap will omit product URLs to avoid costly Firestore full scans.');
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

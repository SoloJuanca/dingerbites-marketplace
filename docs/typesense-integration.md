# Typesense + Firebase Integration Guide

## 1) Configure Typesense Cloud

1. Create a Typesense Cloud cluster.
2. Copy host, protocol, port and API keys.
3. Add env vars (local + production):
   - `TYPESENSE_ENABLE_SEARCH=true`
   - `TYPESENSE_HOST`
   - `TYPESENSE_PORT`
   - `TYPESENSE_PROTOCOL`
   - `TYPESENSE_ADMIN_API_KEY`
   - `TYPESENSE_SEARCH_API_KEY`
   - `TYPESENSE_COLLECTION_PRODUCTS=products_v1`

## 2) Initialize the search collection

1. Run `npm run typesense:init`.
2. This command creates the `products_v1` collection with sortable and faceted fields.

**Typesense rule:** `default_sorting_field` (`created_at_ts`) **must not** be declared as `optional`. If you create the collection in the Cloud UI, use `"created_at_ts": { "type": "int64", "sort": true }` without `"optional": true`. Every indexed document must include `created_at_ts` (the app uses `0` when there is no `created_at`).

## 3) Backfill existing products

1. Put Firebase + Typesense vars in **`.env`** or **`.env.local`** at the project root (same as Next.js). CLI scripts load both files automatically via `dotenv`.
2. Run `npm run typesense:backfill` from the project root.
3. Validate indexed document count in Typesense dashboard.

If you still see “Firebase credentials are missing”, check that **either** `FIREBASE_SERVICE_ACCOUNT_KEY` **or** the trio `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` is set (no extra quotes breaking the JSON on `FIREBASE_SERVICE_ACCOUNT_KEY`).

## 4) Keep index in sync in real time

1. Deploy Cloud Functions in `functions/index.js`.
2. Required trigger env vars:
   - `TYPESENSE_HOST`
   - `TYPESENSE_PORT`
   - `TYPESENSE_PROTOCOL`
   - `TYPESENSE_ADMIN_API_KEY`
   - `TYPESENSE_COLLECTION_PRODUCTS`
3. Triggers:
   - `searchProductCreated`
   - `searchProductUpdated`
   - `searchProductDeleted`

## 5) Search APIs

- `GET /api/search/products`
  - Supports `q`, `category`, `subcategory`, `manufacturerBrand`, `franchiseBrand`, `brand`, `condition`, `minPrice`, `maxPrice`, `sortBy`, `page`, `limit`.
- `GET /api/search/suggestions?q=...`
  - Returns instant suggestions for search bar.
- `POST /api/admin/search/reindex`
  - Protected endpoint for full reindex.

## 6) UI integration

- SearchBar now uses instant suggestions and `q` parameter.
- Catalog and ProductGrid consume Typesense-backed endpoints.
- Admin products endpoint uses Typesense for text/status search and Firestore fallback.

## 7) SSR and SEO

- `/catalog` now server-renders filters and first result page.
- Category listings share `/catalog/[slug]` with product detail (resolved server-side: product first, then parent category).
- SEO:
  - Dynamic metadata per category.
  - `src/app/sitemap.js` includes categories and products.
  - `src/app/robots.js` defines crawl/index policy.
  - Canonical strategy to keep `/catalog` and category pages indexable.

## 8) Observability and safety

- Search service falls back to Firestore if Typesense is unavailable.
- Admin API has protected reindex endpoint.
- Unit test for mapper in `src/lib/__tests__/typesenseMapper.test.mjs`.

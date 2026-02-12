# Firebase Setup

This project now includes Firebase integration for Firestore and Firebase Storage.

## 1) Install dependencies

Dependencies were added in `package.json`:

- `firebase-admin`

## 2) Create a Firebase service account

1. Open the Firebase Console.
2. Go to **Project settings** > **Service accounts**.
3. Generate a new private key.
4. Store the JSON securely.

## 3) Configure environment variables

Add these variables to `.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

Alternative (single variable):

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}'
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

## 4) Firestore collections

The migrated routes use these collections:

- `product_categories`
- `product_brands`
- `products` (only for delete safety checks)

## 5) Migrated API routes

- `src/app/api/categories/route.js`
- `src/app/api/brands/route.js`
- `src/app/api/brands/[id]/route.js`
- `src/app/api/admin/categories/route.js`
- `src/app/api/admin/categories/[id]/route.js`
- `src/app/api/admin/brands/route.js`
- `src/app/api/admin/brands/[id]/route.js`
- `src/app/api/admin/upload/route.js`

## 6) Notes

- The rest of the API routes still use PostgreSQL (`src/lib/database.js`) and should be migrated in a second phase.
- Uploads now use Firebase Storage through `src/lib/blobStorage.js`.

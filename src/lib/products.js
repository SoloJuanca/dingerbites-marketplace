/**
 * Product catalog and helpers.
 * Uses Firestore (firebaseProducts); database.js is no longer used.
 */
export {
  getProducts,
  getCategories,
  getBrands,
  getPriceRange,
  getProductBySlug
} from './firebaseProducts';

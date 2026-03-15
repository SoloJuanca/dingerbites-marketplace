import { db } from './firebaseAdmin';
import { sendBackInStockNotification } from './emailService';

const STOCK_ALERTS_COLLECTION = 'stock_alerts';
const USERS_COLLECTION = 'users';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getProductImage(product) {
  if (product?.image) return product.image;
  if (!Array.isArray(product?.images) || product.images.length === 0) return '';
  const first = product.images[0];
  if (typeof first === 'string') return first;
  return first?.url || '';
}

export async function notifyBackInStockSubscribers({
  productId,
  product,
  previousStock,
  newStock
}) {
  const wasOutOfStock = toNumber(previousStock, 0) <= 0;
  const isInStockNow = toNumber(newStock, 0) > 0;

  if (!wasOutOfStock || !isInStockNow) {
    return {
      notified: 0,
      skipped: 0,
      failed: 0,
      reason: 'No restock transition'
    };
  }

  const reminderSnapshot = await db
    .collection(STOCK_ALERTS_COLLECTION)
    .where('product_id', '==', String(productId))
    .where('is_active', '==', true)
    .get();

  if (reminderSnapshot.empty) {
    return {
      notified: 0,
      skipped: 0,
      failed: 0,
      reason: 'No active reminders'
    };
  }

  const reminders = reminderSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const uniqueUserIds = [...new Set(reminders.map((item) => String(item.user_id)).filter(Boolean))];

  const userDocs = await Promise.all(
    uniqueUserIds.map((userId) => db.collection(USERS_COLLECTION).doc(userId).get())
  );
  const usersById = new Map(
    userDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );

  const productPayload = {
    id: String(productId),
    slug: product?.slug || '',
    name: product?.name || 'Producto',
    image: getProductImage(product),
    price: product?.price ?? null
  };

  let notified = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const user = usersById.get(String(reminder.user_id));
    const email = user?.email ? String(user.email).trim() : '';
    if (!user || !email) {
      skipped += 1;
      continue;
    }

    const result = await sendBackInStockNotification({
      email,
      name: user.first_name || 'Cliente',
      product: productPayload
    });

    if (result.success) {
      notified += 1;
    } else {
      failed += 1;
      console.error('Back-in-stock email failed:', {
        userId: user.id,
        productId: productId,
        error: result.error
      });
    }
  }

  return { notified, skipped, failed };
}

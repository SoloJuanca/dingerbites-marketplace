import { db } from './firebaseAdmin';

const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeNotification(doc) {
  return {
    id: doc.id,
    ...doc.data()
  };
}

async function getAdminUserIds() {
  const snapshot = await db.collection(USERS_COLLECTION).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((user) =>
      user.is_active !== false &&
      (user.role === 'admin' || user.role === 'superadmin' || user.is_admin === true)
    )
    .map((user) => String(user.id));
}

export async function createNotification(payload) {
  const userId = String(payload?.userId || '').trim();
  if (!userId) {
    throw new Error('userId is required');
  }

  const title = String(payload?.title || '').trim();
  const message = String(payload?.message || '').trim();
  if (!title || !message) {
    throw new Error('title and message are required');
  }

  const now = new Date().toISOString();
  const docRef = db.collection(NOTIFICATIONS_COLLECTION).doc();
  await docRef.set({
    user_id: userId,
    type: String(payload?.type || 'general'),
    title,
    message,
    link: payload?.link ? String(payload.link) : null,
    is_read: false,
    metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    created_at: now,
    read_at: null
  });

  const created = await docRef.get();
  return normalizeNotification(created);
}

export async function createNotificationsForAdmins(payload) {
  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0) return [];

  const now = new Date().toISOString();
  const batch = db.batch();
  const ids = [];

  adminIds.forEach((adminId) => {
    const ref = db.collection(NOTIFICATIONS_COLLECTION).doc();
    ids.push(ref.id);
    batch.set(ref, {
      user_id: adminId,
      type: String(payload?.type || 'general'),
      title: String(payload?.title || ''),
      message: String(payload?.message || ''),
      link: payload?.link ? String(payload.link) : null,
      is_read: false,
      metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
      created_at: now,
      read_at: null
    });
  });

  await batch.commit();
  return ids;
}

export async function listNotificationsForUser(userId, options = {}) {
  const uid = String(userId || '').trim();
  if (!uid) {
    throw new Error('userId is required');
  }

  const page = toPositiveInt(options.page, 1);
  const limit = toPositiveInt(options.limit, 20);
  const unreadOnly = options.unreadOnly === true;

  const snapshot = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where('user_id', '==', uid)
    .get();

  let items = snapshot.docs.map(normalizeNotification);
  if (unreadOnly) {
    items = items.filter((item) => item.is_read !== true);
  }

  items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const notifications = items.slice(start, start + limit);
  const unreadCount = items.filter((item) => item.is_read !== true).length;

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

export async function markNotificationsAsRead(userId, notificationIds = []) {
  const uid = String(userId || '').trim();
  if (!uid) {
    throw new Error('userId is required');
  }

  const now = new Date().toISOString();
  const snapshot = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where('user_id', '==', uid)
    .get();

  const idSet = new Set((notificationIds || []).map((id) => String(id)));
  const docsToUpdate = snapshot.docs.filter((doc) => {
    if (idSet.size === 0) {
      return doc.data().is_read !== true;
    }
    return idSet.has(doc.id);
  });

  if (docsToUpdate.length === 0) return 0;

  const batch = db.batch();
  docsToUpdate.forEach((doc) => {
    batch.update(doc.ref, {
      is_read: true,
      read_at: now
    });
  });
  await batch.commit();
  return docsToUpdate.length;
}

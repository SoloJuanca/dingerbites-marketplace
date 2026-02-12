import { db } from './firebaseAdmin';

const USERS_COLLECTION = 'users';

function wrapFirestoreError(error, action) {
  const firestoreNotFoundCode = 5;
  if (error?.code === firestoreNotFoundCode || error?.code === 'not-found') {
    throw new Error(
      `Firestore is not available for this Firebase project while trying to ${action}. ` +
      'Enable Cloud Firestore in the Firebase Console and verify FIREBASE_PROJECT_ID/FIREBASE_DATABASE_ID.'
    );
  }

  throw error;
}

function normalizeUser(doc) {
  return {
    id: doc.id,
    ...doc.data()
  };
}

export async function getUserById(userId) {
  try {
    const doc = await db.collection(USERS_COLLECTION).doc(String(userId)).get();
    if (!doc.exists) return null;
    return normalizeUser(doc);
  } catch (error) {
    wrapFirestoreError(error, 'read user by id');
  }
}

export async function getUserByEmail(email) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail) return null;

  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return normalizeUser(snapshot.docs[0]);
  } catch (error) {
    wrapFirestoreError(error, 'read user by email');
  }
}

export async function createUser(userPayload) {
  const now = new Date().toISOString();
  const docRef = db.collection(USERS_COLLECTION).doc();

  const payload = {
    email: String(userPayload.email || '').toLowerCase().trim(),
    password_hash: userPayload.password_hash,
    first_name: userPayload.first_name,
    last_name: userPayload.last_name,
    phone: userPayload.phone || null,
    date_of_birth: userPayload.date_of_birth || null,
    gender: userPayload.gender || null,
    role: userPayload.role || 'user',
    is_admin: userPayload.is_admin !== undefined ? Boolean(userPayload.is_admin) : false,
    is_active: userPayload.is_active !== undefined ? Boolean(userPayload.is_active) : true,
    is_verified: userPayload.is_verified !== undefined ? Boolean(userPayload.is_verified) : false,
    is_guest: userPayload.is_guest !== undefined ? Boolean(userPayload.is_guest) : false,
    created_at: now,
    updated_at: now,
    last_login_at: null
  };

  try {
    await docRef.set(payload);
    return {
      id: docRef.id,
      ...payload
    };
  } catch (error) {
    wrapFirestoreError(error, 'create user');
  }
}

export async function updateUser(userId, updates) {
  try {
    const docRef = db.collection(USERS_COLLECTION).doc(String(userId));
    const existing = await docRef.get();
    if (!existing.exists) return null;

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    await docRef.update(payload);
    const updatedDoc = await docRef.get();
    return normalizeUser(updatedDoc);
  } catch (error) {
    wrapFirestoreError(error, 'update user');
  }
}

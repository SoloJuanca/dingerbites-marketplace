import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function normalizeStorageBucketName(value) {
  if (!value) return '';
  return String(value)
    .replace(/^gs:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .split('/')[0]
    .trim();
}

function getFirebaseCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return cert(parsed);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
    );
  }

  return cert({
    projectId,
    clientEmail,
    privateKey
  });
}

const storageBucket = normalizeStorageBucketName(process.env.FIREBASE_STORAGE_BUCKET);
if (!storageBucket) {
  throw new Error('FIREBASE_STORAGE_BUCKET is not set');
}

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: getFirebaseCredential(),
      storageBucket
    });

const firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
const db = getFirestore(firebaseApp, firestoreDatabaseId);
const storage = getStorage(firebaseApp);

export { firebaseApp, db, storage, firestoreDatabaseId };

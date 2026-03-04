import { randomUUID } from 'crypto';
import { db } from './firebaseAdmin';

const REVIEW_LINKS_COLLECTION = 'review_links';

/** Create a new review link. Returns the link with full URL. */
export async function createReviewLink(payload) {
  const { label, created_by } = payload;
  const token = randomUUID();
  const now = new Date().toISOString();

  const docRef = db.collection(REVIEW_LINKS_COLLECTION).doc();
  await docRef.set({
    token,
    label: label ? String(label).trim() : null,
    created_by: created_by || null,
    created_at: now,
    is_active: true
  });

  const doc = await docRef.get();
  return { id: doc.id, token, ...doc.data() };
}

/** Get review link by token if active */
export async function getReviewLinkByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const snapshot = await db
    .collection(REVIEW_LINKS_COLLECTION)
    .where('token', '==', token.trim())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  if (data.is_active === false) return null;
  return { id: doc.id, ...data };
}

/** List all review links (admin) */
export async function listReviewLinks(options = {}) {
  const snapshot = await db.collection(REVIEW_LINKS_COLLECTION).get();
  let links = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  links.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return links;
}

import { db } from './firebaseAdmin';

const PRODUCT_QUESTIONS_COLLECTION = 'product_questions';
const PRODUCTS_COLLECTION = 'products';
const USERS_COLLECTION = 'users';

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeQuestion(doc) {
  return {
    id: doc.id,
    ...doc.data()
  };
}

function toPublicQuestion(question) {
  return {
    id: question.id,
    product_id: question.product_id,
    question: question.question,
    answer: question.answer || null,
    status: question.status || 'pending',
    created_at: question.created_at || null,
    answered_at: question.answered_at || null
  };
}

export async function createProductQuestion({ productId, userId, question }) {
  const normalizedProductId = String(productId || '').trim();
  const normalizedUserId = String(userId || '').trim();
  const normalizedQuestion = String(question || '').trim();

  if (!normalizedProductId || !normalizedUserId || !normalizedQuestion) {
    throw new Error('productId, userId and question are required');
  }

  const [productDoc, userDoc] = await Promise.all([
    db.collection(PRODUCTS_COLLECTION).doc(normalizedProductId).get(),
    db.collection(USERS_COLLECTION).doc(normalizedUserId).get()
  ]);

  if (!productDoc.exists || productDoc.data()?.is_active === false) {
    throw new Error('Product not found');
  }
  if (!userDoc.exists || userDoc.data()?.is_active === false) {
    throw new Error('User not found');
  }

  const now = new Date().toISOString();
  const docRef = db.collection(PRODUCT_QUESTIONS_COLLECTION).doc();
  await docRef.set({
    product_id: normalizedProductId,
    user_id: normalizedUserId,
    question: normalizedQuestion,
    status: 'pending',
    is_visible: true,
    answer: null,
    answered_by: null,
    answered_at: null,
    created_at: now,
    updated_at: now
  });

  const created = await docRef.get();
  const data = normalizeQuestion(created);
  return {
    ...data,
    product: { id: productDoc.id, ...productDoc.data() },
    user: { id: userDoc.id, ...userDoc.data() }
  };
}

export async function getPublicProductQuestions(productId) {
  const normalizedProductId = String(productId || '').trim();
  if (!normalizedProductId) return [];

  const snapshot = await db
    .collection(PRODUCT_QUESTIONS_COLLECTION)
    .where('product_id', '==', normalizedProductId)
    .where('is_visible', '==', true)
    .where('status', '==', 'answered')
    .get();

  const questions = snapshot.docs.map(normalizeQuestion);
  questions.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return questions.map(toPublicQuestion);
}

export async function getAdminProductQuestions(options = {}) {
  const page = toPositiveInt(options.page, 1);
  const limit = toPositiveInt(options.limit, 20);
  const status = String(options.status || '').trim();
  const search = String(options.search || '').trim().toLowerCase();
  const productId = String(options.productId || '').trim();
  const questionId = String(options.questionId || '').trim();

  const snapshot = await db.collection(PRODUCT_QUESTIONS_COLLECTION).get();
  let questions = snapshot.docs.map(normalizeQuestion);

  if (questionId) {
    questions = questions.filter((item) => String(item.id) === questionId);
  }
  if (productId) {
    questions = questions.filter((item) => String(item.product_id) === productId);
  }
  if (status === 'pending' || status === 'answered') {
    questions = questions.filter((item) => String(item.status || '') === status);
  }
  if (search) {
    questions = questions.filter((item) => {
      const haystack = `${item.question || ''} ${item.answer || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  questions.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const total = questions.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = questions.slice(start, start + limit);

  const userIds = [...new Set(paginated.map((item) => String(item.user_id || '')).filter(Boolean))];
  const adminIds = [...new Set(paginated.map((item) => String(item.answered_by || '')).filter(Boolean))];
  const productIds = [...new Set(paginated.map((item) => String(item.product_id || '')).filter(Boolean))];

  const [userDocs, adminDocs, productDocs] = await Promise.all([
    Promise.all(userIds.map((id) => db.collection(USERS_COLLECTION).doc(id).get())),
    Promise.all(adminIds.map((id) => db.collection(USERS_COLLECTION).doc(id).get())),
    Promise.all(productIds.map((id) => db.collection(PRODUCTS_COLLECTION).doc(id).get()))
  ]);

  const usersById = new Map(
    userDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );
  const adminsById = new Map(
    adminDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );
  const productsById = new Map(
    productDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );

  const enriched = paginated.map((item) => {
    const owner = usersById.get(String(item.user_id || ''));
    const responder = adminsById.get(String(item.answered_by || ''));
    const product = productsById.get(String(item.product_id || ''));

    return {
      ...item,
      user_name: owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : null,
      user_email: owner?.email || null,
      product_name: product?.name || null,
      product_slug: product?.slug || null,
      answered_by_name: responder ? `${responder.first_name || ''} ${responder.last_name || ''}`.trim() : null
    };
  });

  return {
    questions: enriched,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

export async function answerProductQuestion(questionId, { answer, adminUserId }) {
  const normalizedQuestionId = String(questionId || '').trim();
  const normalizedAnswer = String(answer || '').trim();
  const normalizedAdminId = String(adminUserId || '').trim();

  if (!normalizedQuestionId || !normalizedAnswer || !normalizedAdminId) {
    throw new Error('questionId, answer and adminUserId are required');
  }

  const [questionDoc, adminDoc] = await Promise.all([
    db.collection(PRODUCT_QUESTIONS_COLLECTION).doc(normalizedQuestionId).get(),
    db.collection(USERS_COLLECTION).doc(normalizedAdminId).get()
  ]);

  if (!questionDoc.exists) {
    throw new Error('Question not found');
  }
  if (!adminDoc.exists) {
    throw new Error('Admin user not found');
  }

  const now = new Date().toISOString();
  await questionDoc.ref.update({
    answer: normalizedAnswer,
    status: 'answered',
    answered_by: normalizedAdminId,
    answered_at: now,
    updated_at: now
  });

  const updated = await questionDoc.ref.get();
  return normalizeQuestion(updated);
}

export async function getProductQuestionById(questionId) {
  const normalizedQuestionId = String(questionId || '').trim();
  if (!normalizedQuestionId) return null;

  const questionDoc = await db.collection(PRODUCT_QUESTIONS_COLLECTION).doc(normalizedQuestionId).get();
  if (!questionDoc.exists) return null;

  const question = normalizeQuestion(questionDoc);
  const [productDoc, userDoc, adminDoc] = await Promise.all([
    db.collection(PRODUCTS_COLLECTION).doc(String(question.product_id || '')).get(),
    db.collection(USERS_COLLECTION).doc(String(question.user_id || '')).get(),
    question.answered_by
      ? db.collection(USERS_COLLECTION).doc(String(question.answered_by)).get()
      : Promise.resolve(null)
  ]);

  return {
    ...question,
    product: productDoc?.exists ? { id: productDoc.id, ...productDoc.data() } : null,
    user: userDoc?.exists ? { id: userDoc.id, ...userDoc.data() } : null,
    answered_by_user: adminDoc?.exists ? { id: adminDoc.id, ...adminDoc.data() } : null
  };
}

import { db } from './firebaseAdmin';

const EXPENSES_COLLECTION = 'expenses';

export const EXPENSE_CATEGORIES = [
  'renta',
  'publicidad',
  'nomina',
  'envios',
  'servicios',
  'inventario',
  'impuestos',
  'otros'
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

/** Normalize a stored expense document. */
function normalizeExpense(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    amount: toNumber(data.amount, 0)
  };
}

/** Coerce a date-only (YYYY-MM-DD) or ISO string into a comparable timestamp. */
function toTs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function normalizeCategory(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return EXPENSE_CATEGORIES.includes(value) ? value : 'otros';
}

/**
 * List expenses with optional date range and category filter.
 * Options: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD), category.
 * Sorted by date desc.
 */
export async function listExpenses(options = {}) {
  const snapshot = await db.collection(EXPENSES_COLLECTION).get();
  let expenses = snapshot.docs.map(normalizeExpense);

  if (options.dateFrom) {
    const from = toTs(options.dateFrom);
    if (from !== null) {
      expenses = expenses.filter((e) => {
        const ts = toTs(e.date);
        return ts !== null && ts >= from;
      });
    }
  }
  if (options.dateTo) {
    const to = toTs(`${options.dateTo}T23:59:59`);
    if (to !== null) {
      expenses = expenses.filter((e) => {
        const ts = toTs(e.date);
        return ts !== null && ts <= to;
      });
    }
  }

  const category = (options.category || '').trim().toLowerCase();
  if (category) {
    expenses = expenses.filter((e) => String(e.category || '').toLowerCase() === category);
  }

  expenses.sort((a, b) => (toTs(b.date) || 0) - (toTs(a.date) || 0));

  const total = expenses.reduce((sum, e) => sum + toNumber(e.amount, 0), 0);
  return { expenses, total: roundMoney(total) };
}

/** Sum expenses in a date range grouped by category. Used by the earnings report. */
export async function getExpensesSummary(options = {}) {
  const { expenses } = await listExpenses(options);
  const byCategory = {};
  let total = 0;
  expenses.forEach((e) => {
    const amount = toNumber(e.amount, 0);
    total += amount;
    const key = normalizeCategory(e.category);
    byCategory[key] = roundMoney((byCategory[key] || 0) + amount);
  });
  return { total: roundMoney(total), byCategory, count: expenses.length, expenses };
}

/** Create a new expense. */
export async function createExpense(payload = {}, adminId = null) {
  const amount = roundMoney(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del gasto debe ser mayor a cero');
  }
  const concept = String(payload.concept || '').trim();
  if (!concept) {
    throw new Error('El concepto del gasto es obligatorio');
  }

  const now = new Date().toISOString();
  const date = payload.date ? new Date(payload.date).toISOString() : now;

  const docRef = db.collection(EXPENSES_COLLECTION).doc();
  const doc = {
    concept,
    category: normalizeCategory(payload.category),
    amount,
    date,
    notes: payload.notes ? String(payload.notes).trim() : null,
    created_by: adminId || null,
    created_at: now,
    updated_at: now
  };
  await docRef.set(doc);
  return { id: docRef.id, ...doc };
}

/** Update an existing expense. */
export async function updateExpense(id, patch = {}) {
  const ref = db.collection(EXPENSES_COLLECTION).doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) return null;

  const updateData = { updated_at: new Date().toISOString() };

  if (patch.concept !== undefined) {
    const concept = String(patch.concept || '').trim();
    if (!concept) throw new Error('El concepto del gasto es obligatorio');
    updateData.concept = concept;
  }
  if (patch.category !== undefined) {
    updateData.category = normalizeCategory(patch.category);
  }
  if (patch.amount !== undefined) {
    const amount = roundMoney(patch.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('El monto del gasto debe ser mayor a cero');
    }
    updateData.amount = amount;
  }
  if (patch.date !== undefined) {
    updateData.date = patch.date ? new Date(patch.date).toISOString() : snap.data().date;
  }
  if (patch.notes !== undefined) {
    updateData.notes = patch.notes ? String(patch.notes).trim() : null;
  }

  await ref.update(updateData);
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

/** Delete an expense. Returns true if it existed. */
export async function deleteExpense(id) {
  const ref = db.collection(EXPENSES_COLLECTION).doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

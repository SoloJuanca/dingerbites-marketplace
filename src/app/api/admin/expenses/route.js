import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { createExpense, listExpenses } from '../../../../lib/firebaseExpenses';
import { jsonError } from '../../../../lib/security';

/**
 * GET /api/admin/expenses
 * Query: dateFrom, dateTo, category
 */
export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(request.url);
    const options = {
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      category: searchParams.get('category') || ''
    };

    const { expenses, total } = await listExpenses(options);
    return NextResponse.json({ success: true, expenses, total });
  } catch (error) {
    console.error('Error listing expenses:', error);
    return jsonError('Failed to list expenses', 500, 'EXPENSES_LIST_FAILED');
  }
}

/**
 * POST /api/admin/expenses
 * Body: { concept, category, amount, date, notes }
 */
export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400, 'INVALID_BODY');
    }

    const created = await createExpense(body, admin.id);
    return NextResponse.json(
      { success: true, expense: created, message: 'Gasto creado correctamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expense:', error);
    return jsonError(error?.message || 'Failed to create expense', 400, 'EXPENSE_CREATE_FAILED');
  }
}

import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { deleteExpense, updateExpense } from '../../../../../lib/firebaseExpenses';
import { jsonError } from '../../../../../lib/security';

/**
 * PATCH /api/admin/expenses/[id]
 * Body: partial { concept, category, amount, date, notes }
 */
export async function PATCH(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400, 'INVALID_BODY');
    }

    const { id } = await params;
    const updated = await updateExpense(String(id), body);
    if (!updated) {
      return jsonError('Gasto no encontrado', 404, 'EXPENSE_NOT_FOUND');
    }

    return NextResponse.json({ success: true, expense: updated, message: 'Gasto actualizado' });
  } catch (error) {
    console.error('Error updating expense:', error);
    return jsonError(error?.message || 'Failed to update expense', 400, 'EXPENSE_UPDATE_FAILED');
  }
}

/**
 * DELETE /api/admin/expenses/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const deleted = await deleteExpense(String(id));
    if (!deleted) {
      return jsonError('Gasto no encontrado', 404, 'EXPENSE_NOT_FOUND');
    }

    return NextResponse.json({ success: true, message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return jsonError(error?.message || 'Failed to delete expense', 400, 'EXPENSE_DELETE_FAILED');
  }
}

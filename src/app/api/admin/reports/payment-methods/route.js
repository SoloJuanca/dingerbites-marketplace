import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { getPaymentReportData } from '../../../../../lib/firebaseOrders';

/**
 * GET /api/admin/reports/payment-methods
 * Query: dateFrom, dateTo, status, payment_method (Efectivo|Tarjeta|Stripe|Otros), created_by (user id), groupBy (day|week|month), page, limit, format (json|csv)
 * format=csv returns CSV file for download (all matching orders, no pagination).
 */
export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const status = searchParams.get('status') || '';
    const payment_method = searchParams.get('payment_method') || '';
    const created_by = searchParams.get('created_by') || '';
    const groupBy = searchParams.get('groupBy') || '';
    const page = parseInt(searchParams.get('page'), 10) || 1;
    const limitParam = searchParams.get('limit');
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const isCsv = format === 'csv';
    const options = {
      dateFrom,
      dateTo,
      status,
      payment_method,
      created_by,
      groupBy: groupBy || undefined,
      page: isCsv ? 1 : page,
      limit: isCsv ? 99999 : (limitParam ? parseInt(limitParam, 10) : 50)
    };

    const result = await getPaymentReportData(options);

    if (isCsv) {
      const rows = [
        ['Número de orden', 'Fecha', 'Cliente', 'Total', 'Método de pago', 'Estatus', 'Cajero/Usuario'].join(',')
      ];
      result.orders.forEach((o) => {
        const created = o.created_at ? new Date(o.created_at).toISOString() : '';
        const total = Number(o.total_amount) || 0;
        const customer = (o.customer_name || o.customer_email || '—').replace(/"/g, '""');
        const method = (o.payment_method_display || o.payment_method || '—').replace(/"/g, '""');
        const statusName = (o.status_name || '—').replace(/"/g, '""');
        const cashier = (o.cashier_name || '—').replace(/"/g, '""');
        rows.push(`"${o.order_number || o.id}","${created}","${customer}",${total},"${method}","${statusName}","${cashier}"`);
      });
      const csv = '\uFEFF' + rows.join('\r\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte-pagos-${new Date().toISOString().slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in payment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment report' },
      { status: 500 }
    );
  }
}

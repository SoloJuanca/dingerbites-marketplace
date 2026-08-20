import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { getEarningsReportData } from '../../../../../lib/firebaseEarnings';

/**
 * GET /api/admin/reports/earnings
 * Query: dateFrom, dateTo, statusScope (paid|all), status (specific status name), format (json|csv)
 * format=csv returns a CSV of the per-product profit breakdown.
 */
export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const options = {
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      statusScope: searchParams.get('statusScope') || 'paid',
      status: searchParams.get('status') || ''
    };
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const result = await getEarningsReportData(options);

    if (format === 'csv') {
      const rows = [
        ['Producto', 'Unidades vendidas', 'Ingresos', 'Costo (COGS)', 'Ganancia'].join(',')
      ];
      result.products.forEach((p) => {
        const name = String(p.product_name || '—').replace(/"/g, '""');
        rows.push(
          `"${name}",${p.quantity},${p.revenue},${p.cost},${p.profit}`
        );
      });
      rows.push('');
      rows.push(['Resumen', '', '', '', ''].join(','));
      const s = result.summary;
      rows.push(`"Ingresos (mercancía)",,,,"${s.gross_revenue}"`);
      rows.push(`"Descuentos",,,,"${s.discounts}"`);
      rows.push(`"Ingresos netos",,,,"${s.net_revenue}"`);
      rows.push(`"Costo de productos (COGS)",,,,"${s.cogs}"`);
      rows.push(`"Ganancia bruta",,,,"${s.gross_profit}"`);
      rows.push(`"Gastos",,,,"${s.expenses_total}"`);
      rows.push(`"Ganancia neta",,,,"${s.net_profit}"`);

      const csv = '\uFEFF' + rows.join('\r\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte-ganancias-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in earnings report:', error);
    return NextResponse.json(
      { error: 'Failed to generate earnings report' },
      { status: 500 }
    );
  }
}

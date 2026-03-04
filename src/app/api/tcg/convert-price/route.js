import { NextResponse } from 'next/server';
import { convertUsdToMxnWithMin } from '../../../../lib/currency';

/**
 * GET /api/tcg/convert-price?usd=0.5
 * Converts USD to MXN with minimum 15 MXN for TCG cards.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usd = searchParams.get('usd');
    const mxn = convertUsdToMxnWithMin(usd);
    return NextResponse.json({
      success: true,
      mxn: mxn != null ? Number(mxn) : null
    });
  } catch (err) {
    console.error('Error converting TCG price:', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}

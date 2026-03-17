import { NextResponse } from 'next/server';
import { convertUsdToMxnWithMin } from '../../../../lib/currency';

/**
 * GET /api/tcg/convert-price?usd=0.5
 * Converts USD to MXN with subtype-aware minimum for TCG cards.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usd = searchParams.get('usd');
    const subTypeName = searchParams.get('subTypeName') || 'Normal';
    const mxn = convertUsdToMxnWithMin(usd, subTypeName);
    return NextResponse.json({
      success: true,
      mxn: mxn != null ? Number(mxn) : null
    });
  } catch (err) {
    console.error('Error converting TCG price:', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}

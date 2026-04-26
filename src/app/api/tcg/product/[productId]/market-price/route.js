import { NextResponse } from 'next/server';
import { db } from '../../../../../../lib/firebaseAdmin';
import { convertUsdToMxnWithMin } from '../../../../../../lib/currency';
import { TCG_CSV_BASE, tcgcsvHeaders } from '../../../../../../lib/tcgcsvClient';

const PRODUCTS_COLLECTION = 'products';

export async function GET(request, { params }) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const productRef = db.collection(PRODUCTS_COLLECTION).doc(String(productId));
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productSnap.data();
    const tcgProductId = product.tcg_product_id;
    const tcgGroupId = product.tcg_group_id;
    const tcgCategoryId = product.tcg_category_id;
    const tcgSubTypeName = product.tcg_sub_type_name || 'Normal';

    if (!tcgProductId || !tcgGroupId || !tcgCategoryId) {
      return NextResponse.json(
        { error: 'Product is not a TCG product with price data' },
        { status: 400 }
      );
    }

    const res = await fetch(`${TCG_CSV_BASE}/${tcgCategoryId}/${tcgGroupId}/prices`, {
      headers: tcgcsvHeaders(),
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      throw new Error(`TCG API error: ${res.status}`);
    }
    const data = await res.json();
    const results = data.results || [];

    const tcgProductIdNum = Number(tcgProductId);
    const normSubType = (s) => (s || 'Normal').trim();

    let priceRow = results.find(
      (p) =>
        Number(p.productId) === tcgProductIdNum &&
        normSubType(p.subTypeName) === normSubType(tcgSubTypeName)
    );

    if (!priceRow) {
      priceRow = results.find(
        (p) => Number(p.productId) === tcgProductIdNum
      );
    }

    if (!priceRow) {
      return NextResponse.json({
        success: true,
        marketPrice: null,
        marketPriceMxn: null,
        message: 'Precio no disponible'
      });
    }

    const marketPriceUsd =
      priceRow.marketPrice ?? priceRow.midPrice ?? priceRow.lowPrice ?? null;
    const marketPriceMxn =
      marketPriceUsd != null
        ? convertUsdToMxnWithMin(marketPriceUsd, priceRow.subTypeName || tcgSubTypeName || 'Normal')
        : null;

    return NextResponse.json({
      success: true,
      marketPrice: marketPriceUsd,
      marketPriceMxn
    });
  } catch (err) {
    console.error('Error fetching TCG market price:', err);
    return NextResponse.json(
      { error: 'Failed to fetch market price' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '../../../../../../lib/firebaseAdmin';
import {
  getTcgMarketPriceForProduct,
  TcgMarketPriceError
} from '../../../../../../lib/tcgMarketPrice';

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
    const price = await getTcgMarketPriceForProduct(product, {
      next: { revalidate: 3600 }
    });

    return NextResponse.json({
      success: true,
      marketPrice: price.marketPrice,
      marketPriceMxn: price.marketPriceMxn
    });
  } catch (err) {
    if (err instanceof TcgMarketPriceError) {
      const status = err.code === 'TCG_PRODUCT_INCOMPLETE' ? 400 : 404;
      return NextResponse.json({ error: err.message }, { status });
    }

    console.error('Error fetching TCG market price:', err);
    return NextResponse.json(
      { error: 'Failed to fetch market price' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { db } from '../../../../../lib/firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';
const ORDERS_COLLECTION = 'orders';

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// GET /api/admin/products/[id] - Get single product
export async function GET(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(String(id));
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = { id: productSnap.id, ...productSnap.data() };
    let category_name = null;
    let brand_name = null;
    if (product.category_id) {
      const catSnap = await db.collection(CATEGORIES_COLLECTION).doc(String(product.category_id)).get();
      if (catSnap.exists) category_name = catSnap.data().name;
    }
    if (product.brand_id) {
      const brandSnap = await db.collection(BRANDS_COLLECTION).doc(String(product.brand_id)).get();
      if (brandSnap.exists) brand_name = brandSnap.data().name;
    }

    const images = Array.isArray(product.images)
      ? product.images.map((img, idx) => ({
          id: idx,
          image_url: typeof img === 'string' ? img : img?.url,
          alt_text: typeof img === 'object' ? img?.alt : '',
          is_primary: typeof img === 'object' ? img?.is_primary : idx === 0,
          sort_order: typeof img === 'object' ? img?.sort_order : idx
        }))
      : [];
    const features = Array.isArray(product.features)
      ? product.features.map((f, idx) =>
          typeof f === 'string' ? { id: idx, feature_text: f, sort_order: idx } : { id: idx, feature_text: f?.feature_text ?? f, sort_order: f?.sort_order ?? idx }
        )
      : [];

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        category_name,
        brand_name,
        images,
        features
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const productRef = db.collection(PRODUCTS_COLLECTION).doc(String(id));
    const existingSnap = await productRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    const existingProduct = existingSnap.data();

    const {
      name,
      slug,
      description,
      short_description,
      price,
      compare_price,
      cost_price,
      sku,
      barcode,
      weight_grams,
      dimensions_cm,
      category_id,
      brand_id,
      stock_quantity,
      low_stock_threshold,
      allow_backorders,
      is_active,
      is_featured,
      is_bestseller,
      meta_title,
      meta_description,
      meta_keywords,
      images,
      features
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    if (is_active && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for published products' },
        { status: 400 }
      );
    }

    if (slug !== existingProduct.slug) {
      const slugSnap = await db.collection(PRODUCTS_COLLECTION).where('slug', '==', slug).get();
      const other = slugSnap.docs.find((d) => d.id !== id);
      if (other) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const normalizedImages = Array.isArray(images)
      ? images
          .map((img, idx) => {
            if (typeof img === 'string') return { url: img, alt: '', is_primary: idx === 0, sort_order: idx };
            if (img?.url) return { url: img.url, alt: img.alt || img.alt_text || '', is_primary: idx === 0, sort_order: idx };
            return null;
          })
          .filter(Boolean)
      : existingProduct.images;

    const updateData = {
      name,
      slug,
      description: description ?? existingProduct.description ?? '',
      short_description: short_description ?? existingProduct.short_description ?? '',
      price: toNumber(price, existingProduct.price),
      compare_price: compare_price !== undefined ? toNumber(compare_price, 0) : existingProduct.compare_price,
      cost_price: cost_price !== undefined ? toNumber(cost_price, 0) : existingProduct.cost_price,
      sku: sku ?? existingProduct.sku ?? null,
      barcode: barcode ?? existingProduct.barcode ?? null,
      weight_grams: weight_grams !== undefined ? toNumber(weight_grams, 0) : existingProduct.weight_grams,
      dimensions_cm: dimensions_cm ?? existingProduct.dimensions_cm ?? null,
      category_id: category_id ?? existingProduct.category_id ?? null,
      brand_id: brand_id ?? existingProduct.brand_id ?? null,
      stock_quantity: stock_quantity !== undefined ? toNumber(stock_quantity, 0) : existingProduct.stock_quantity,
      low_stock_threshold: low_stock_threshold !== undefined ? toNumber(low_stock_threshold, 5) : existingProduct.low_stock_threshold,
      allow_backorders: allow_backorders !== undefined ? Boolean(allow_backorders) : existingProduct.allow_backorders,
      is_active: is_active !== undefined ? Boolean(is_active) : existingProduct.is_active,
      is_featured: is_featured !== undefined ? Boolean(is_featured) : existingProduct.is_featured,
      is_bestseller: is_bestseller !== undefined ? Boolean(is_bestseller) : existingProduct.is_bestseller,
      meta_title: meta_title ?? existingProduct.meta_title ?? null,
      meta_description: meta_description ?? existingProduct.meta_description ?? null,
      meta_keywords: meta_keywords ?? existingProduct.meta_keywords ?? null,
      images: normalizedImages,
      image: Array.isArray(normalizedImages) && normalizedImages[0] ? (normalizedImages[0].url || normalizedImages[0]) : '',
      features: Array.isArray(features) ? features : (existingProduct.features || []),
      updated_at: now
    };

    await productRef.update(updateData);
    const updatedSnap = await productRef.get();
    const updatedProduct = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(String(id));
    const existingSnap = await productRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const ordersSnap = await db.collection(ORDERS_COLLECTION).get();
    const hasOrderWithProduct = ordersSnap.docs.some((doc) => {
      const items = doc.data().items || [];
      return items.some((item) => String(item.product_id) === String(id));
    });

    if (hasOrderWithProduct) {
      return NextResponse.json(
        { error: 'Cannot delete product that has been ordered. Consider deactivating it instead.' },
        { status: 400 }
      );
    }

    await productRef.delete();
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

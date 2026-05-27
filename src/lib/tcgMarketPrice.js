import { convertUsdToMxnWithMin } from './currency';
import { TCG_CSV_BASE, tcgcsvHeaders } from './tcgcsvClient';

export class TcgMarketPriceError extends Error {
  constructor(message, code = 'TCG_PRICE_UNAVAILABLE') {
    super(message);
    this.name = 'TcgMarketPriceError';
    this.code = code;
  }
}

const normSubType = (value) => (value || 'Normal').trim();

export async function getTcgMarketPriceForProduct(product, fetchOptions = {}) {
  const tcgProductId = product?.tcg_product_id;
  const tcgGroupId = product?.tcg_group_id;
  const tcgCategoryId = product?.tcg_category_id;
  const tcgSubTypeName = product?.tcg_sub_type_name || 'Normal';

  if (!tcgProductId || !tcgGroupId || !tcgCategoryId) {
    throw new TcgMarketPriceError(
      'Product is not a TCG product with price data',
      'TCG_PRODUCT_INCOMPLETE'
    );
  }

  const res = await fetch(`${TCG_CSV_BASE}/${tcgCategoryId}/${tcgGroupId}/prices`, {
    ...fetchOptions,
    headers: tcgcsvHeaders(fetchOptions.headers)
  });

  if (!res.ok) {
    throw new TcgMarketPriceError(`TCG API error: ${res.status}`, 'TCG_API_ERROR');
  }

  const data = await res.json();
  const results = data.results || [];
  const tcgProductIdNum = Number(tcgProductId);

  let priceRow = results.find(
    (price) =>
      Number(price.productId) === tcgProductIdNum &&
      normSubType(price.subTypeName) === normSubType(tcgSubTypeName)
  );

  if (!priceRow) {
    priceRow = results.find((price) => Number(price.productId) === tcgProductIdNum);
  }

  if (!priceRow) {
    throw new TcgMarketPriceError('Precio TCG no disponible');
  }

  const marketPrice = priceRow.marketPrice ?? priceRow.midPrice ?? priceRow.lowPrice ?? null;
  const marketPriceMxn =
    marketPrice != null
      ? convertUsdToMxnWithMin(marketPrice, priceRow.subTypeName || tcgSubTypeName || 'Normal')
      : null;

  if (marketPriceMxn == null) {
    throw new TcgMarketPriceError('Precio TCG no disponible');
  }

  return {
    marketPrice,
    marketPriceMxn,
    subTypeName: priceRow.subTypeName || tcgSubTypeName || 'Normal'
  };
}

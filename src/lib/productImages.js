export const RIFTBOUND_FALLBACK_IMAGE = '/riftbound-card-back.png';

export function isRiftboundProduct(product) {
  const brands = [
    product?.brand_name,
    product?.franchise_brand_name,
    product?.brand
  ];

  return brands.some((brand) => String(brand || '').trim().toLowerCase() === 'riftbound');
}

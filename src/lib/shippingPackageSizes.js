export const SHIPPING_PACKAGE_SIZES = {
  envelope: {
    label: 'Sobre TCG',
    description: '19 × 22 × 2 cm · 1 kg',
    length: 19,
    width: 22,
    height: 2,
    weight: 1
  },
  small: {
    label: 'Chico',
    description: '20 × 15 × 10 cm · 1 kg',
    length: 20,
    width: 15,
    height: 10,
    weight: 1
  },
  medium: {
    label: 'Mediano',
    description: '30 × 20 × 15 cm · 3 kg',
    length: 30,
    width: 20,
    height: 15,
    weight: 3
  },
  large: {
    label: 'Grande',
    description: '40 × 30 × 20 cm · 5 kg',
    length: 40,
    width: 30,
    height: 20,
    weight: 5
  }
};

export const SHIPPING_PACKAGE_SIZE_IDS = Object.keys(SHIPPING_PACKAGE_SIZES);
const SHIPPING_PACKAGE_SIZE_RANK = {
  envelope: 0,
  small: 1,
  medium: 2,
  large: 3
};

export function getShippingPackageSize(value, { isTcg = false } = {}) {
  if (Object.hasOwn(SHIPPING_PACKAGE_SIZES, value)) return value;
  return isTcg ? 'envelope' : 'small';
}

export function toEnviaPackage(size, { weight, content = 'Dingerbites products' } = {}) {
  const packageSize = SHIPPING_PACKAGE_SIZES[getShippingPackageSize(size)];
  return {
    type: 'box',
    content,
    amount: 1,
    declaredValue: 0,
    lengthUnit: 'CM',
    weightUnit: 'KG',
    weight: Math.max(Number(weight) || 0, packageSize.weight),
    dimensions: {
      length: packageSize.length,
      width: packageSize.width,
      height: packageSize.height
    }
  };
}

export function createShippingPackagePlanForItems(items, productsById) {
  let largestSizeRank = -1;
  let largestSize = 'small';
  let totalProductWeightKg = 0;
  let allWeightsKnown = true;

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      const error = new Error('Uno de los productos del carrito ya no está disponible.');
      error.code = 'SHIPPING_PRODUCT_NOT_FOUND';
      throw error;
    }

    const size = getShippingPackageSize(product.shipping_package_size, {
      isTcg: product.tcg_product_id != null
    });
    if (SHIPPING_PACKAGE_SIZE_RANK[size] > largestSizeRank) {
      largestSize = size;
      largestSizeRank = SHIPPING_PACKAGE_SIZE_RANK[size];
    }
    const productWeightGrams = Number(product.weight_grams);
    if (Number.isFinite(productWeightGrams) && productWeightGrams > 0) {
      totalProductWeightKg += (productWeightGrams * item.quantity) / 1000;
    } else {
      allWeightsKnown = false;
    }
  }

  const weight = allWeightsKnown ? totalProductWeightKg : undefined;
  const packageDetails = SHIPPING_PACKAGE_SIZES[largestSize];
  const shippingPackage = toEnviaPackage(largestSize, { weight });
  return {
    packages: [shippingPackage],
    summary: {
      packageCount: 1,
      size: largestSize,
      label: packageDetails.label,
      dimensions: shippingPackage.dimensions,
      weight: shippingPackage.weight
    }
  };
}

export function createShippingPackageForItems(items, productsById) {
  return createShippingPackagePlanForItems(items, productsById).packages;
}

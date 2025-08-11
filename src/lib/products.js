import { getRows, getRow, query } from './database';

// Función para obtener productos desde la base de datos
export async function getProducts(filters = {}) {
  try {
    let sql = `
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.short_description,
        p.price,
        p.compare_price,
        p.is_featured,
        p.is_active,
        p.created_at,
        pc.name as category_name,
        pc.slug as category_slug,
        pb.name as brand_name,
        pb.slug as brand_slug,
        COALESCE(
          (SELECT pi.image_url 
           FROM product_images pi 
           WHERE pi.product_id = p.id 
           ORDER BY pi.sort_order ASC, pi.created_at ASC 
           LIMIT 1), 
          'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center'
        ) as image,
        COALESCE(
          (SELECT json_agg(pi.image_url ORDER BY pi.sort_order ASC, pi.created_at ASC)
           FROM product_images pi 
           WHERE pi.product_id = p.id), 
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    // Filtros
    if (filters.category) {
      const categories = filters.category.split(',');
      const placeholders = categories.map(() => `$${++paramCount}`).join(',');
      sql += ` AND pc.slug IN (${placeholders})`;
      params.push(...categories);
    }

    if (filters.brand) {
      const brands = filters.brand.split(',');
      const placeholders = brands.map(() => `$${++paramCount}`).join(',');
      sql += ` AND pb.slug IN (${placeholders})`;
      params.push(...brands);
    }

    if (filters.minPrice) {
      sql += ` AND p.price >= $${++paramCount}`;
      params.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      sql += ` AND p.price <= $${++paramCount}`;
      params.push(parseFloat(filters.maxPrice));
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case 'price_asc':
        sql += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY p.price DESC';
        break;
      case 'name_asc':
        sql += ' ORDER BY p.name ASC';
        break;
      case 'name_desc':
        sql += ' ORDER BY p.name DESC';
        break;
      case 'newest':
      default:
        sql += ' ORDER BY p.created_at DESC';
        break;
    }

    // Paginación
    const limit = filters.limit || 8;
    const offset = ((filters.page || 1) - 1) * limit;
    
    sql += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const products = await getRows(sql, params);

    // Contar total de productos para paginación
    let countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE p.is_active = true
    `;
    
    const countParams = [];
    paramCount = 0;

    if (filters.category) {
      const categories = filters.category.split(',');
      const placeholders = categories.map(() => `$${++paramCount}`).join(',');
      countSql += ` AND pc.slug IN (${placeholders})`;
      countParams.push(...categories);
    }

    if (filters.brand) {
      const brands = filters.brand.split(',');
      const placeholders = brands.map(() => `$${++paramCount}`).join(',');
      countSql += ` AND pb.slug IN (${placeholders})`;
      countParams.push(...brands);
    }

    if (filters.minPrice) {
      countSql += ` AND p.price >= $${++paramCount}`;
      countParams.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      countSql += ` AND p.price <= $${++paramCount}`;
      countParams.push(parseFloat(filters.maxPrice));
    }

    const countResult = await getRow(countSql, countParams);
    const total = parseInt(countResult.total);
    const totalPages = Math.ceil(total / limit);
    const currentPage = filters.page || 1;

    return {
      products: products.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : [],
        price: parseFloat(product.price),
        compare_price: product.compare_price ? parseFloat(product.compare_price) : null
      })),
      total,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  } catch (error) {
    console.error('Error getting products:', error);
    return {
      products: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false
    };
  }
}

// Función para obtener categorías desde la base de datos
export async function getCategories() {
  try {
    const sql = `
      SELECT 
        id,
        name,
        slug,
        description,
        image_url,
        sort_order
      FROM product_categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name ASC
    `;
    
    const categories = await getRows(sql);
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center'
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

// Función para obtener marcas desde la base de datos
export async function getBrands() {
  try {
    const sql = `
      SELECT 
        id,
        name,
        slug,
        description,
        logo_url
      FROM product_brands 
      WHERE is_active = true 
      ORDER BY name ASC
    `;
    
    const brands = await getRows(sql);
    return brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logo: brand.logo_url
    }));
  } catch (error) {
    console.error('Error getting brands:', error);
    return [];
  }
}

// Función para obtener el rango de precios desde la base de datos
export async function getPriceRange() {
  try {
    const sql = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products 
      WHERE is_active = true
    `;
    
    const result = await getRow(sql);
    return {
      min: result.min_price ? parseFloat(result.min_price) : 0,
      max: result.max_price ? parseFloat(result.max_price) : 1000
    };
  } catch (error) {
    console.error('Error getting price range:', error);
    return { min: 0, max: 1000 };
  }
}

// Función para obtener un producto por slug
export async function getProductBySlug(slug) {
  try {
    const sql = `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.description,
        p.short_description,
        p.price,
        p.compare_price,
        p.is_featured,
        p.is_active,
        p.created_at,
        pc.name as category_name,
        pc.slug as category_slug,
        pb.name as brand_name,
        pb.slug as brand_slug,
        COALESCE(
          (SELECT json_agg(pi.image_url ORDER BY pi.sort_order ASC, pi.created_at ASC)
           FROM product_images pi
           WHERE pi.product_id = p.id),
          '[]'::json
        ) as images,
        COALESCE(
          (SELECT json_agg(pf.feature_text ORDER BY pf.sort_order ASC, pf.created_at ASC)
           FROM product_features pf
           WHERE pf.product_id = p.id),
          '[]'::json
        ) as features
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE p.slug = $1 AND p.is_active = true
    `;

    const product = await getRow(sql, [slug]);

    if (!product) return null;

    return {
      ...product,
      brand: product.brand_name, // Added this line
      category: product.category_slug, // Added this line
      images: Array.isArray(product.images) ? product.images : [],
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
      features: Array.isArray(product.features) ? product.features : [],
      price: parseFloat(product.price),
      compare_price: product.compare_price ? parseFloat(product.compare_price) : null
    };
  } catch (error) {
    console.error('Error getting product by slug:', error);
    return null;
  }
}

// Función para obtener características de un producto
export async function getProductFeatures(productId) {
  try {
    const sql = `
      SELECT id, feature_text, sort_order
      FROM product_features
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const features = await getRows(sql, [productId]);
    return features || [];
  } catch (error) {
    console.error('Error getting product features:', error);
    return [];
  }
}

// Función para crear características de un producto
export async function createProductFeatures(productId, features) {
  try {
    if (!Array.isArray(features) || features.length === 0) {
      return [];
    }

    const results = [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature && feature.trim()) {
        // Check if feature already exists to prevent duplicates
        const existingFeature = await getRow(
          'SELECT id FROM product_features WHERE product_id = $1 AND LOWER(feature_text) = LOWER($2)',
          [productId, feature.trim()]
        );
        
        if (!existingFeature) {
          const sql = `
            INSERT INTO product_features (product_id, feature_text, sort_order)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          const result = await getRow(sql, [productId, feature.trim(), i]);
          results.push(result);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error creating product features:', error);
    throw error;
  }
}

// Función para actualizar características de un producto
export async function updateProductFeatures(productId, features) {
  try {
    // Add validation for productId
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      console.error('Invalid productId provided to updateProductFeatures:', productId);
      throw new Error('Invalid product ID provided for feature update. Cannot proceed.');
    }
    
    // Get existing features
    const existingFeatures = await getRows(
      'SELECT id, feature_text FROM product_features WHERE product_id = $1 ORDER BY sort_order ASC',
      [productId]
    );
    
    const existingFeatureTexts = existingFeatures.map(f => f.feature_text.toLowerCase());
    const newFeatures = features.filter(f => f && f.trim());
    
    // Find features to add (new ones)
    const featuresToAdd = newFeatures.filter(f => !existingFeatureTexts.includes(f.trim().toLowerCase()));
    
    // Find features to remove (ones that no longer exist)
    const newFeatureTexts = newFeatures.map(f => f.trim().toLowerCase());
    const featuresToRemove = existingFeatures.filter(f => !newFeatureTexts.includes(f.feature_text.toLowerCase()));
    
    // Remove deleted features
    if (featuresToRemove.length > 0) {
      const deleteIds = featuresToRemove.map(f => f.id);
      const placeholders = deleteIds.map((_, i) => `$${i + 2}`).join(',');
      await query(`DELETE FROM product_features WHERE product_id = $1 AND id IN (${placeholders})`, [productId, ...deleteIds]);
    }
    
    // Add new features
    if (featuresToAdd.length > 0) {
      const nextSortOrder = existingFeatures.length;
      for (let i = 0; i < featuresToAdd.length; i++) {
        const feature = featuresToAdd[i];
        if (feature && feature.trim()) {
          const sql = `
            INSERT INTO product_features (product_id, feature_text, sort_order)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          await getRow(sql, [productId, feature.trim(), nextSortOrder + i]);
        }
      }
    }
    
    // Update sort order for remaining features to match the new order
    const remainingFeatures = newFeatures.filter(f => existingFeatureTexts.includes(f.trim().toLowerCase()));
    for (let i = 0; i < remainingFeatures.length; i++) {
      const feature = remainingFeatures[i];
      const existingFeature = existingFeatures.find(f => f.feature_text.toLowerCase() === feature.trim().toLowerCase());
      if (existingFeature) {
        await query(
          'UPDATE product_features SET sort_order = $1 WHERE id = $2',
          [i, existingFeature.id]
        );
      }
    }
    
    return await getProductFeatures(productId);
  } catch (error) {
    console.error('Error updating product features:', error);
    throw error;
  }
}

// Función para eliminar características de un producto
export async function deleteProductFeatures(productId) {
  try {
    await query('DELETE FROM product_features WHERE product_id = $1', [productId]);
    return true;
  } catch (error) {
    console.error('Error deleting product features:', error);
    throw error;
  }
}

// Función para generar slug desde nombre
export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
} 
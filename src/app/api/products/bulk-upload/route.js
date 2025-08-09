import { NextResponse } from 'next/server';
import { getRows, getRow, transaction } from '../../../../lib/database';

// POST /api/products/bulk-upload - Upload multiple products from CSV
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read the file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    // Validate required columns
    const requiredColumns = ['nombre', 'precio', 'categoria', 'activo'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      );
    }

    const results = {
      success: [],
      errors: [],
      total: dataRows.length
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because we start from line 2 (after header)
      
      try {
        // Parse CSV row (handle commas within quotes)
        const values = parseCSVRow(row);
        
        if (values.length !== header.length) {
          results.errors.push({
            row: rowNumber,
            error: `Column count mismatch. Expected ${header.length}, got ${values.length}`
          });
          continue;
        }

        // Create object from header and values
        const productData = {};
        header.forEach((col, index) => {
          productData[col] = values[index]?.trim() || '';
        });

        // Validate and process the product
        const result = await processProductRow(productData, rowNumber);
        
        if (result.success) {
          results.success.push(result.product);
        } else {
          results.errors.push({
            row: rowNumber,
            error: result.error
          });
        }

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: `Failed to parse row: ${error.message}`
        });
      }
    }

    return NextResponse.json({
      message: `Bulk upload completed. ${results.success.length} products created, ${results.errors.length} errors.`,
      results
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}

// Helper function to parse CSV row (handles commas within quotes)
function parseCSVRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values.map(v => v.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

// Helper function to process a single product row
async function processProductRow(data, rowNumber) {
  try {
    // Validate required fields
    if (!data.nombre || !data.precio || !data.categoria || !data.activo) {
      return {
        success: false,
        error: 'Missing required fields: nombre, precio, categoria, or activo'
      };
    }

    // Validate price format
    const price = parseFloat(data.precio);
    if (isNaN(price) || price < 0) {
      return {
        success: false,
        error: 'Invalid price format'
      };
    }

    // Validate boolean fields
    const activo = data.activo.toLowerCase() === 'true';
    const destacado = data.destacado ? data.destacado.toLowerCase() === 'true' : false;
    const bestseller = data.bestseller ? data.bestseller.toLowerCase() === 'true' : false;
    const permitir_pedidos_pendientes = data.permitir_pedidos_pendientes ? data.permitir_pedidos_pendientes.toLowerCase() === 'true' : false;

    // Get or create category
    let categoryId = null;
    if (data.categoria) {
      const category = await getRow(
        'SELECT id FROM product_categories WHERE name = $1 OR slug = $1',
        [data.categoria]
      );
      
      if (!category) {
        return {
          success: false,
          error: `Category not found: ${data.categoria}`
        };
      }
      categoryId = category.id;
    }

    // Get or create brand
    let brandId = null;
    if (data.marca) {
      const brand = await getRow(
        'SELECT id FROM product_brands WHERE name = $1 OR slug = $1',
        [data.marca]
      );
      
      if (!brand) {
        return {
          success: false,
          error: `Brand not found: ${data.marca}`
        };
      }
      brandId = brand.id;
    }

    // Generate slug if not provided
    let slug = data.slug;
    if (!slug) {
      slug = data.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }

    // Check if slug already exists
    const existingProduct = await getRow(
      'SELECT id FROM products WHERE slug = $1',
      [slug]
    );
    
    if (existingProduct) {
      return {
        success: false,
        error: `Product with slug already exists: ${slug}`
      };
    }

    // Check if SKU already exists
    if (data.sku) {
      const existingSku = await getRow(
        'SELECT id FROM products WHERE sku = $1',
        [data.sku]
      );
      
      if (existingSku) {
        return {
          success: false,
          error: `Product with SKU already exists: ${data.sku}`
        };
      }
    }

    // Insert product
    const productQuery = `
      INSERT INTO products (
        name, slug, description, short_description, price, compare_price, cost_price,
        sku, barcode, stock_quantity, low_stock_threshold, allow_backorders,
        category_id, brand_id, is_active, is_featured, is_bestseller,
        weight_grams, dimensions_cm, meta_title, meta_description, meta_keywords
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING id, name, slug, price
    `;

    const dimensions = data.largo_cm && data.ancho_cm && data.alto_cm 
      ? JSON.stringify({
          length: parseFloat(data.largo_cm) || 0,
          width: parseFloat(data.ancho_cm) || 0,
          height: parseFloat(data.alto_cm) || 0
        })
      : null;

    const product = await getRow(productQuery, [
      data.nombre,
      slug,
      data.descripcion || '',
      data.descripcion_corta || '',
      price,
      data.precio_comparacion ? parseFloat(data.precio_comparacion) : null,
      data.precio_costo ? parseFloat(data.precio_costo) : null,
      data.sku || null,
      data.codigo_barras || null,
      data.cantidad_stock ? parseInt(data.cantidad_stock) : 0,
      data.minimo_stock ? parseInt(data.minimo_stock) : 5,
      permitir_pedidos_pendientes,
      categoryId,
      brandId,
      activo,
      destacado,
      bestseller,
      data.peso_gramos ? parseFloat(data.peso_gramos) : null,
      dimensions,
      data.meta_titulo || null,
      data.meta_descripcion || null,
      data.meta_palabras_clave || null
    ]);

    // Insert images if provided
    if (data.imagen_principal) {
      await getRow(
        'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [product.id, data.imagen_principal, data.nombre, true, 0]
      );
    }

    // Insert additional images
    const additionalImages = [
      data.imagen_2,
      data.imagen_3,
      data.imagen_4,
      data.imagen_5
    ].filter(img => img);

    for (let i = 0; i < additionalImages.length; i++) {
      await getRow(
        'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [product.id, additionalImages[i], `${data.nombre} - Imagen ${i + 2}`, false, i + 1]
      );
    }

    // Insert tags if provided
    if (data.etiquetas) {
      const tags = data.etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      for (const tagName of tags) {
        // Get or create tag
        let tag = await getRow(
          'SELECT id FROM product_tags WHERE name = $1 OR slug = $1',
          [tagName]
        );
        
        if (!tag) {
          const tagSlug = tagName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '-');
          
          tag = await getRow(
            'INSERT INTO product_tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, tagSlug]
          );
        }
        
        // Link tag to product
        await getRow(
          'INSERT INTO product_tag_relationships (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [product.id, tag.id]
        );
      }
    }

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price
      }
    };

  } catch (error) {
    console.error(`Error processing row ${rowNumber}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
} 
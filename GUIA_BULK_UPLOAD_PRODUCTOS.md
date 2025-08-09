# 📦 Guía para Bulk Upload de Productos

## 🎯 Descripción
Este template te permite subir múltiples productos a la vez usando un archivo CSV/Excel. El archivo `template_bulk_upload_productos.csv` contiene todas las columnas necesarias con ejemplos.

## 📋 Instrucciones de Uso

### 1. **Descarga el Template**
- Usa el archivo `template_bulk_upload_productos.csv` como base
- Puedes abrirlo en Excel, Google Sheets, o cualquier editor de hojas de cálculo

### 2. **Preparación de Datos**

#### ✅ **Campos Obligatorios** (NO pueden estar vacíos)
- `nombre` - Nombre del producto
- `precio` - Precio en pesos mexicanos
- `categoria` - Debe existir previamente en el sistema
- `activo` - true o false

#### 📝 **Campos Recomendados**
- `descripcion` - Descripción detallada del producto
- `descripcion_corta` - Resumen breve (máximo 500 caracteres)
- `sku` - Código único del producto
- `cantidad_stock` - Inventario disponible
- `imagen_principal` - URL de la imagen principal

#### 🔧 **Campos Opcionales**
- `precio_comparacion` - Precio "antes" para mostrar descuento
- `precio_costo` - Costo interno del producto
- `marca` - Marca del producto
- `etiquetas` - Tags separados por comas
- Dimensiones físicas, imágenes adicionales, campos SEO, etc.

## 📊 Formato de Datos

### 💰 **Precios**
- Usar formato decimal con punto: `89.00`
- Moneda: Pesos mexicanos (MXN)
- Sin símbolos de moneda en el CSV

### 🏷️ **Etiquetas**
- Separar con comas: `"clásica,res,popular"`
- Usar comillas si contienen espacios

### 🖼️ **Imágenes**
- Usar URLs completas de Unsplash para mejores resultados
- Formato: `https://images.unsplash.com/photo-...`
- La imagen principal es obligatoria si quieres mostrar el producto

### ✅ **Valores Booleanos**
- Usar: `true` o `false` (en minúsculas)
- Campos: `activo`, `destacado`, `bestseller`, `permitir_pedidos_pendientes`

### 📐 **Dimensiones y Peso**
- Peso en gramos: `250`
- Dimensiones en centímetros: `12.5`

## 🚨 Validaciones Importantes

### 1. **SKUs Únicos**
- Cada SKU debe ser único en todo el sistema
- Formato sugerido: `CATEGORIA-NOMBRE-NUMERO` (ej: `HAM-CLAS-001`)

### 2. **Slugs Únicos**
- Si no proporcionas slug, se genera automáticamente del nombre
- Solo usar letras, números y guiones
- Ejemplo: `hamburguesa-clasica`

### 3. **Categorías y Marcas**
- Deben existir previamente en el sistema
- Usar nombres exactos como aparecen en la base de datos

### 4. **Códigos de Barras**
- Deben ser únicos si se proporcionan
- Formato numérico estándar

## 📖 Ejemplos por Tipo de Producto

### 💅 **Esmaltes**
```csv
nombre,precio,categoria,descripcion_corta,peso_gramos,activo
"Esmalte Rojo Pasión",125.00,"Esmaltes","Esmalte rojo brillante de larga duración",15,true
```

### ✨ **Decoración**
```csv
nombre,precio,categoria,descripcion_corta,peso_gramos,activo
"Kit Decoración Flores",199.00,"Decoración","Kit nail art con flores y cristales",45,true
```

### 🛠️ **Herramientas**
```csv
nombre,precio,categoria,descripcion_corta,peso_gramos,largo_cm,ancho_cm,activo
"Lima de Cristal Premium",79.00,"Herramientas","Lima de cristal templado reutilizable",25,14,2,true
```

## ⚠️ Errores Comunes

1. **Precios con formato incorrecto**
   - ❌ `$89,00` 
   - ✅ `89.00`

2. **Valores booleanos incorrectos**
   - ❌ `True`, `TRUE`, `1`, `Si`
   - ✅ `true`, `false`

3. **Categorías inexistentes**
   - Verificar que las categorías existan antes del upload

4. **SKUs duplicados**
   - Cada SKU debe ser único en todo el archivo y sistema

5. **URLs de imágenes rotas**
   - Verificar que las URLs sean válidas y accesibles

## 🔄 Proceso de Upload

1. **Preparar el archivo CSV** con todos los productos
2. **Validar los datos** según esta guía
3. **Ejecutar el bulk upload** a través del sistema
4. **Revisar errores** y corregir si es necesario
5. **Verificar productos** en el catálogo

## 📞 Soporte

Si tienes problemas con el bulk upload:
- Verifica que todos los campos obligatorios estén completos
- Asegúrate de que las categorías y marcas existan
- Revisa que los precios tengan el formato correcto
- Confirma que las URLs de imágenes sean válidas

---

**💡 Tip:** Comienza con pocos productos para probar el proceso antes de subir el inventario completo.
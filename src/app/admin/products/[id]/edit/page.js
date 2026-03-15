'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../lib/AuthContext';
import AdminLayout from '../../../../../components/admin/AdminLayout/AdminLayout';
import Tooltip from '../../../../../components/admin/Tooltip/Tooltip';
import SmartComboBox from '../../../../../components/admin/SmartComboBox/SmartComboBox';
import TagInput from '../../../../../components/admin/TagInput/TagInput';
import ProductDetailsInput from '../../../../../components/admin/ProductDetailsInput/ProductDetailsInput';
import toast from 'react-hot-toast';
import { loadingToast } from '../../../../../lib/toastHelpers';
import styles from '../../create/create.module.css';

// Formulario unificado - todas las secciones en una sola página

export default function EditProductPage() {
  const { user, apiRequest, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  // Formulario unificado - sin pasos
  const [originalStatus, setOriginalStatus] = useState('draft');
  const [autoSaving, setAutoSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: '',
    cost_price: '',
    category_id: '',
    parent_category_id: '',
    brand_id: '',
    stock_quantity: '0',
    low_stock_threshold: '5',
    tcg_product_id: null,
    tcg_group_id: null,
    tcg_category_id: null,
    tcg_sub_type_name: null,
    weight_grams: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    tags: '',
    features: '',
    is_featured: false,
    is_active: false,
    meta_title: '',
    meta_description: '',
    images: []
  });
  const [originalImages, setOriginalImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [originalFeatures, setOriginalFeatures] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadProduct();
      loadCategories();
      loadBrands();
    }
  }, [productId, user]);

  // Inicializar parent_category_id al cargar producto (cuando ya tenemos categorías y category_id)
  useEffect(() => {
    if (categories.length === 0 || !formData.category_id) return;
    const cat = categories.find((c) => c.id === formData.category_id);
    if (!cat) return;
    const parentId = cat.parent_id || formData.category_id;
    setFormData((prev) =>
      prev.parent_category_id === parentId ? prev : { ...prev, parent_category_id: parentId }
    );
  }, [categories, formData.category_id]);
  
  const loadProduct = async () => {
    setLoadingProduct(true);
    try {
      const response = await apiRequest(`/api/admin/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        const product = data.product;
        
        // Parse dimensions from JSON if they exist
        let length_cm = '', width_cm = '', height_cm = '';
        if (product.dimensions_cm && typeof product.dimensions_cm === 'object') {
          length_cm = product.dimensions_cm.length || '';
          width_cm = product.dimensions_cm.width || '';
          height_cm = product.dimensions_cm.height || '';
        } else if (product.dimensions && typeof product.dimensions === 'string') {
          // Handle legacy format: "10 x 5 x 2"
          const dims = product.dimensions.split('x').map(d => d.trim());
          if (dims.length === 3) {
            length_cm = dims[0] || '';
            width_cm = dims[1] || '';
            height_cm = dims[2] || '';
          }
        }

        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          short_description: product.short_description || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          price: product.price || '',
          cost_price: product.cost_price || '',
          category_id: product.category_id || '',
          brand_id: product.brand_id || '',
          stock_quantity: product.stock_quantity || '0',
          low_stock_threshold: product.low_stock_threshold || '5',
          weight_grams: product.weight_grams || '',
          length_cm: length_cm,
          width_cm: width_cm,
          height_cm: height_cm,
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.meta_keywords || '',
          features: Array.isArray(product.features) ? product.features.join('\n') : '',
          is_featured: product.is_featured || false,
          is_active: product.is_active || false,
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          images: product.images || [],
          tcg_product_id: product.tcg_product_id ?? null,
          tcg_group_id: product.tcg_group_id ?? null,
          tcg_category_id: product.tcg_category_id ?? null,
          tcg_sub_type_name: product.tcg_sub_type_name ?? null
        });

        setOriginalImages(product.images || []);
        setOriginalFeatures(Array.isArray(product.features) ? product.features.join('\n') : '');
        setOriginalStatus(product.is_active ? 'published' : 'draft');
      } else {
        console.error('Error loading product:', response.status);
        toast.error('Error al cargar el producto');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiRequest('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        const categories = Array.isArray(data.categories) ? data.categories : (Array.isArray(data.categories?.rows) ? data.categories.rows : []);
        setCategories(categories);
      } else {
        console.error('Error response loading categories:', response.status);
        const errorData = await response.text();
        console.error('Categories error details:', errorData);
        if (response.status === 401) {
          toast.error('Necesitas permisos de administrador. Inicia sesión con: admin@patitomontenegro.com / admin123');
        } else {
          toast.error('Error al cargar categorías');
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Error al conectar con categorías');
    }
  };

  const loadBrands = async () => {
    try {
      const response = await apiRequest('/api/admin/brands');
      if (response.ok) {
        const data = await response.json();
        const brands = Array.isArray(data.brands) ? data.brands : (Array.isArray(data.brands?.rows) ? data.brands.rows : []);
        setBrands(brands);
      } else {
        console.error('Error response loading brands:', response.status);
        const errorData = await response.text();
        console.error('Brands error details:', errorData);
        if (response.status === 401) {
          toast.error('Necesitas permisos de administrador. Inicia sesión con: admin@patitomontenegro.com / admin123');
        } else {
          toast.error('Error al cargar marcas');
        }
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Error al conectar con marcas');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleCategoryUpdate = (newCategory) => {
    setCategories(prev => [...prev, newCategory]);
  };

  const handleBrandUpdate = (newBrand) => {
    setBrands(prev => [...prev, newBrand]);
  };

  const isTcgProduct = formData.tcg_product_id != null;
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.slug.trim()) errors.slug = 'El slug es requerido';
    if (!isTcgProduct && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'El precio debe ser mayor a 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        price: formData.price ? parseFloat(formData.price) : 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        is_featured: formData.is_featured || false,
        is_active: formData.is_active || false,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        tcg_product_id: formData.tcg_product_id ?? null,
        tcg_group_id: formData.tcg_group_id ?? null,
        tcg_category_id: formData.tcg_category_id ?? null,
        tcg_sub_type_name: formData.tcg_sub_type_name ?? null
      };
      // Only send images if they have been modified from the original
      const imagesChanged = JSON.stringify(formData.images) !== JSON.stringify(originalImages);
      if (imagesChanged) {
        productData.images = formData.images;
      }
      // Only send features if they have been modified from the original
      const featuresChanged = formData.features.trim() !== originalFeatures.trim();
      if (featuresChanged) {
        productData.features = formData.features.split('\n').map(feature => feature.trim()).filter(feature => feature);
      }
      const response = await apiRequest(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      if (response.ok) {
        toast.success('Cambios guardados exitosamente');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar los cambios');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  // Formulario unificado - sin navegación por pasos

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    console.log('Starting image upload process...', { fileCount: files.length });
    setUploadingImages(true);
    const uploadedImages = [];
    const failedUploads = [];

    try {
      for (const file of files) {
        console.log('Processing file:', { name: file.name, size: file.size, type: file.type });
        
        // Validate file before upload
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          failedUploads.push({ file: file.name, error: 'Tipo de archivo no válido' });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          console.error('File too large:', file.size);
          failedUploads.push({ file: file.name, error: 'Archivo muy grande (máx. 5MB)' });
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('folder', 'products');

        console.log('Sending upload request for:', file.name);
        
        try {
          const response = await apiRequest('/api/admin/upload', {
            method: 'POST',
            body: uploadFormData
          });

          console.log('Upload response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Upload successful:', data);
            uploadedImages.push({
              url: data.url,
              alt: file.name
            });
          } else {
            const errorData = await response.text();
            console.error('Upload failed:', { status: response.status, error: errorData });
            
            let errorMessage = `Error ${response.status}`;
            try {
              const errorJson = JSON.parse(errorData);
              errorMessage = errorJson.error || errorMessage;
            } catch (e) {
              // Keep the default error message
            }
            
            failedUploads.push({ file: file.name, error: errorMessage });
          }
        } catch (networkError) {
          console.error('Network error during upload:', networkError);
          failedUploads.push({ file: file.name, error: 'Error de conexión' });
        }
      }

      // Update form data with successfully uploaded images
      if (uploadedImages.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedImages]
        }));
      }

      // Show results
      if (uploadedImages.length > 0) {
        toast.success(`${uploadedImages.length} imagen(es) subida(s) exitosamente`);
      }
      
      if (failedUploads.length > 0) {
        console.error('Failed uploads:', failedUploads);
        const failedList = failedUploads.map(f => `${f.file}: ${f.error}`).join(', ');
        toast.error(`Error al subir ${failedUploads.length} imagen(es): ${failedList}`);
      }

    } catch (error) {
      console.error('Error during image upload:', error);
      toast.error(`Error al subir las imágenes: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      handleImageUpload({ target: { files: imageFiles } });
    } else {
      toast.error('Por favor, arrastra solo archivos de imagen');
    }
  };

  const renderFormContent = () => {
    return (
      <div className={styles.formContent}>
        <div className={styles.formIntro}>
          <h2>📝 Editar Producto</h2>
          <p>Modifica la información de tu producto. Puedes actualizar cualquier sección según necesites.</p>
        </div>
        
        {/* Imágenes del Producto - PRIMER ELEMENTO */}
        <div className={styles.subsection}>
          <h3>🖼️ Imágenes del Producto</h3>
          
          <div className={styles.field}>
            <label htmlFor="images">
              Subir Imágenes
              <Tooltip content="Las primeras imágenes que subas serán las principales. Recomendamos al menos 3-5 imágenes de buena calidad. Formatos: JPG, PNG, WebP. Máximo 5MB por imagen.">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <div 
              className={styles.uploadContainer}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="images"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImages}
                className={styles.fileInput}
              />
              {uploadingImages && (
                <div className={styles.uploadingIndicator}>
                  <div className={styles.spinner}></div>
                  <span>Subiendo imágenes...</span>
                </div>
              )}
            </div>
            <small className={styles.helpText}>
              💡 Arrastra archivos aquí o haz clic para seleccionar. Máximo 5MB por imagen.
            </small>
          </div>

          {formData.images.length > 0 && (
            <div className={styles.imageSection}>
              <h4>Imágenes Actuales ({formData.images.length})</h4>
              <div className={styles.imagePreview}>
                {formData.images.map((image, index) => (
                  <div key={index} className={styles.imageItem}>
                    {index === 0 && <div className={styles.primaryBadge}>Principal</div>}
                    <img src={image.url} alt={image.alt} className={styles.productImage} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className={styles.removeImageButton}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.infoCard}>
            <h4>📸 Tips para Mejores Imágenes</h4>
            <ul>
              <li>• La primera imagen será la principal que ven los clientes</li>
              <li>• Usa fondo blanco o neutral para mejor presentación</li>
              <li>• Incluye diferentes ángulos y detalles importantes</li>
              <li>• Resolución mínima recomendada: 800x800 píxeles</li>
              <li>• Formatos compatibles: JPG, PNG, WebP</li>
            </ul>
          </div>
        </div>

        {/* Información Básica */}
        <div className={styles.subsection}>
          <h3>📝 Información Básica</h3>
          
          <div className={styles.field}>
            <label htmlFor="name">
              Nombre del Producto *
              <Tooltip content="El nombre comercial que verán los clientes">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={`${styles.input} ${validationErrors.name ? styles.inputError : ''}`}
              placeholder="Ej: iPhone 15 Pro Max"
            />
            {validationErrors.name && <span className={styles.errorText}>{validationErrors.name}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="slug">
              Slug del Producto *
              <Tooltip content="URL amigable para el producto. Se genera automáticamente del nombre">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              required
              className={`${styles.input} ${validationErrors.slug ? styles.inputError : ''}`}
              placeholder="Ej: iphone-15-pro-max"
            />
            {validationErrors.slug && <span className={styles.errorText}>{validationErrors.slug}</span>}
            <small className={styles.helpText}>
              El slug se genera automáticamente del nombre. Puedes editarlo si es necesario.
            </small>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="short_description">
                Descripción Corta
                <Tooltip content="Resumen breve que aparece en listados de productos (máximo 160 caracteres)">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <textarea
                id="short_description"
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                rows={2}
                maxLength={160}
                className={styles.textarea}
                placeholder="Descripción breve para mostrar en listados..."
              />
              <small className={styles.charCount}>
                {formData.short_description.length}/160 caracteres
              </small>
            </div>

            <div className={styles.field}>
              <label htmlFor="description">
                Descripción Completa
                <Tooltip content="Descripción detallada del producto que verán los clientes">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={styles.textarea}
                placeholder="Describe detalladamente las características, beneficios y especificaciones del producto..."
              />
            </div>
          </div>
        </div>

        {/* Categorización */}
        <div className={styles.subsection}>
          <h3>📋 Categorización y Etiquetas</h3>
          
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="parent_category_id">
                Categoría del Producto
                <Tooltip content="Selecciona la categoría padre. Luego puedes elegir o crear una subcategoría.">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <SmartComboBox
                value={formData.parent_category_id}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  parent_category_id: value,
                  category_id: value
                }))}
                options={categories.filter((c) => !c.parent_id)}
                placeholder="Buscar o crear categoría (opcional)..."
                createEndpoint="/api/admin/categories"
                createLabel="categoría"
                onOptionsUpdate={handleCategoryUpdate}
              />
            </div>

            {formData.parent_category_id && (
              <div className={styles.field}>
                <label htmlFor="category_id">
                  Subcategoría
                  <Tooltip content="Opcional. Elige una subcategoría existente o escribe para crear una nueva.">
                    <span className={styles.helpIcon}>?</span>
                  </Tooltip>
                </label>
                <SmartComboBox
                  value={formData.category_id !== formData.parent_category_id ? formData.category_id : ''}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    category_id: value || prev.parent_category_id
                  }))}
                  options={categories.filter((c) => c.parent_id === formData.parent_category_id)}
                  placeholder="Ninguna o crear subcategoría..."
                  createEndpoint="/api/admin/categories"
                  createLabel="subcategoría"
                  createPayload={{ parent_id: formData.parent_category_id }}
                  onOptionsUpdate={handleCategoryUpdate}
                />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="brand_id">
                Marca del Producto
                <Tooltip content="La marca o fabricante del producto. Opcional pero recomendado para productos con marca conocida">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <SmartComboBox
                value={formData.brand_id}
                onChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}
                options={brands}
                placeholder="Buscar o crear marca (opcional)..."
                createEndpoint="/api/admin/brands"
                createLabel="marca"
                onOptionsUpdate={handleBrandUpdate}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="tags">
              Etiquetas del Producto
              <Tooltip content="Palabras clave que describen tu producto. Ayudan en las búsquedas y mejoran el SEO. Ej: nuevo, oferta, popular, tendencia">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <TagInput
              value={formData.tags}
              onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
              placeholder="Ej: nuevo, oferta, popular, tendencia..."
              maxTags={15}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="features">
              Detalles del producto
              <Tooltip content="Características con nombre y valor. Ej: Materiales → Algodón 100%, Dimensiones → 30x40 cm, Altura → 1.5 m">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <ProductDetailsInput
              value={formData.features}
              onChange={(value) => setFormData(prev => ({ ...prev, features: value }))}
              placeholderName="Ej: Materiales, Dimensiones, Altura"
              placeholderValue="Ej: Algodón 100%, 30x40 cm, 1.5 m"
              maxDetails={50}
            />
          </div>
        </div>

        {/* Código y SKU */}
        <div className={styles.subsection}>
          <h3>🏷️ Código y SKU del Producto</h3>
          
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="sku">
                SKU (Código de Producto) *
                <Tooltip content="SKU significa 'Stock Keeping Unit'. Código único para identificar este producto">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
                className={`${styles.input} ${validationErrors.sku ? styles.inputError : ''}`}
                placeholder="Ej: ABC-123-DEF"
              />
              {validationErrors.sku && <span className={styles.errorText}>{validationErrors.sku}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="barcode">
                Código de Barras (Opcional)
                <Tooltip content="Código de barras del producto si lo tiene">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Escanea con tu lector o escribe manualmente..."
              />
            </div>
          </div>
        </div>

        {/* Precios y Stock */}
        <div className={styles.subsection}>
          <h3>💰 Precios y Control de Inventario</h3>
          
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="price">
                Precio de Venta al Público *
                <Tooltip content="Precio en pesos mexicanos que pagarán los clientes">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.prefix}>$</span>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className={`${styles.input} ${styles.inputWithPrefixField} ${validationErrors.price ? styles.inputError : ''}`}
                  placeholder="0.00"
                />
              </div>
              {validationErrors.price && <span className={styles.errorText}>{validationErrors.price}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="cost_price">
                Precio de Costo
                <Tooltip content="Lo que te cuesta a ti adquirir este producto. Te ayuda a calcular tus ganancias (opcional pero recomendado)">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.prefix}>$</span>
                <input
                  type="number"
                  id="cost_price"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`${styles.input} ${styles.inputWithPrefixField}`}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {formData.price && formData.cost_price && (
            <div className={styles.profitIndicator}>
              <div className={styles.profitCard}>
                <h4>💰 Análisis de Rentabilidad</h4>
                <div className={styles.profitDetails}>
                  <div className={styles.profitItem}>
                    <span>Ganancia por unidad:</span>
                    <strong>${(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}</strong>
                  </div>
                  <div className={styles.profitItem}>
                    <span>Margen de ganancia:</span>
                    <strong>{(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.price)) * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="stock_quantity">
                Cantidad en Stock
                <Tooltip content="¿Cuántas unidades de este producto tienes disponibles para vender?">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="stock_quantity"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                min="0"
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="low_stock_threshold">
                Alerta de Stock Bajo
                <Tooltip content="Te avisaremos cuando queden pocas unidades para que puedas reabastecerte a tiempo. Recomendamos entre 5-10 unidades">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="low_stock_threshold"
                name="low_stock_threshold"
                value={formData.low_stock_threshold}
                onChange={handleInputChange}
                min="0"
                className={styles.input}
                placeholder="5"
              />
            </div>
          </div>
        </div>

        {/* Detalles Físicos */}
        <div className={styles.subsection}>
          <h3>📦 Detalles Físicos (Opcional)</h3>
          
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="weight_grams">
                Peso (gramos)
                <Tooltip content="Peso del producto en gramos. Útil para cálculos de envío">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="weight_grams"
                name="weight_grams"
                value={formData.weight_grams}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={styles.input}
                placeholder="Ej: 500"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="length_cm">
                Largo (cm)
                <Tooltip content="Longitud del producto en centímetros">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="length_cm"
                name="length_cm"
                value={formData.length_cm}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={styles.input}
                placeholder="Ej: 15.5"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="width_cm">
                Ancho (cm)
                <Tooltip content="Ancho del producto en centímetros">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="width_cm"
                name="width_cm"
                value={formData.width_cm}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={styles.input}
                placeholder="Ej: 10.2"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="height_cm">
                Alto (cm)
                <Tooltip content="Altura del producto en centímetros">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="height_cm"
                name="height_cm"
                value={formData.height_cm}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={styles.input}
                placeholder="Ej: 3.0"
              />
            </div>
          </div>
        </div>

        {/* SEO y Configuración */}
        <div className={styles.subsection}>
          <h3>🔍 SEO y Metadatos (Opcional)</h3>
          
          <div className={styles.field}>
            <label htmlFor="meta_title">
              Título SEO
              <Tooltip content="Título que aparece en los resultados de búsqueda de Google. Si está vacío, se usa el nombre del producto">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <input
              type="text"
              id="meta_title"
              name="meta_title"
              value={formData.meta_title}
              onChange={handleInputChange}
              maxLength={60}
              className={styles.input}
              placeholder="Título optimizado para SEO..."
            />
            <small className={styles.charCount}>
              {formData.meta_title.length}/60 caracteres
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="meta_description">
              Descripción SEO
              <Tooltip content="Descripción que aparece en los resultados de búsqueda de Google. Si está vacía, se usa la descripción corta">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <textarea
              id="meta_description"
              name="meta_description"
              value={formData.meta_description}
              onChange={handleInputChange}
              maxLength={160}
              rows={3}
              className={styles.textarea}
              placeholder="Descripción optimizada para motores de búsqueda..."
            />
            <small className={styles.charCount}>
              {formData.meta_description.length}/160 caracteres
            </small>
          </div>
        </div>

        {/* Configuración del Producto */}
        <div className={styles.subsection}>
          <h3>⚙️ Configuración del Producto</h3>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleInputChange}
                className={styles.checkbox}
              />
              <div className={styles.checkboxContent}>
                <strong>⭐ Producto Destacado</strong>
                <span>Aparecerá en la sección de productos destacados de tu tienda</span>
              </div>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className={styles.checkbox}
              />
              <div className={styles.checkboxContent}>
                <strong>👁️ Producto Visible</strong>
                <span>El producto será visible para los clientes en la tienda</span>
              </div>
            </label>
          </div>
        </div>

        {/* Acciones Finales */}
        <div className={styles.statusSection}>
          <h3>💾 Guardar Cambios</h3>
          <div className={styles.statusOptions}>
            <div className={styles.statusOption}>
              <h4>💾 Guardar Cambios</h4>
              <p>Guarda todas las modificaciones realizadas al producto.</p>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className={styles.publishButton}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h4>💡 Proceso Simplificado de Edición</h4>
          <ul>
            <li>• <strong>1️⃣ Imágenes:</strong> Actualiza las fotos de tu producto según necesites</li>
            <li>• <strong>2️⃣ Información básica:</strong> Modifica nombre, slug y descripciones</li>
            <li>• <strong>3️⃣ Categorización:</strong> Cambia categorías, marcas y etiquetas</li>
            <li>• <strong>4️⃣ Códigos:</strong> Ajusta SKU y códigos de barras</li>
            <li>• <strong>5️⃣ Precios:</strong> Actualiza precios y stock</li>
            <li>• <strong>6️⃣ Configuración:</strong> Ajustes finales y guardado</li>
          </ul>
        </div>
      </div>
    );
  };

  // Formulario unificado - código anterior eliminado

  if (loadingProduct) {
    return (
      <AdminLayout title="Editando Producto">
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando producto...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Editar Producto">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Editar Producto</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.backButton}
          >
            ← Volver a Productos
          </button>
        </div>

        {/* Formulario Unificado */}
        <div className={styles.formContainer}>
          {renderFormContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
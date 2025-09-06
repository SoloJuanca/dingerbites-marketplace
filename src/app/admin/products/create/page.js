'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import Tooltip from '../../../../components/admin/Tooltip/Tooltip';
import SmartComboBox from '../../../../components/admin/SmartComboBox/SmartComboBox';
import TagInput from '../../../../components/admin/TagInput/TagInput';
import FeatureInput from '../../../../components/admin/FeatureInput/FeatureInput';
import toast from 'react-hot-toast';
import { loadingToast } from '../../../../lib/toastHelpers';
import styles from './create.module.css';

// Single form approach - no steps needed

export default function CreateProductPage() {
  const { user, apiRequest, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productStatus, setProductStatus] = useState('draft');
  const [draftId, setDraftId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: '',
    cost_price: '',
    category_id: '',
    brand_id: '',
    stock_quantity: '0',
    low_stock_threshold: '5',
    tags: '',
    features: '',
    is_featured: false,
    is_active: false,
    images: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [scanningBarcode, setScanningBarcode] = useState(false);

  // Log cuando cambia el código de barras en formData
  useEffect(() => {
    if (formData.barcode) {
    }
  }, [formData.barcode]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
      loadBrands();
      
      // Test upload endpoint accessibility
      console.log('Testing upload endpoint accessibility...');
      apiRequest('/api/admin/upload', { method: 'HEAD' })
        .then(response => {
          console.log('Upload endpoint test:', response.status);
          if (response.status === 405) {
            console.log('✅ Upload endpoint is accessible (405 = Method Not Allowed for HEAD is expected)');
          }
        })
        .catch(error => {
          console.error('❌ Upload endpoint test failed:', error);
        });
    }
  }, [user, isAuthenticated]);

  // Barcode scanner functionality - solo activo en el campo de código de barras
  useEffect(() => {
    let barcodeTimeout;
    let inputBuffer = '';
    let lastInputTime = 0;
    
    const handleBarcodeInput = (e) => {
      // Solo funcionar si estamos en el campo de código de barras
      if (e.target.id !== 'barcode') {
        return;
      }
      
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastInputTime;

      // Si es un carácter normal y viene muy rápido (típico de escáneres)
      if (e.key && e.key.length === 1 && timeSinceLastKey < 50) {
        // Agregar al buffer para detectar escaneo rápido
        inputBuffer += e.key;
        lastInputTime = currentTime;
        
        // Mostrar indicador de escaneo
        if (inputBuffer.length === 1) {
          setScanningBarcode(true);
        }
        
        // Cancelar timeout anterior si existe
        if (barcodeTimeout) {
          clearTimeout(barcodeTimeout);
        }
        
        // Configurar timeout para detectar fin de escaneo
        barcodeTimeout = setTimeout(() => {
          if (inputBuffer.length >= 6) {
            toast.success(`Código de barras escaneado: ${inputBuffer}`);
          }
          inputBuffer = '';
          setScanningBarcode(false);
        }, 100);
        
      } else if (e.key === 'Enter' && inputBuffer.length > 0) {
        // Enter presionado durante escaneo
        if (barcodeTimeout) {
          clearTimeout(barcodeTimeout);
        }
        
        if (inputBuffer.length >= 6) {
          toast.success(`Código de barras escaneado: ${inputBuffer}`);
        }
        inputBuffer = '';
        setScanningBarcode(false);
        
      } else {
        // Tecla normal o demasiado lenta - limpiar buffer
        inputBuffer = '';
        setScanningBarcode(false);
      }
    };

    // Agregar listener específico para el campo de código de barras
    document.addEventListener('keydown', handleBarcodeInput);
    
    return () => {
      document.removeEventListener('keydown', handleBarcodeInput);
      if (barcodeTimeout) {
        clearTimeout(barcodeTimeout);
      }
    };
  }, []); // Sin dependencias para evitar recrear el listener

  const loadCategories = async () => {
    try {
      const response = await apiRequest('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        
        const categories = Array.isArray(data.categories.rows) ? data.categories.rows : [];
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
        
        const brands = Array.isArray(data.brands.rows) ? data.brands.rows : [];
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
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      };

      // Auto-generate SKU when name changes (category is now optional)
      if (name === 'name' && updated.name) {
        const newSKU = generateSKUFromData(updated);
        updated.sku = newSKU;
      }
      
      // Update SKU when category changes (if name exists)
      if (name === 'category_id' && updated.name) {
        const newSKU = generateSKUFromData(updated);
        updated.sku = newSKU;
      }

      return updated;
    });

    // Auto-generate slug when name changes
    if (name === 'name') {
      const newSlug = generateSlug(newValue);
      setFormData(prev => ({
        ...prev,
        slug: newSlug
      }));
    }

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

  const generateSKUFromData = (data) => {
    if (!data.name) return '';
    
    const categoryName = categories.find(cat => cat.id === data.category_id)?.name || '';
    const brandName = brands.find(brand => brand.id === data.brand_id)?.name || '';
    
    // Extract first 3 letters from each component
    const categoryCode = categoryName ? categoryName.substring(0, 3).toUpperCase() : 'GEN'; // Generic if no category
    const brandCode = brandName ? brandName.substring(0, 3).toUpperCase() : '';
    const productCode = data.name.substring(0, 3).toUpperCase();
    
    // Generate random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    // Combine components
    const skuParts = [categoryCode, brandCode, productCode, randomNum].filter(Boolean);
    return skuParts.join('-');
  };

  const generateSKU = () => {
    return generateSKUFromData(formData);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'El precio debe ser mayor a 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateSlug = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  // Step navigation functions removed - single form approach

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

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

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleImageUpload(files);
    // Clear the input so the same file can be uploaded again if needed
    e.target.value = '';
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
      handleImageUpload(imageFiles);
    } else {
      toast.error('Por favor, arrastra solo archivos de imagen');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveDraft = async () => {
    const submitPromise = async () => {
      setLoading(true);
      
      const slug = generateSlug(formData.name);
      const productData = {
        name: formData.name,
        slug: slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        price: formData.price && parseFloat(formData.price) > 0 ? parseFloat(formData.price) : 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        is_active: false,
        is_featured: formData.is_featured || false,
        meta_keywords: formData.tags && formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).join(', ') : null,
        images: formData.images || [],
        features: formData.features && formData.features.trim() ? formData.features.split('\n').map(feature => feature.trim()).filter(feature => feature) : []
      };

      let response;
      if (draftId) {
        response = await apiRequest(`/api/admin/products/${draftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      } else {
        response = await apiRequest('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar borrador');
      }

      return response.json();
    };

    try {
      await loadingToast(submitPromise(), {
        loading: 'Guardando borrador...',
        success: 'Borrador guardado exitosamente',
        error: 'Error al guardar borrador'
      });

      router.push('/admin/products');
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    // Validate required fields before publishing
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos antes de publicar');
      return;
    }

    const submitPromise = async () => {
      setLoading(true);
      
      const slug = generateSlug(formData.name);
      const productData = {
        name: formData.name,
        slug: slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        is_active: true,
        is_featured: formData.is_featured || false,
        meta_keywords: formData.tags && formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).join(', ') : null,
        images: formData.images || [],
        features: formData.features && formData.features.trim() ? formData.features.split('\n').map(feature => feature.trim()).filter(feature => feature) : []
      };

      let response;
      if (draftId) {
        response = await apiRequest(`/api/admin/products/${draftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      } else {
        response = await apiRequest('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al publicar el producto');
      }

      return response.json();
    };

    try {
      await loadingToast(submitPromise(), {
        loading: 'Publicando producto...',
        success: 'Producto publicado exitosamente',
        error: 'Error al publicar el producto'
      });

      router.push('/admin/products');
    } catch (error) {
      console.error('Error publishing product:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    return (
      <div className={styles.formContent}>
        <h2>Crear Nuevo Producto</h2>
        
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
                onChange={handleFileInputChange}
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
              <label htmlFor="category_id">
                Categoría del Producto
                <Tooltip content="Ayuda a los clientes a encontrar tu producto. Puedes crear una nueva si no existe. Campo opcional">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <SmartComboBox
                value={formData.category_id}
                onChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                options={categories}
                placeholder="Buscar o crear categoría (opcional)..."
                createEndpoint="/api/admin/categories"
                createLabel="categoría"
                onOptionsUpdate={handleCategoryUpdate}
              />
            </div>

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
              Características del Producto
              <Tooltip content="Detalles adicionales que describen las características del producto. Ej: Secado rápido, Color vibrante, Sin formaldehído">
                <span className={styles.helpIcon}>?</span>
              </Tooltip>
            </label>
            <FeatureInput
              value={formData.features}
              onChange={(value) => setFormData(prev => ({ ...prev, features: value }))}
              placeholder="Ej: Secado rápido, Color vibrante, Sin formaldehído..."
              maxFeatures={50}
            />
          </div>
        </div>

        {/* Código y SKU */}
        <div className={styles.subsection}>
          <h3>🏷️ Código y SKU del Producto</h3>
          
          <div className={styles.skuGenerator}>
            <div className={styles.skuPreview}>
              <h4>SKU Generado Automáticamente</h4>
              <div className={styles.skuDisplay}>
                <span className={styles.skuCode}>{formData.sku || 'Completa el nombre para generar SKU'}</span>
                <div className={styles.autoIndicator}>
                  ⚡ Generación automática
                </div>
              </div>
              
              {formData.sku && (
                <div className={styles.skuBreakdown}>
                  <p><strong>Componentes del SKU:</strong></p>
                  <div className={styles.skuParts}>
                    <div className={styles.skuPart}>
                      <span className={styles.partLabel}>Categoría</span>
                      <span className={styles.partValue}>
                        {categories.find(cat => cat.id === formData.category_id)?.name.substring(0, 3).toUpperCase() || 'GEN'}
                      </span>
                    </div>
                    {formData.brand_id && (
                      <div className={styles.skuPart}>
                        <span className={styles.partLabel}>Marca</span>
                        <span className={styles.partValue}>
                          {brands.find(brand => brand.id === formData.brand_id)?.name.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className={styles.skuPart}>
                      <span className={styles.partLabel}>Producto</span>
                      <span className={styles.partValue}>
                        {formData.name.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.skuPart}>
                      <span className={styles.partLabel}>Número</span>
                      <span className={styles.partValue}>
                        {formData.sku ? formData.sku.split('-').pop() : 'XXX'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="sku">
                SKU (Código de Producto)
                <Tooltip content="SKU significa 'Stock Keeping Unit'. Se genera automáticamente cuando completas el nombre y categoría.">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                readOnly
                className={`${styles.input} ${styles.inputReadonly}`}
                placeholder="Se generará automáticamente..."
              />
              <small className={styles.helpText}>
                El SKU se genera automáticamente basado en el nombre del producto, categoría (opcional) y marca (opcional).
              </small>
            </div>

            <div className={styles.field}>
              <label htmlFor="barcode">
                Código de Barras (Opcional)
                <Tooltip content="Escanea el código de barras del producto o escríbelo manualmente. Compatible con escáneres automáticos.">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <div className={styles.barcodeInputContainer}>
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  className={`${styles.input} ${scanningBarcode ? styles.inputScanning : ''}`}
                  placeholder="Escanea con tu lector o escribe manualmente..."
                />
                {scanningBarcode && (
                  <div className={styles.scanningIndicator}>
                    📱 Escaneando...
                  </div>
                )}
              </div>
              <small className={styles.helpText}>
                📱 Usa tu escáner de códigos de barras para llenar automáticamente este campo.
              </small>
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
          </div>
        </div>

        {/* Acciones Finales */}
        <div className={styles.statusSection}>
          <h3>🚀 ¿Qué quieres hacer con este producto?</h3>
          <div className={styles.statusOptions}>
            <div className={styles.statusOption}>
              <h4>💾 Guardar como Borrador</h4>
              <p>Guarda tu trabajo para continuar después. El producto no será visible para los clientes.</p>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className={styles.draftButton}
              >
                {loading ? 'Guardando...' : 'Guardar Borrador'}
              </button>
            </div>
            
            <div className={styles.statusOption}>
              <h4>✅ Publicar Producto</h4>
              <p>Hace el producto visible y disponible para compra inmediatamente.</p>
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className={styles.publishButton}
              >
                {loading ? 'Publicando...' : 'Publicar Producto'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h4>💡 Tips para crear un buen producto</h4>
          <ul>
            <li>• <strong>Comienza con las imágenes</strong> - Son lo primero que ven los clientes</li>
            <li>• El <strong>SKU se genera automáticamente</strong> al completar el nombre del producto</li>
            <li>• <strong>Categoría y marca son opcionales</strong> - pero ayudan a organizar mejor tu inventario</li>
            <li>• <strong>Escáner de códigos:</strong> Usa tu lector para llenar automáticamente el código de barras</li>
            <li>• Las <strong>etiquetas</strong> ayudan a los clientes a encontrar tu producto</li>
            <li>• Puedes crear nuevas categorías y marcas directamente desde los campos de búsqueda</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Crear Producto">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Crear Nuevo Producto</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.backButton}
          >
            ← Volver a Productos
          </button>
        </div>

        {/* Single Form Content */}
        <div className={styles.formContainer}>
          {renderFormContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
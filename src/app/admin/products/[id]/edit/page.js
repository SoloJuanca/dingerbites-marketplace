'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../lib/AuthContext';
import AdminLayout from '../../../../../components/admin/AdminLayout/AdminLayout';
import Tooltip from '../../../../../components/admin/Tooltip/Tooltip';
import SmartComboBox from '../../../../../components/admin/SmartComboBox/SmartComboBox';
import TagInput from '../../../../../components/admin/TagInput/TagInput';
import toast from 'react-hot-toast';
import { loadingToast } from '../../../../../lib/toastHelpers';
import styles from '../../create/create.module.css';

const STEPS = [
  { id: 1, title: 'Información y Categorización', icon: '📝' },
  { id: 2, title: 'Precios y Stock', icon: '💰' },
  { id: 3, title: 'Detalles Físicos', icon: '📦' },
  { id: 4, title: 'Imágenes', icon: '🖼️' },
  { id: 5, title: 'SEO y Configuración', icon: '⚙️' }
];

export default function EditProductPage() {
  const { user, apiRequest, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
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
    brand_id: '',
    stock_quantity: '0',
    low_stock_threshold: '5',
    weight_grams: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    tags: '',
    is_featured: false,
    is_active: false,
    meta_title: '',
    meta_description: '',
    images: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      loadProduct();
      loadCategories();
      loadBrands();
    }
  }, [productId, user]);

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
          stock_quantity: product.stock_quantity || '',
          low_stock_threshold: product.low_stock_threshold || '',
          weight_grams: product.weight_grams || product.weight || '',
          length_cm: length_cm,
          width_cm: width_cm,
          height_cm: height_cm,
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
          is_featured: product.is_featured || false,
          is_active: product.is_active !== false,
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          images: product.images || []
        });
        
        setOriginalStatus(product.is_active ? 'published' : 'draft');
        
        // Marcar pasos como completados basándose en los datos existentes
        const newCompletedSteps = new Set();
        if (product.name && product.slug && product.category_id && product.sku) {
          newCompletedSteps.add(1);
        }
        if (product.price && parseFloat(product.price) > 0) {
          newCompletedSteps.add(2);
        }
        if (product.weight_grams || product.dimensions_cm) {
          newCompletedSteps.add(3);
        }
        if (product.images && product.images.length > 0) {
          newCompletedSteps.add(4);
        }
        if (product.meta_title || product.meta_description) {
          newCompletedSteps.add(5);
        }
        setCompletedSteps(newCompletedSteps);
      } else {
        toast.error('Error al cargar el producto');
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error de red al cargar el producto');
      router.push('/admin/products');
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiRequest('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories.rows || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await apiRequest('/api/admin/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands.rows || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

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

  const generateSKU = () => {
    if (!formData.name || !formData.category_id) return '';
    
    const categoryName = categories.find(cat => cat.id === formData.category_id)?.name || '';
    const brandName = brands.find(brand => brand.id === formData.brand_id)?.name || '';
    
    const categoryCode = categoryName.substring(0, 3).toUpperCase();
    const brandCode = brandName ? brandName.substring(0, 3).toUpperCase() : '';
    const productCode = formData.name.substring(0, 3).toUpperCase();
    
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    const skuParts = [categoryCode, brandCode, productCode, randomNum].filter(Boolean);
    return skuParts.join('-');
  };

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) errors.name = 'El nombre es requerido';
        if (!formData.slug.trim()) errors.slug = 'El slug es requerido';
        if (!formData.category_id) errors.category_id = 'La categoría es requerida';
        if (!formData.sku.trim()) errors.sku = 'El SKU es requerido';
        break;
      case 2:
        if (!formData.price || parseFloat(formData.price) <= 0) {
          errors.price = 'El precio debe ser mayor a 0';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const autoSaveDraft = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) return;

    setAutoSaving(true);
    try {
      const productData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        brand_id: formData.brand_id || null,
        is_active: originalStatus === 'published' ? true : false,
        status: originalStatus === 'published' ? 'published' : 'draft'
      };

      const response = await apiRequest(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        toast.success('Cambios guardados automáticamente', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error auto-saving:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      await autoSaveDraft();
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    // Permitir ir a cualquier paso ya completado o al paso actual
    if (completedSteps.has(step) || step <= currentStep || step === 1) {
      setCurrentStep(step);
    } else {
      toast.error('Debes completar los pasos anteriores primero');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedImages = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiRequest('/api/admin/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          uploadedImages.push({
            url: data.url,
            alt: file.name
          });
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));

      toast.success(`${uploadedImages.length} imagen(es) subida(s) exitosamente`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Error al subir las imágenes');
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

  const handlePublish = async () => {
    const allStepsValid = STEPS.every(step => validateStep(step.id));
    
    if (!allStepsValid) {
      toast.error('Por favor completa todos los campos requeridos antes de publicar');
      return;
    }

    const submitPromise = async () => {
      setLoading(true);
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        brand_id: formData.brand_id || null,
        is_active: true,
        status: 'published'
      };

      const response = await apiRequest(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

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

  const handleHide = async () => {
    const submitPromise = async () => {
      setLoading(true);
      
      const productData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        brand_id: formData.brand_id || null,
        is_active: false,
        status: 'hidden'
      };

      const response = await apiRequest(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ocultar el producto');
      }

      return response.json();
    };

    try {
      await loadingToast(submitPromise(), {
        loading: 'Ocultando producto...',
        success: 'Producto ocultado exitosamente',
        error: 'Error al ocultar el producto'
      });

      router.push('/admin/products');
    } catch (error) {
      console.error('Error hiding product:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h2>Información del Producto y Categorización</h2>
            
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

            <div className={styles.subsection}>
              <h3>📋 Categorización y Etiquetas</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="category_id">
                    Categoría del Producto *
                    <Tooltip content="Ayuda a los clientes a encontrar tu producto. Puedes crear una nueva si no existe">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  </label>
                  <SmartComboBox
                    value={formData.category_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    options={categories}
                    placeholder="Buscar o crear categoría..."
                    createEndpoint="/api/admin/categories"
                    createLabel="categoría"
                    onOptionsUpdate={handleCategoryUpdate}
                  />
                  {validationErrors.category_id && <span className={styles.errorText}>{validationErrors.category_id}</span>}
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
                    placeholder="Buscar o crear marca..."
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
            </div>

            <div className={styles.subsection}>
              <h3>🏷️ Código y SKU del Producto</h3>
              
              <div className={styles.skuGenerator}>
                <div className={styles.skuPreview}>
                  <h4>SKU Generado Automáticamente</h4>
                  <div className={styles.skuDisplay}>
                    <span className={styles.skuCode}>{generateSKU() || 'SKU-PENDIENTE'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newSKU = generateSKU();
                        if (newSKU) {
                          setFormData(prev => ({ ...prev, sku: newSKU }));
                          toast.success('SKU generado automáticamente');
                        } else {
                          toast.error('Completa el nombre y categoría primero');
                        }
                      }}
                      className={styles.generateButton}
                      disabled={!formData.name || !formData.category_id}
                    >
                      🔄 Generar SKU
                    </button>
                  </div>
                  
                  {generateSKU() && (
                    <div className={styles.skuBreakdown}>
                      <p><strong>Componentes:</strong></p>
                      <div className={styles.skuParts}>
                        <div className={styles.skuPart}>
                          <span className={styles.partLabel}>Categoría</span>
                          <span className={styles.partValue}>
                            {categories.find(cat => cat.id === formData.category_id)?.name.substring(0, 3).toUpperCase()}
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
                          <span className={styles.partValue}>XXX</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="sku">
                    SKU (Código de Producto) *
                    <Tooltip content="SKU significa 'Stock Keeping Unit'. Es un código único que identifica este producto en tu inventario.">
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
                    placeholder="Ej: ELE-APP-IPH-123"
                  />
                  {validationErrors.sku && <span className={styles.errorText}>{validationErrors.sku}</span>}
                  <small className={styles.helpText}>
                    Puedes usar el SKU generado automáticamente o crear uno personalizado.
                  </small>
                </div>

                <div className={styles.field}>
                  <label htmlFor="barcode">
                    Código de Barras
                    <Tooltip content="Código de barras del producto para escaneo en tienda (opcional). También llamado EAN o UPC">
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
                    placeholder="Ej: 1234567890123"
                  />
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h4>💡 Tips para este paso</h4>
              <ul>
                <li>• Completa primero el <strong>nombre</strong> y <strong>categoría</strong> para generar el SKU automáticamente</li>
                <li>• El <strong>slug</strong> se genera automáticamente del nombre y es la URL del producto</li>
                <li>• Las <strong>etiquetas</strong> ayudan a los clientes a encontrar tu producto</li>
                <li>• El <strong>SKU</strong> debe ser único en todo tu inventario</li>
                <li>• Puedes crear nuevas categorías y marcas directamente desde los campos de búsqueda</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>Precios y Stock</h2>
            
            <div className={styles.subsection}>
              <h3>💰 Información de Precios</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="price">
                    Precio de Venta *
                    <Tooltip content="Precio al que se venderá el producto a los clientes">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    className={`${styles.input} ${validationErrors.price ? styles.inputError : ''}`}
                    placeholder="0.00"
                  />
                  {validationErrors.price && <span className={styles.errorText}>{validationErrors.price}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="cost_price">
                    Precio de Costo
                    <Tooltip content="Precio que te costó adquirir el producto. Ayuda a calcular márgenes de ganancia">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    id="cost_price"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3>📦 Gestión de Inventario</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="stock_quantity">
                    Cantidad en Stock
                    <Tooltip content="Número de unidades disponibles para la venta">
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
                    Umbral de Stock Bajo
                    <Tooltip content="Cuando el stock llegue a este número, recibirás una alerta">
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

            <div className={styles.infoCard}>
              <h4>💡 Tips para este paso</h4>
              <ul>
                <li>• El <strong>precio de venta</strong> es obligatorio para productos publicados</li>
                <li>• El <strong>precio de costo</strong> te ayuda a calcular márgenes de ganancia</li>
                <li>• El <strong>stock</strong> se actualiza automáticamente con las ventas</li>
                <li>• Configura el <strong>umbral de stock bajo</strong> para recibir alertas</li>
              </ul>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <h2>Detalles Físicos</h2>
            
            <div className={styles.subsection}>
              <h3>📦 Dimensiones y Peso</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="weight_grams">
                    Peso (gramos)
                    <Tooltip content="Peso del producto en gramos. Importante para calcular costos de envío">
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
                    placeholder="0.0"
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
                    placeholder="0.0"
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
                    placeholder="0.0"
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
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h4>💡 Tips para este paso</h4>
              <ul>
                <li>• El <strong>peso</strong> es importante para calcular costos de envío</li>
                <li>• Las <strong>dimensiones</strong> (largo, ancho, alto) ayudan a determinar el tamaño del empaque</li>
                <li>• Puedes usar decimales para medidas precisas</li>
                <li>• Este paso es opcional pero recomendado para productos físicos</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <h2>Imágenes del Producto</h2>
            
            <div className={styles.subsection}>
              <h3>🖼️ Subir Imágenes</h3>
              
              <div className={styles.field}>
                <label htmlFor="imageUpload">
                  Seleccionar Imágenes
                  <Tooltip content="Puedes subir múltiples imágenes. La primera será la imagen principal">
                    <span className={styles.helpIcon}>?</span>
                  </Tooltip>
                </label>
                <input
                  type="file"
                  id="imageUpload"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                  disabled={uploadingImages}
                />
                {uploadingImages && (
                  <div className={styles.uploadingIndicator}>
                    <div className={styles.spinner}></div>
                    Subiendo imágenes...
                  </div>
                )}
              </div>
            </div>

            {formData.images.length > 0 && (
              <div className={styles.subsection}>
                <h3>📸 Imágenes Actuales</h3>
                <div className={styles.imageGrid}>
                  {formData.images.map((image, index) => (
                    <div key={index} className={styles.imageItem}>
                      <img 
                        src={image.url} 
                        alt={image.alt || `Imagen ${index + 1}`}
                        className={styles.productImage}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className={styles.removeImageButton}
                      >
                        ✕
                      </button>
                      {index === 0 && (
                        <div className={styles.primaryBadge}>Principal</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.infoCard}>
              <h4>💡 Tips para este paso</h4>
              <ul>
                <li>• La <strong>primera imagen</strong> será la imagen principal del producto</li>
                <li>• Usa imágenes de <strong>alta calidad</strong> (mínimo 800x800 píxeles)</li>
                <li>• Puedes subir <strong>múltiples imágenes</strong> para mostrar diferentes ángulos</li>
                <li>• Las imágenes se <strong>optimizan automáticamente</strong> para la web</li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className={styles.stepContent}>
            <h2>SEO y Configuración</h2>
            
            <div className={styles.subsection}>
              <h3>🔍 Optimización para Buscadores</h3>
              
              <div className={styles.field}>
                <label htmlFor="meta_title">
                  Título SEO
                  <Tooltip content="Título que aparecerá en los resultados de búsqueda. Máximo 60 caracteres">
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
                  placeholder="Título optimizado para buscadores..."
                />
                <small className={styles.charCount}>
                  {formData.meta_title.length}/60 caracteres
                </small>
              </div>

              <div className={styles.field}>
                <label htmlFor="meta_description">
                  Descripción SEO
                  <Tooltip content="Descripción que aparecerá en los resultados de búsqueda. Máximo 160 caracteres">
                    <span className={styles.helpIcon}>?</span>
                  </Tooltip>
                </label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={160}
                  className={styles.textarea}
                  placeholder="Descripción atractiva para los resultados de búsqueda..."
                />
                <small className={styles.charCount}>
                  {formData.meta_description.length}/160 caracteres
                </small>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3>⚙️ Configuración del Producto</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxText}>
                      Producto Destacado
                      <Tooltip content="Los productos destacados aparecen en posiciones especiales del sitio">
                        <span className={styles.helpIcon}>?</span>
                      </Tooltip>
                    </span>
                  </label>
                </div>

                <div className={styles.field}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxText}>
                      Producto Activo
                      <Tooltip content="Los productos inactivos no son visibles para los clientes">
                        <span className={styles.helpIcon}>?</span>
                      </Tooltip>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h4>💡 Tips para este paso</h4>
              <ul>
                <li>• El <strong>título SEO</strong> debe ser atractivo y contener palabras clave</li>
                <li>• La <strong>descripción SEO</strong> debe ser convincente para generar clics</li>
                <li>• Los <strong>productos destacados</strong> tienen mayor visibilidad</li>
                <li>• Los <strong>productos inactivos</strong> no aparecen en el catálogo</li>
              </ul>
            </div>
          </div>
        );

      default:
        return <div>Paso en desarrollo...</div>;
    }
  };

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

        <div className={styles.stepsContainer}>
          <div className={styles.stepsHeader}>
            <h2>Progreso de Edición</h2>
            <span className={styles.stepCounter}>{currentStep} de {STEPS.length}</span>
          </div>
          
          <div className={styles.steps}>
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`${styles.step} ${
                  currentStep === step.id ? styles.stepActive : 
                  completedSteps.has(step.id) ? styles.stepCompleted : styles.stepPending
                } ${
                  step.id > currentStep && !completedSteps.has(step.id) && step.id !== 1 ? styles.stepBlocked : ''
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div className={styles.stepIcon}>
                  {completedSteps.has(step.id) ? '✓' : step.icon}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepNumber}>Paso {step.id}</div>
                  {completedSteps.has(step.id) && (
                    <div className={styles.stepStatus}>Completado</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          {renderStepContent()}
        </div>

        {autoSaving && (
          <div className={styles.autoSaveIndicator}>
            <div className={styles.spinner}></div>
            Guardando cambios...
          </div>
        )}

        {currentStep < 5 && (
          <div className={styles.navigation}>
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={styles.prevButton}
            >
              ← Anterior
            </button>
            
            <div className={styles.navInfo}>
              Paso {currentStep} de {STEPS.length}
            </div>
            
            <button
              type="button"
              onClick={nextStep}
              className={styles.nextButton}
            >
              Siguiente →
            </button>
          </div>
        )}

        {currentStep === 5 && (
          <div className={styles.finalActions}>
            <button
              type="button"
              onClick={handleHide}
              disabled={loading}
              className={styles.hideButton}
            >
              {loading ? 'Procesando...' : 'Ocultar Producto'}
            </button>
            
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className={styles.publishButton}
            >
              {loading ? 'Publicando...' : 'Publicar Producto'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
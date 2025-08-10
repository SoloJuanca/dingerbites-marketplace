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

const STEPS = [
  { id: 1, title: 'Información y Categorización', icon: '📝' },
  { id: 2, title: 'Precios y Stock', icon: '💰' },
  { id: 3, title: 'Detalles Físicos', icon: '📦' },
  { id: 4, title: 'Imágenes', icon: '🖼️' },
  { id: 5, title: 'SEO y Configuración', icon: '⚙️' }
];

export default function CreateProductPage() {
  const { user, apiRequest, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('Is authenticated:', isAuthenticated);
    if (isAuthenticated) {
      loadCategories();
      loadBrands();
    }
  }, [user, isAuthenticated]);

  const loadCategories = async () => {
    try {
      const response = await apiRequest('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        console.log('Categories loaded:', data);
        console.log('Categories array:', data.categories.rows);
        
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
        console.log('Brands loaded:', data);
        console.log('Brands array:', data.brands.rows);
        
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
    
    // Extract first 3 letters from each component
    const categoryCode = categoryName.substring(0, 3).toUpperCase();
    const brandCode = brandName ? brandName.substring(0, 3).toUpperCase() : '';
    const productCode = formData.name.substring(0, 3).toUpperCase();
    
    // Generate random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    // Combine components
    const skuParts = [categoryCode, brandCode, productCode, randomNum].filter(Boolean);
    return skuParts.join('-');
  };

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) errors.name = 'El nombre es requerido';
        if (!formData.category_id) errors.category_id = 'La categoría es requerida';
        if (!formData.sku.trim()) errors.sku = 'El SKU es requerido';
        break;
      case 2:
        if (!formData.price || parseFloat(formData.price) <= 0) {
          errors.price = 'El precio debe ser mayor a 0';
        }
        break;
      // Steps 3, 4, 5 don't have required fields
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

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      
      // Move to next step
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    // Only allow going to completed steps or the next immediate step
    if (step <= currentStep || completedSteps.has(step - 1) || step === 1) {
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
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        is_active: false,
        is_featured: formData.is_featured || false,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
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
    // Validate all required fields before publishing
    const allStepsValid = STEPS.every(step => validateStep(step.id));
    
    if (!allStepsValid) {
      toast.error('Por favor completa todos los campos requeridos antes de publicar');
      return;
    }

    // Extra validation for publishing - price is required
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('El precio es requerido para publicar el producto');
      setCurrentStep(2); // Go to price step
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
        weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
        dimensions_cm: (formData.length_cm || formData.width_cm || formData.height_cm) ? {
          length: formData.length_cm ? parseFloat(formData.length_cm) : null,
          width: formData.width_cm ? parseFloat(formData.width_cm) : null,
          height: formData.height_cm ? parseFloat(formData.height_cm) : null
        } : null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        is_active: true,
        is_featured: formData.is_featured || false,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h2>Información del Producto y Categorización</h2>
            
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

            {/* Generador de SKU */}
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
                <li>• Las <strong>etiquetas</strong> ayudan a los clientes a encontrar tu producto</li>
                <li>• El <strong>SKU</strong> debe ser único en todo tu inventario</li>
                <li>• Puedes crear nuevas categorías y marcas directamente desde los campos de búsqueda</li>
                <li>• 📝 <strong>Borrador automático:</strong> Tu progreso se guarda automáticamente al avanzar pasos</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>Precios y Control de Inventario</h2>
            
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
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <h2>Detalles Físicos y Envío</h2>
            
            <div className={styles.subsection}>
              <h3>📦 Peso del Producto</h3>
              
              <div className={styles.field}>
                <label htmlFor="weight_grams">
                  Peso (gramos)
                  <Tooltip content="Peso del producto en gramos. Importante para calcular costos de envío">
                    <span className={styles.helpIcon}>?</span>
                  </Tooltip>
                </label>
                <div className={styles.inputWithSuffix}>
                  <input
                    type="number"
                    id="weight_grams"
                    name="weight_grams"
                    value={formData.weight_grams}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className={`${styles.input} ${styles.inputWithSuffixField}`}
                    placeholder="0.0"
                  />
                  <span className={styles.suffix}>g</span>
                </div>
                <small className={styles.helpText}>
                  Puedes usar decimales para pesos precisos (ej: 250.5 para 250.5 gramos)
                </small>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3>📏 Dimensiones del Producto</h3>
              
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="length_cm">
                    Largo (cm)
                    <Tooltip content="Longitud del producto en centímetros">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  </label>
                  <div className={styles.inputWithSuffix}>
                    <input
                      type="number"
                      id="length_cm"
                      name="length_cm"
                      value={formData.length_cm}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      className={`${styles.input} ${styles.inputWithSuffixField}`}
                      placeholder="0.0"
                    />
                    <span className={styles.suffix}>cm</span>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="width_cm">
                    Ancho (cm)
                    <Tooltip content="Ancho del producto en centímetros">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  </label>
                  <div className={styles.inputWithSuffix}>
                    <input
                      type="number"
                      id="width_cm"
                      name="width_cm"
                      value={formData.width_cm}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      className={`${styles.input} ${styles.inputWithSuffixField}`}
                      placeholder="0.0"
                    />
                    <span className={styles.suffix}>cm</span>
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="height_cm">
                  Alto (cm)
                  <Tooltip content="Altura del producto en centímetros">
                    <span className={styles.helpIcon}>?</span>
                  </Tooltip>
                </label>
                <div className={styles.inputWithSuffix}>
                  <input
                    type="number"
                    id="height_cm"
                    name="height_cm"
                    value={formData.height_cm}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className={`${styles.input} ${styles.inputWithSuffixField}`}
                    placeholder="0.0"
                  />
                  <span className={styles.suffix}>cm</span>
                </div>
              </div>
            </div>
            
            <div className={styles.infoCard}>
              <h4>💡 ¿Por qué es importante el peso y las dimensiones?</h4>
              <ul>
                <li>• Calcula automáticamente los costos de envío</li>
                <li>• Ayuda a determinar el mejor método de empaque</li>
                <li>• Mejora la experiencia del cliente con información precisa</li>
                <li>• Facilita la gestión de inventario y almacenamiento</li>
                <li>• Las dimensiones se almacenan como Largo × Ancho × Alto</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <h2>Imágenes del Producto</h2>
            
            <div className={styles.field}>
              <label htmlFor="images">
                Subir Imágenes
                <Tooltip content="Las primeras imágenes que subas serán las principales. Recomendamos al menos 3-5 imágenes de buena calidad">
                  <span className={styles.helpIcon}>?</span>
                </Tooltip>
              </label>
              <input
                type="file"
                id="images"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages}
                className={styles.fileInput}
              />
              {uploadingImages && <p className={styles.uploadingText}>Subiendo imágenes...</p>}
            </div>

            {formData.images.length > 0 && (
              <div className={styles.imageSection}>
                <h3>Imágenes Actuales ({formData.images.length})</h3>
                <div className={styles.imagePreview}>
                  {formData.images.map((image, index) => (
                    <div key={index} className={styles.imageItem}>
                      {index === 0 && <div className={styles.primaryBadge}>Principal</div>}
                      <img src={image.url} alt={image.alt} className={styles.previewImage} />
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
        );

      case 5:
        return (
          <div className={styles.stepContent}>
            <h2>SEO y Configuración Final</h2>
            
            <div className={styles.field}>
              <label htmlFor="meta_title">
                Título SEO
                <Tooltip content="Título que aparece en Google y redes sociales. Si lo dejas vacío, usaremos el nombre del producto">
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
                placeholder={formData.name || "Título para buscadores..."}
              />
              <small className={styles.charCount}>
                {formData.meta_title.length}/60 caracteres
              </small>
            </div>

            <div className={styles.field}>
              <label htmlFor="meta_description">
                Descripción SEO
                <Tooltip content="Descripción que aparece en Google. Ayuda a que más gente encuentre tu producto">
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
                placeholder={formData.short_description || "Descripción que aparecerá en Google..."}
              />
              <small className={styles.charCount}>
                {formData.meta_description.length}/160 caracteres
              </small>
            </div>

            <div className={styles.configSection}>
              <h3>Configuración del Producto</h3>
              
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
          </div>
        );

      default:
        return null;
    }
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

        {/* Progress Steps */}
        <div className={styles.stepsContainer}>
          <div className={styles.stepsHeader}>
            <h2>Progreso de Creación</h2>
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
                  step.id > currentStep && !completedSteps.has(step.id - 1) && step.id !== 1 ? styles.stepBlocked : ''
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div className={styles.stepIcon}>
                  {completedSteps.has(step.id) ? '✓' : step.icon}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepNumber}>Paso {step.id}</div>
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

        {/* Step Content */}
        <div className={styles.stepContainer}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
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
      </div>
    </AdminLayout>
  );
}
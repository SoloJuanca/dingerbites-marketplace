'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../lib/AuthContext';
import AdminLayout from '../../../../../components/admin/AdminLayout/AdminLayout';
import SmartComboBox from '../../../../../components/admin/SmartComboBox/SmartComboBox';
import TcgProductSelector from '../../../../../components/admin/TcgProductSelector/TcgProductSelector';
import TagInput from '../../../../../components/admin/TagInput/TagInput';
import ProductDetailsInput from '../../../../../components/admin/ProductDetailsInput/ProductDetailsInput';
import ProductImageEditor from '../../../../../components/admin/ProductImageEditor/ProductImageEditor';
import toast from 'react-hot-toast';
import { loadingToast } from '../../../../../lib/toastHelpers';
import { DEFAULT_PRODUCT_CONDITION, PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS, sanitizeProductCondition } from '../../../../../lib/productCondition';
import styles from '../../create/create.module.css';

const STEPS_NORMAL = [
  { label: 'Tipo de producto' },
  { label: 'Imágenes y descripción' },
  { label: 'Título y categoría' },
  { label: 'Precio' },
  { label: 'Stock' },
  { label: 'Detalles y envío' },
  { label: 'Resumen' }
];

const STEPS_TCG = [
  { label: 'Tipo de producto' },
  { label: 'Categoría TCG' },
  { label: 'Título y descripción' },
  { label: 'Precio' },
  { label: 'Stock' },
  { label: 'Detalles y envío' },
  { label: 'Resumen' }
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
  const [productType, setProductType] = useState(null); // 'normal' | 'tcg' - set when product loads
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: '',
    cost_price: '',
    compare_price: '',
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
    condition: DEFAULT_PRODUCT_CONDITION,
    is_featured: false,
    is_active: false,
    meta_title: '',
    meta_description: '',
    suggested_category_name: '',
    images: []
  });
  const [originalImages, setOriginalImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [originalFeatures, setOriginalFeatures] = useState('');
  const [aiContextText, setAiContextText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const isTcgFlow = productType === 'tcg';
  const steps = productType === 'tcg' ? STEPS_TCG : STEPS_NORMAL;
  const getSteps = () => (productType === 'tcg' ? STEPS_TCG : STEPS_NORMAL);

  const loadProduct = useCallback(async () => {
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

        const images = Array.isArray(product.images)
          ? product.images.map((img) => (typeof img === 'string' ? { url: img, alt: '' } : { url: img.url || img.image_url || '', alt: img.alt || '' }))
          : [];
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          short_description: product.short_description || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          price: product.price || '',
          cost_price: product.cost_price != null ? String(product.cost_price) : '',
          compare_price: product.compare_price != null ? String(product.compare_price) : '',
          category_id: product.category_id || '',
          parent_category_id: product.parent_category_id || product.category_id || '',
          brand_id: product.brand_id || '',
          stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : '0',
          low_stock_threshold: product.low_stock_threshold != null ? String(product.low_stock_threshold) : '5',
          weight_grams: product.weight_grams != null ? String(product.weight_grams) : '',
          length_cm: length_cm,
          width_cm: width_cm,
          height_cm: height_cm,
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.meta_keywords || '',
          features: Array.isArray(product.features) ? product.features.join('\n') : '',
          condition: sanitizeProductCondition(product.condition),
          is_featured: product.is_featured || false,
          is_active: product.is_active || false,
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          suggested_category_name: product.suggested_category_name ?? '',
          images,
          tcg_product_id: product.tcg_product_id ?? null,
          tcg_group_id: product.tcg_group_id ?? null,
          tcg_category_id: product.tcg_category_id ?? null,
          tcg_sub_type_name: product.tcg_sub_type_name ?? null
        });
        setProductType(product.tcg_product_id != null ? 'tcg' : 'normal');
        setOriginalImages(product.images || []);
        setOriginalFeatures(Array.isArray(product.features) ? product.features.join('\n') : '');
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
  }, [productId, apiRequest]);

  const loadCategories = useCallback(async () => {
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
  }, [apiRequest]);

  const loadBrands = useCallback(async () => {
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
  }, [apiRequest]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProduct();
      loadCategories();
      loadBrands();
    }
  }, [isAuthenticated, loadProduct, loadCategories, loadBrands]);

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

  const selectedCategory = categories.find((c) => c.id === formData.category_id);
  const tcgCategoryIdForSelector =
    selectedCategory?.slug === 'tcg' ? null : selectedCategory?.tcg_category_id ?? null;
  const handleTcgSelect = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const isTcgProduct = formData.tcg_product_id != null;

  const validateStep = (step) => {
    const err = {};
    if (step === 1 && !isTcgFlow) {
      if (!formData.images || formData.images.length === 0) {
        err.images = 'Agrega al menos una imagen';
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.name?.trim()) { err.name = 'El título es requerido'; }
      if (!formData.slug?.trim()) { err.slug = 'El slug es requerido'; }
      if (!formData.condition) { err.condition = 'Selecciona la condición del producto'; }
      if (!isTcgFlow && !formData.category_id) { err.category_id = 'Selecciona una categoría'; }
      if (Object.keys(err).length) {
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!isTcgFlow && (!formData.price || parseFloat(formData.price) <= 0)) {
        err.price = 'El precio debe ser mayor a 0';
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      return true;
    }
    if (step === 4) {
      const q = parseInt(formData.stock_quantity, 10);
      if (isNaN(q) || q < 0) {
        err.stock_quantity = 'Indica la cantidad en stock';
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      return true;
    }
    if (step === 5) {
      if (!formData.weight_grams || parseFloat(formData.weight_grams) <= 0) {
        err.weight_grams = 'Peso obligatorio (gramos)';
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      if (!formData.length_cm || !formData.width_cm || !formData.height_cm) {
        if (!formData.length_cm) err.length_cm = 'Requerido';
        if (!formData.width_cm) err.width_cm = 'Requerido';
        if (!formData.height_cm) err.height_cm = 'Requerido';
        setValidationErrors((p) => ({ ...p, ...err }));
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const buildProductData = () => {
    const priceVal = formData.price && parseFloat(formData.price) > 0 ? parseFloat(formData.price) : 0;
    return {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: priceVal,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
      weight_grams: formData.weight_grams && formData.weight_grams.trim() ? parseFloat(formData.weight_grams) : null,
      dimensions_cm:
        formData.length_cm || formData.width_cm || formData.height_cm
          ? {
              length: formData.length_cm ? parseFloat(formData.length_cm) : null,
              width: formData.width_cm ? parseFloat(formData.width_cm) : null,
              height: formData.height_cm ? parseFloat(formData.height_cm) : null
            }
          : null,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      condition: formData.condition,
      stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 5,
      is_featured: formData.is_featured || false,
      is_active: formData.is_active || false,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      meta_keywords:
        formData.tags && formData.tags.trim()
          ? formData.tags.split(',').map((t) => t.trim()).join(', ')
          : null,
      images: formData.images || [],
      features:
        formData.features && formData.features.trim()
          ? formData.features.split('\n').map((f) => f.trim()).filter(Boolean)
          : [],
      tcg_product_id: formData.tcg_product_id ?? null,
      tcg_group_id: formData.tcg_group_id ?? null,
      tcg_category_id: formData.tcg_category_id ?? null,
      tcg_sub_type_name: formData.tcg_sub_type_name ?? null,
      suggested_category_name: formData.suggested_category_name?.trim() || null
    };
  };

  const handleUploadCrop = useCallback(
    async (blob) => {
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'products');
      const response = await apiRequest('/api/admin/upload', { method: 'POST', body: fd });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Error al subir');
      }
      const data = await response.json();
      return { url: data.url };
    },
    [apiRequest]
  );

  const handleAiGenerate = async () => {
    if ((!aiContextText || !aiContextText.trim()) && (!formData.images || formData.images.length === 0)) {
      toast.error('Agrega al menos una imagen o algunas palabras clave para que la IA pueda ayudarte');
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const response = await apiRequest('/api/admin/ai/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: formData.images || [],
          contextText: aiContextText,
          currentFields: {
            name: formData.name,
            short_description: formData.short_description,
            description: formData.description,
            tags: formData.tags
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudieron generar sugerencias');
      }
      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        name: data.title || prev.name,
        short_description: data.shortDescription || prev.short_description,
        description: data.description || prev.description,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags),
        suggested_category_name: data.suggestedCategory || prev.suggested_category_name || ''
      }));
      toast.success('Sugerencias generadas. Revisa y ajusta.');
    } catch (error) {
      setAiError(error.message || 'No se pudieron generar sugerencias.');
      toast.error(error.message || 'No se pudieron generar sugerencias');
    } finally {
      setAiLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.slug.trim()) errors.slug = 'El slug es requerido';
    if (!isTcgProduct && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'El precio debe ser mayor a 0';
    }
    if (!formData.condition) {
      errors.condition = 'Selecciona la condición del producto';
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
      const productData = buildProductData();
      const response = await apiRequest(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleImageUpload(files);
    e.target.value = '';
  };

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
      handleImageUpload(imageFiles);
    } else {
      toast.error('Por favor, arrastra solo archivos de imagen');
    }
  };



  if (loadingProduct || productType == null) {
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

  const stepTitles = {
    0: { title: 'Tipo de producto', desc: 'Tipo de producto (solo lectura en edición).' },
    1: {
      title: isTcgFlow ? 'Categoría TCG' : 'Imágenes y descripción',
      desc: isTcgFlow ? 'Categoría TCG y producto del catálogo.' : 'Imágenes y opcionalmente contexto para IA.'
    },
    2: { title: 'Título y categoría', desc: 'Nombre, slug, descripción, categoría y marca.' },
    3: { title: 'Precio', desc: 'Precio de venta, costo y comparación.' },
    4: { title: 'Stock', desc: 'Cantidad y alerta de stock bajo.' },
    5: { title: 'Detalles y envío', desc: 'Detalles, peso y dimensiones.' },
    6: { title: 'Resumen', desc: 'Revisa y guarda los cambios.' }
  };

  const renderStepContent = () => {
    const step = currentStep;
    const titles = stepTitles[step] || { title: '', desc: '' };

    if (step === 0) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.typeCardGroup}>
            <div className={`${styles.typeCard} ${productType === 'normal' ? styles.typeCardSelected : ''}`} aria-hidden>
              <h3>Producto normal</h3>
              <p>Producto estándar con imágenes propias, título, descripción y categoría que tú defines.</p>
            </div>
            <div className={`${styles.typeCard} ${productType === 'tcg' ? styles.typeCardSelected : ''}`} aria-hidden>
              <h3>Producto TCG</h3>
              <p>Producto del catálogo TCG. Categoría y producto ya definidos.</p>
            </div>
          </div>
          <p className={styles.wizardStepDescription}>Tipo actual: <strong>{productType === 'tcg' ? 'TCG' : 'Normal'}</strong></p>
        </div>
      );
    }

    if (step === 1 && isTcgFlow) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.field}>
              <label htmlFor="parent_category_id">Categoría del Producto</label>
              <SmartComboBox
                value={formData.parent_category_id}
                onChange={(value) => {
                  const cat = categories.find((c) => c.id === value);
                  setFormData((prev) => ({
                    ...prev,
                    parent_category_id: value,
                    category_id: value,
                    tcg_product_id: null,
                    tcg_group_id: null,
                    tcg_category_id: cat?.tcg_category_id ?? null,
                    tcg_sub_type_name: null,
                    name: '',
                    description: '',
                    images: [],
                    price: ''
                  }));
                }}
                options={categories.filter((c) => !c.parent_id)}
                placeholder="Buscar o crear categoría..."
                createEndpoint="/api/admin/categories"
                createLabel="categoría"
                onOptionsUpdate={handleCategoryUpdate}
              />
            </div>
            {formData.parent_category_id && (
              <div className={styles.field}>
                <label htmlFor="category_id">Subcategoría</label>
                <SmartComboBox
                  value={formData.category_id !== formData.parent_category_id ? formData.category_id : ''}
                  onChange={(value) => {
                    const cat = categories.find((c) => c.id === value);
                    const parentCat = categories.find((c) => c.id === formData.parent_category_id);
                    setFormData((prev) => ({
                      ...prev,
                      category_id: value || formData.parent_category_id,
                      tcg_category_id: (cat || parentCat)?.tcg_category_id ?? null,
                      tcg_sub_type_name: null
                    }));
                  }}
                  options={categories.filter((c) => c.parent_id === formData.parent_category_id)}
                  placeholder="Ninguna o crear subcategoría..."
                  createEndpoint="/api/admin/categories"
                  createLabel="subcategoría"
                  createPayload={{ parent_id: formData.parent_category_id }}
                  onOptionsUpdate={handleCategoryUpdate}
                />
              </div>
            )}
            <TcgProductSelector
              tcgCategoryId={tcgCategoryIdForSelector}
              formData={formData}
              onSelect={handleTcgSelect}
            />
          </div>
        </div>
      );
    }

    if (step === 1 && !isTcgFlow) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.field}>
              <label htmlFor="images">Subir Imágenes</label>
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
              <small className={styles.helpText}>Arrastra archivos aquí o haz clic. Máximo 5MB por imagen.</small>
            </div>
            {formData.images.length > 0 && (
              <>
                <ProductImageEditor
                  images={formData.images}
                  onImagesChange={(newImages) => setFormData((prev) => ({ ...prev, images: newImages }))}
                  onUploadCrop={handleUploadCrop}
                  disabled={uploadingImages}
                />
                <div className={styles.infoCard}>
                  <h4>Tips para imágenes</h4>
                  <ul>
                    <li>La primera imagen es la principal.</li>
                    <li>Puedes reordenar (↑↓), recortar (✂) o eliminar.</li>
                  </ul>
                </div>
              </>
            )}
            <div className={styles.field}>
              <label htmlFor="ai_context">Contexto para IA (opcional)</label>
              <textarea
                id="ai_context"
                value={aiContextText}
                onChange={(e) => setAiContextText(e.target.value)}
                rows={3}
                className={styles.textarea}
                placeholder="Ej: producto vegano, uso profesional..."
              />
              <div className={styles.aiActionsRow}>
                <button type="button" onClick={handleAiGenerate} disabled={aiLoading} className={styles.aiButton}>
                  {aiLoading ? 'Generando...' : 'Rellenar con IA'}
                </button>
                {aiError && <p className={styles.aiError}>{aiError}</p>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.field}>
              <label htmlFor="name">Nombre del Producto *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.name ? styles.inputError : ''}`}
                placeholder="Ej: iPhone 15 Pro Max"
              />
              {validationErrors.name && <span className={styles.errorText}>{validationErrors.name}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="slug">Slug *</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.slug ? styles.inputError : ''}`}
                placeholder="url-amigable"
              />
              {validationErrors.slug && <span className={styles.errorText}>{validationErrors.slug}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="short_description">Descripción corta</label>
              <textarea
                id="short_description"
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                rows={2}
                maxLength={160}
                className={styles.textarea}
                placeholder="Breve para listados (160 caracteres)"
              />
              <small className={styles.charCount}>{formData.short_description.length}/160</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="description">Descripción completa</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={styles.textarea}
                placeholder="Descripción detallada..."
              />
            </div>
            {!isTcgFlow && (
              <>
                <div className={styles.field}>
                  <label htmlFor="suggested_category_name">Categoría sugerida por IA</label>
                  <input
                    type="text"
                    id="suggested_category_name"
                    name="suggested_category_name"
                    value={formData.suggested_category_name || ''}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Ej: Esmaltes veganos"
                  />
                </div>
                <div className={styles.field}>
                  <label>Categoría del Producto</label>
                  <SmartComboBox
                    value={formData.parent_category_id}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        parent_category_id: value,
                        category_id: value,
                        tcg_category_id: categories.find((c) => c.id === value)?.tcg_category_id ?? null
                      }));
                    }}
                    options={categories.filter((c) => !c.parent_id)}
                    placeholder="Buscar o crear categoría..."
                    createEndpoint="/api/admin/categories"
                    createLabel="categoría"
                    onOptionsUpdate={handleCategoryUpdate}
                  />
                </div>
                {formData.parent_category_id && (
                  <div className={styles.field}>
                    <label>Subcategoría</label>
                    <SmartComboBox
                      value={formData.category_id !== formData.parent_category_id ? formData.category_id : ''}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          category_id: value || formData.parent_category_id
                        }))
                      }
                      options={categories.filter((c) => c.parent_id === formData.parent_category_id)}
                      placeholder="Ninguna o crear subcategoría..."
                      createEndpoint="/api/admin/categories"
                      createLabel="subcategoría"
                      createPayload={{ parent_id: formData.parent_category_id }}
                      onOptionsUpdate={handleCategoryUpdate}
                    />
                  </div>
                )}
              </>
            )}
            <div className={styles.field}>
              <label>Marca</label>
              <SmartComboBox
                value={formData.brand_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, brand_id: value }))}
                options={brands}
                placeholder="Buscar o crear marca..."
                createEndpoint="/api/admin/brands"
                createLabel="marca"
                onOptionsUpdate={handleBrandUpdate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="condition">Condición del producto *</label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.condition ? styles.inputError : ''}`}
              >
                {PRODUCT_CONDITIONS.map((option) => (
                  <option key={option} value={option}>
                    {PRODUCT_CONDITION_LABELS[option]}
                  </option>
                ))}
              </select>
              {validationErrors.condition && <span className={styles.errorText}>{validationErrors.condition}</span>}
            </div>
            <div className={styles.field}>
              <label>Etiquetas</label>
              <TagInput
                value={formData.tags}
                onChange={(value) => setFormData((prev) => ({ ...prev, tags: value }))}
                placeholder="Ej: nuevo, oferta..."
                maxTags={15}
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="price">Precio de venta *</label>
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
                    className={`${styles.input} ${styles.inputWithPrefixField} ${validationErrors.price ? styles.inputError : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {validationErrors.price && <span className={styles.errorText}>{validationErrors.price}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="cost_price">Precio de costo</label>
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
            <div className={styles.field}>
              <label htmlFor="compare_price">Precio de comparación (opcional)</label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.prefix}>$</span>
                <input
                  type="number"
                  id="compare_price"
                  name="compare_price"
                  value={formData.compare_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`${styles.input} ${styles.inputWithPrefixField}`}
                  placeholder="0.00"
                />
              </div>
            </div>
            {formData.price && formData.cost_price && (
              <div className={styles.profitIndicator}>
                <div className={styles.profitCard}>
                  <h4>Análisis de rentabilidad</h4>
                  <div className={styles.profitDetails}>
                    <div className={styles.profitItem}>
                      <span>Ganancia neta por unidad:</span>
                      <strong>${(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}</strong>
                    </div>
                    <div className={styles.profitItem}>
                      <span>Margen:</span>
                      <strong>
                        {(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.price)) * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="stock_quantity">Cantidad en stock</label>
                <input
                  type="number"
                  id="stock_quantity"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  min="0"
                  className={`${styles.input} ${validationErrors.stock_quantity ? styles.inputError : ''}`}
                  placeholder="0"
                />
                {validationErrors.stock_quantity && <span className={styles.errorText}>{validationErrors.stock_quantity}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="low_stock_threshold">Alerta de stock bajo</label>
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
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <div className={styles.field}>
              <label>Detalles del producto (materiales, etc.)</label>
              <ProductDetailsInput
                value={formData.features}
                onChange={(value) => setFormData((prev) => ({ ...prev, features: value }))}
                placeholderName="Ej: Materiales, Color"
                placeholderValue="Ej: Algodón 100%"
                maxDetails={50}
              />
            </div>
            <h4 className={styles.subsectionTitle}>Peso y dimensiones (obligatorios para envío)</h4>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="weight_grams">Peso (gramos) *</label>
                <input
                  type="number"
                  id="weight_grams"
                  name="weight_grams"
                  value={formData.weight_grams}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className={`${styles.input} ${validationErrors.weight_grams ? styles.inputError : ''}`}
                  placeholder="Ej: 500"
                />
                {validationErrors.weight_grams && <span className={styles.errorText}>{validationErrors.weight_grams}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="length_cm">Largo (cm) *</label>
                <input
                  type="number"
                  id="length_cm"
                  name="length_cm"
                  value={formData.length_cm}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className={`${styles.input} ${validationErrors.length_cm ? styles.inputError : ''}`}
                  placeholder="Ej: 20"
                />
                {validationErrors.length_cm && <span className={styles.errorText}>{validationErrors.length_cm}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="width_cm">Ancho (cm) *</label>
                <input
                  type="number"
                  id="width_cm"
                  name="width_cm"
                  value={formData.width_cm}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className={`${styles.input} ${validationErrors.width_cm ? styles.inputError : ''}`}
                  placeholder="Ej: 15"
                />
                {validationErrors.width_cm && <span className={styles.errorText}>{validationErrors.width_cm}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="height_cm">Alto (cm) *</label>
                <input
                  type="number"
                  id="height_cm"
                  name="height_cm"
                  value={formData.height_cm}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className={`${styles.input} ${validationErrors.height_cm ? styles.inputError : ''}`}
                  placeholder="Ej: 10"
                />
                {validationErrors.height_cm && <span className={styles.errorText}>{validationErrors.height_cm}</span>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      const catName = categories.find((c) => c.id === formData.category_id)?.name || formData.suggested_category_name || '—';
      const brandName = brands.find((b) => b.id === formData.brand_id)?.name || '—';
      return (
        <div className={styles.wizardContent}>
          <h1 className={styles.wizardStepTitle}>{titles.title}</h1>
          <p className={styles.wizardStepDescription}>{titles.desc}</p>
          <div className={styles.subsection}>
            <h4>Resumen</h4>
            <dl className={styles.summaryList}>
              <dt>Tipo</dt>
              <dd>{isTcgFlow ? 'TCG' : 'Normal'}</dd>
              <dt>Nombre</dt>
              <dd>{formData.name || '—'}</dd>
              <dt>Slug</dt>
              <dd>{formData.slug || '—'}</dd>
              <dt>Categoría</dt>
              <dd>{catName}</dd>
              <dt>Marca</dt>
              <dd>{brandName}</dd>
              <dt>Condición</dt>
              <dd>{PRODUCT_CONDITION_LABELS[formData.condition] || '—'}</dd>
              <dt>Precio</dt>
              <dd>{formData.price ? `$${formData.price}` : '—'}</dd>
              <dt>Stock</dt>
              <dd>{formData.stock_quantity}</dd>
              <dt>Peso</dt>
              <dd>{formData.weight_grams ? `${formData.weight_grams} g` : '—'}</dd>
              <dt>Dimensiones</dt>
              <dd>
                {formData.length_cm && formData.width_cm && formData.height_cm
                  ? `${formData.length_cm} × ${formData.width_cm} × ${formData.height_cm} cm`
                  : '—'}
              </dd>
            </dl>
            {formData.images.length > 0 && (
              <div className={styles.summaryImages}>
                <span>Imágenes: {formData.images.length}</span>
              </div>
            )}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleInputChange}
                  className={styles.checkbox}
                />
                <span>Producto destacado</span>
              </label>
            </div>
          </div>
          <div className={styles.wizardActions}>
            <button type="button" onClick={goBack} className={styles.wizardBackButton}>
              Anterior
            </button>
            <a href={`/admin/products/preview/${productId}`} target="_blank" rel="noopener noreferrer" className={styles.wizardBackButton}>
              Previsualizar
            </a>
            <button type="button" onClick={handleSave} disabled={loading} className={styles.wizardNextButton}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <AdminLayout title="Editar Producto">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Editar Producto</h1>
          <button type="button" onClick={() => router.back()} className={styles.backButton}>
            ← Volver a Productos
          </button>
        </div>
        <div className={styles.wizardLayout}>
          <aside className={styles.wizardSidebar} aria-label="Pasos del formulario">
            <ul className={styles.wizardStepNav}>
              {getSteps().map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={`${styles.wizardStepNavItem} ${i === currentStep ? styles.wizardStepNavItemActive : ''}`}
                    onClick={() => setCurrentStep(i)}
                    aria-current={i === currentStep ? 'step' : undefined}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className={styles.wizardContent}>
            {renderStepContent()}
            {currentStep !== 6 && (
              <div className={styles.wizardActions}>
                <button type="button" onClick={goBack} className={styles.wizardBackButton}>
                  Anterior
                </button>
                <button type="button" onClick={goNext} className={styles.wizardNextButton}>
                  Siguiente
                </button>
                <button type="button" onClick={handleSave} disabled={loading} className={styles.wizardBackButton}>
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/AuthContext';
import styles from './AddressManager.module.css';

export default function AddressManager({ 
  onAddressSelect, 
  selectedAddress, 
  showAddForm = false,
  onCancel = () => {} 
}) {
  const { apiRequest } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(showAddForm);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    address_type: 'shipping',
    is_default: false,
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Mexico',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/users/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      } else {
        toast.error('Error al cargar direcciones');
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es obligatorio';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es obligatorio';
    }
    
    if (!formData.address_line_1.trim()) {
      newErrors.address_line_1 = 'La dirección es obligatoria';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'La ciudad es obligatoria';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'El estado es obligatorio';
    }
    
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'El código postal es obligatorio';
    } else if (!/^\d{5}$/.test(formData.postal_code)) {
      newErrors.postal_code = 'El código postal debe tener 5 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let response;
      if (editingAddress) {
        response = await apiRequest('/api/users/addresses', {
          method: 'PUT',
          body: JSON.stringify({ ...formData, address_id: editingAddress.id })
        });
      } else {
        response = await apiRequest('/api/users/addresses', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        toast.success(editingAddress ? 'Dirección actualizada' : 'Dirección creada');
        setShowNewAddressForm(false);
        setEditingAddress(null);
        resetForm();
        loadAddresses();
      } else {
        toast.error('Error al guardar la dirección');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Error al conectar con el servidor');
    }
  };

  const handleDelete = async (addressId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/users/addresses?address_id=${addressId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Dirección eliminada');
        loadAddresses();
      } else {
        toast.error('Error al eliminar la dirección');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Error al conectar con el servidor');
    }
  };

  const handleEdit = (address) => {
    setFormData({
      address_type: address.address_type,
      is_default: address.is_default,
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone || ''
    });
    setEditingAddress(address);
    setShowNewAddressForm(true);
  };

  const resetForm = () => {
    setFormData({
      address_type: 'shipping',
      is_default: false,
      first_name: '',
      last_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Mexico',
      phone: ''
    });
    setErrors({});
  };

  const formatAddress = (address) => {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando direcciones...</p>
      </div>
    );
  }

  return (
    <div className={styles.addressManager}>
      <div className={styles.header}>
        <h3>Direcciones de Envío</h3>
        {!showNewAddressForm && (
          <button 
            onClick={() => setShowNewAddressForm(true)}
            className={styles.addButton}
          >
            + Agregar Nueva Dirección
          </button>
        )}
      </div>

      {/* Lista de direcciones existentes */}
      {addresses.length > 0 && (
        <div className={styles.addressList}>
          {addresses.map((address) => (
            <div 
              key={address.id} 
              className={`${styles.addressCard} ${
                selectedAddress?.id === address.id ? styles.selected : ''
              }`}
              onClick={() => onAddressSelect && onAddressSelect(address)}
            >
              <div className={styles.addressInfo}>
                <div className={styles.addressHeader}>
                  <h4>{address.first_name} {address.last_name}</h4>
                  {address.is_default && (
                    <span className={styles.defaultBadge}>Predeterminada</span>
                  )}
                </div>
                <p className={styles.addressText}>{formatAddress(address)}</p>
                {address.phone && (
                  <p className={styles.phoneText}>📞 {address.phone}</p>
                )}
                {address.company && (
                  <p className={styles.companyText}>🏢 {address.company}</p>
                )}
              </div>
              <div className={styles.addressActions}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(address);
                  }}
                  className={styles.editButton}
                >
                  Editar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(address.id);
                  }}
                  className={styles.deleteButton}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para nueva dirección o edición */}
      {showNewAddressForm && (
        <div className={styles.addressForm}>
          <div className={styles.formHeader}>
            <h4>{editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}</h4>
            <button 
              onClick={() => {
                setShowNewAddressForm(false);
                setEditingAddress(null);
                resetForm();
                onCancel();
              }}
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="first_name">Nombre *</label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={errors.first_name ? styles.error : ''}
                />
                {errors.first_name && <span className={styles.errorText}>{errors.first_name}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="last_name">Apellido *</label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={errors.last_name ? styles.error : ''}
                />
                {errors.last_name && <span className={styles.errorText}>{errors.last_name}</span>}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="company">Empresa (Opcional)</label>
              <input
                type="text"
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="address_line_1">Dirección *</label>
              <input
                type="text"
                id="address_line_1"
                value={formData.address_line_1}
                onChange={(e) => handleInputChange('address_line_1', e.target.value)}
                className={errors.address_line_1 ? styles.error : ''}
                placeholder="Calle y número"
              />
              {errors.address_line_1 && <span className={styles.errorText}>{errors.address_line_1}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="address_line_2">Dirección 2 (Opcional)</label>
              <input
                type="text"
                id="address_line_2"
                value={formData.address_line_2}
                onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                placeholder="Apartamento, suite, unidad, etc."
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="city">Ciudad *</label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? styles.error : ''}
                />
                {errors.city && <span className={styles.errorText}>{errors.city}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="state">Estado *</label>
                <input
                  type="text"
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={errors.state ? styles.error : ''}
                />
                {errors.state && <span className={styles.errorText}>{errors.state}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="postal_code">Código Postal *</label>
                <input
                  type="text"
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className={errors.postal_code ? styles.error : ''}
                  maxLength="5"
                />
                {errors.postal_code && <span className={styles.errorText}>{errors.postal_code}</span>}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="phone">Teléfono (Opcional)</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="10 dígitos"
              />
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleInputChange('is_default', e.target.checked)}
                />
                <span>Establecer como dirección predeterminada</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={() => {
                  setShowNewAddressForm(false);
                  setEditingAddress(null);
                  resetForm();
                  onCancel();
                }}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.saveButton}>
                {editingAddress ? 'Actualizar' : 'Guardar'} Dirección
              </button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 && !showNewAddressForm && (
        <div className={styles.emptyState}>
          <p>No tienes direcciones guardadas</p>
          <button 
            onClick={() => setShowNewAddressForm(true)}
            className={styles.addFirstButton}
          >
            Agregar Primera Dirección
          </button>
        </div>
      )}
    </div>
  );
}

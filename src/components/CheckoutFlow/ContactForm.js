'use client';

import { useState, useEffect } from 'react';
import AddressManager from '../AddressManager/AddressManager';
import styles from './ContactForm.module.css';

export default function ContactForm({ 
  contactInfo, 
  deliveryType, 
  userType, 
  onContactInfoUpdate, 
  onNext, 
  onBack,
  user,
  isAuthenticated 
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [isGuestUser, setIsGuestUser] = useState(false);

  // Pre-llenar datos si el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || ''
      }));
      setIsGuestUser(false);
    } else {
      setIsGuestUser(true);
    }
  }, [isAuthenticated, user]);

  // Sincronizar con el estado padre
  useEffect(() => {
    if (contactInfo) {
      setFormData(prev => ({ ...prev, ...contactInfo }));
    }
  }, [contactInfo]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Actualizar estado padre
    onContactInfoUpdate({ ...formData, [field]: value });
  };

  const handleAddressSelect = (address) => {
    const fullAddress = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code
    ].filter(part => part && part.trim()).join(', ');

    const updatedFormData = {
      ...formData,
      name: `${address.first_name} ${address.last_name}`,
      phone: address.phone || formData.phone,
      address: fullAddress
    };

    setFormData(updatedFormData);
    setSelectedAddress(address);
    setShowAddressManager(false);

    // Actualizar estado padre
    onContactInfoUpdate(updatedFormData);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'El teléfono no es válido';
    }
    
    if (deliveryType === 'delivery' && !formData.address.trim()) {
      newErrors.address = 'La dirección es obligatoria para envío a domicilio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const isFormValid = () => {
    const requiredFields = ['name', 'email', 'phone'];
    if (deliveryType === 'delivery') {
      requiredFields.push('address');
    }
    
    return requiredFields.every(field => 
      formData[field] && formData[field].trim() !== ''
    ) && 
    /\S+@\S+\.\S+/.test(formData.email) &&
    /^\d{10,15}$/.test(formData.phone.replace(/\s/g, ''));
  };

  return (
    <div className={styles.contactForm}>
      <div className={styles.header}>
        <h2>Información de Contacto</h2>
        <p>
          {deliveryType === 'delivery' 
            ? 'Completa tus datos para el envío a domicilio'
            : 'Completa tus datos para recoger en tienda'
          }
        </p>
      </div>

      <div className={styles.form}>
        {/* Información Personal */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Nombre Completo *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`${styles.input} ${errors.name ? styles.error : ''}`}
              placeholder="Tu nombre completo"
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`${styles.input} ${errors.email ? styles.error : ''}`}
              placeholder="tu@email.com"
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.label}>
              Teléfono *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`${styles.input} ${errors.phone ? styles.error : ''}`}
              placeholder="10 dígitos"
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>
        </div>

        {/* Gestión de Direcciones para usuarios autenticados */}
        {deliveryType === 'delivery' && isAuthenticated && !isGuestUser && (
          <div className={styles.addressSection}>
            {!showAddressManager ? (
              <div className={styles.addressSelection}>
                <div className={styles.addressHeader}>
                  <label className={styles.label}>Dirección de Envío *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddressManager(true)}
                    className={styles.manageAddressButton}
                  >
                    {selectedAddress ? 'Cambiar Dirección' : 'Gestionar Direcciones'}
                  </button>
                </div>
                
                {selectedAddress ? (
                  <div className={styles.selectedAddress}>
                    <p className={styles.addressText}>
                      <strong>{selectedAddress.first_name} {selectedAddress.last_name}</strong><br />
                      {[
                        selectedAddress.address_line_1,
                        selectedAddress.address_line_2,
                        selectedAddress.city,
                        selectedAddress.state,
                        selectedAddress.postal_code
                      ].filter(part => part && part.trim()).join(', ')}
                    </p>
                    {selectedAddress.phone && (
                      <p className={styles.phoneText}><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>call</span> {selectedAddress.phone}</p>
                    )}
                  </div>
                ) : (
                  <div className={styles.noAddressSelected}>
                    <p>No hay dirección seleccionada</p>
                    <p className={styles.hint}>Haz clic en &quot;Gestionar Direcciones&quot; para seleccionar una dirección</p>
                  </div>
                )}
              </div>
            ) : (
              <AddressManager
                onAddressSelect={handleAddressSelect}
                selectedAddress={selectedAddress}
                onCancel={() => setShowAddressManager(false)}
              />
            )}
          </div>
        )}

        {/* Dirección manual para invitados o cuando no hay dirección seleccionada */}
        {deliveryType === 'delivery' && (isGuestUser || (!selectedAddress && !showAddressManager)) && (
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>
                Dirección de Envío *
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`${styles.textarea} ${errors.address ? styles.error : ''}`}
                placeholder="Calle, número, colonia, ciudad, CP"
                rows={3}
              />
              {errors.address && <span className={styles.errorText}>{errors.address}</span>}
            </div>
          </div>
        )}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.label}>
              Notas Adicionales
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className={styles.textarea}
              placeholder="Instrucciones especiales, referencias, etc. (opcional)"
              rows={2}
            />
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div className={styles.deliveryNote}>
            <div className={styles.noteIcon}><span className="material-symbols-outlined">info</span></div>
            <div className={styles.noteContent}>
              <strong>Información de Envío:</strong>
              <p>• Costo: $120 MXN</p>
              <p>• Horario de entrega: 9:00 AM - 8:00 PM</p>
            </div>
          </div>
        )}

        {deliveryType === 'pickup' && (
          <div className={styles.pickupNote}>
            <div className={styles.noteIcon}><span className="material-symbols-outlined">storefront</span></div>
            <div className={styles.noteContent}>
              <strong>Recoger en Tienda:</strong>
              <p>• Dirección: Av. Principal #123, Centro Histórico</p>
              <p>• Horario: Lunes a Sábado 9:00 AM - 8:00 PM</p>
              <p>• Sin costo adicional</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onBack}>
          Atrás
        </button>
        <button
          className={`${styles.nextButton} ${!isFormValid() ? styles.disabled : ''}`}
          onClick={handleNext}
          disabled={!isFormValid()}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

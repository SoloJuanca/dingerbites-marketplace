'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { confirmToast } from '../../lib/toastHelpers';
import { useAuth } from '../../lib/AuthContext';
import { useWishlist } from '../../lib/WishlistContext';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, apiRequest } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Mexico',
    phone: '',
    is_default: false
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load user data
  useEffect(() => {
    if (isAuthenticated && user) {
      if (activeTab === 'orders') {
        loadOrders();
      } else if (activeTab === 'addresses') {
        loadAddresses();
      }
    }
  }, [activeTab, isAuthenticated, user]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await apiRequest('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const response = await apiRequest('/api/users/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddressFormChange = (field, value) => {
    setAddressForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openAddressModal = (address = null) => {
    if (address) {
      // Editing existing address
      setEditingAddress(address);
      setAddressForm({
        first_name: address.first_name,
        last_name: address.last_name,
        company: address.company || '',
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
        phone: address.phone || '',
        is_default: address.is_default
      });
    } else {
      // Adding new address
      setEditingAddress(null);
      setAddressForm({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        company: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Mexico',
        phone: user?.phone || '',
        is_default: false
      });
    }
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    setShowAddressModal(false);
    setEditingAddress(null);
  };

  const saveAddress = async () => {
    try {
      const method = editingAddress ? 'PUT' : 'POST';
      const endpoint = '/api/users/addresses';
      const body = editingAddress 
        ? { ...addressForm, address_id: editingAddress.id }
        : addressForm;

      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await loadAddresses(); // Reload addresses
        closeAddressModal();
        toast.success(editingAddress ? 'Dirección actualizada exitosamente' : 'Dirección agregada exitosamente');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al guardar la dirección');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Error al guardar la dirección');
    }
  };

  const deleteAddress = async (addressId) => {
    confirmToast(
      '¿Estás seguro de que quieres eliminar esta dirección?',
      async () => {
        try {
          const response = await apiRequest(`/api/users/addresses?address_id=${addressId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            await loadAddresses(); // Reload addresses
            toast.success('Dirección eliminada exitosamente');
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || 'Error al eliminar la dirección');
          }
        } catch (error) {
          console.error('Error deleting address:', error);
          toast.error('Error al eliminar la dirección');
        }
      }
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Header />
        <div className={styles.loading}>Cargando...</div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Mi Perfil</h1>
            <p className={styles.welcome}>
              Bienvenido, {user?.first_name} {user?.last_name}
            </p>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'orders' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Mis Pedidos
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'wishlist' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('wishlist')}
            >
              Lista de Deseos ({wishlistItems.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'addresses' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              Direcciones
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'account' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Mi Cuenta
            </button>
          </div>

          <div className={styles.content}>
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className={styles.ordersSection}>
                <h2 className={styles.sectionTitle}>Mis Pedidos</h2>
                {loadingOrders ? (
                  <div className={styles.loading}>Cargando pedidos...</div>
                ) : orders.length > 0 ? (
                  <div className={styles.ordersList}>
                    {orders.map(order => (
                      <div key={order.id} className={styles.orderCard}>
                        <div className={styles.orderHeader}>
                          <span className={styles.orderNumber}>
                            Pedido #{order.order_number}
                          </span>
                          <span className={styles.orderDate}>
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                        <div className={styles.orderDetails}>
                          <div className={styles.orderInfo}>
                            <p><strong>Total:</strong> {formatPrice(order.total_amount)}</p>
                            <p><strong>Estado:</strong> {order.status_name}</p>
                            <p><strong>Método de pago:</strong> {order.payment_method}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No tienes pedidos aún.</p>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div className={styles.wishlistSection}>
                <h2 className={styles.sectionTitle}>Mi Lista de Deseos</h2>
                {wishlistItems.length > 0 ? (
                  <div className={styles.wishlistGrid}>
                    {console.log(wishlistItems)}
                    {wishlistItems.map(item => (
                      <ProductCard
                        key={item.id}
                        product={{
                          id: item.id,
                          slug: item.slug,
                          name: item.name,
                          description: item.description,
                          price: item.price,
                          image: item.image
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>Tu lista de deseos está vacía.</p>
                    <p>Explora nuestros productos y agrega los que más te gusten.</p>
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className={styles.addressesSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Mis Direcciones</h2>
                  <button 
                    className={styles.addButton}
                    onClick={() => openAddressModal()}
                  >
                    + Agregar Dirección
                  </button>
                </div>
                {loadingAddresses ? (
                  <div className={styles.loading}>Cargando direcciones...</div>
                ) : addresses.length > 0 ? (
                  <div className={styles.addressesList}>
                    {addresses.map(address => (
                      <div key={address.id} className={styles.addressCard}>
                        <div className={styles.addressHeader}>
                          <h3>{address.first_name} {address.last_name}</h3>
                          {address.is_default && (
                            <span className={styles.defaultBadge}>Predeterminada</span>
                          )}
                        </div>
                        <div className={styles.addressDetails}>
                          <p>{address.address_line_1}</p>
                          {address.address_line_2 && <p>{address.address_line_2}</p>}
                          <p>{address.city}, {address.state} {address.postal_code}</p>
                          <p>{address.country}</p>
                          {address.phone && <p>Tel: {address.phone}</p>}
                        </div>
                        <div className={styles.addressActions}>
                          <button 
                            className={styles.editButton}
                            onClick={() => openAddressModal(address)}
                          >
                            Editar
                          </button>
                          <button 
                            className={styles.deleteButton}
                            onClick={() => deleteAddress(address.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No tienes direcciones guardadas.</p>
                  </div>
                )}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className={styles.accountSection}>
                <h2 className={styles.sectionTitle}>Información de la Cuenta</h2>
                <div className={styles.accountInfo}>
                  <div className={styles.infoItem}>
                    <label>Nombre:</label>
                    <span>{user?.first_name} {user?.last_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email:</label>
                    <span>{user?.email}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Teléfono:</label>
                    <span>{user?.phone || 'No especificado'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Miembro desde:</label>
                    <span>{formatDate(user?.created_at)}</span>
                  </div>
                </div>
                <div className={styles.accountActions}>
                  <button className={styles.editButton}>Editar Información</button>
                  <button className={styles.changePasswordButton}>Cambiar Contraseña</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Address Modal */}
      {showAddressModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}</h3>
              <button 
                className={styles.modalClose}
                onClick={closeAddressModal}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={addressForm.first_name}
                    onChange={(e) => handleAddressFormChange('first_name', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Apellido *</label>
                  <input
                    type="text"
                    value={addressForm.last_name}
                    onChange={(e) => handleAddressFormChange('last_name', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Empresa (opcional)</label>
                <input
                  type="text"
                  value={addressForm.company}
                  onChange={(e) => handleAddressFormChange('company', e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dirección Línea 1 *</label>
                <input
                  type="text"
                  value={addressForm.address_line_1}
                  onChange={(e) => handleAddressFormChange('address_line_1', e.target.value)}
                  className={styles.formInput}
                  placeholder="Calle, número, colonia"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dirección Línea 2 (opcional)</label>
                <input
                  type="text"
                  value={addressForm.address_line_2}
                  onChange={(e) => handleAddressFormChange('address_line_2', e.target.value)}
                  className={styles.formInput}
                  placeholder="Apartamento, suite, etc."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Ciudad *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => handleAddressFormChange('city', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Estado *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => handleAddressFormChange('state', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Código Postal *</label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => handleAddressFormChange('postal_code', e.target.value)}
                    className={styles.formInput}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>País</label>
                  <select
                    value={addressForm.country}
                    onChange={(e) => handleAddressFormChange('country', e.target.value)}
                    className={styles.formInput}
                  >
                    <option value="Mexico">México</option>
                    <option value="United States">Estados Unidos</option>
                    <option value="Canada">Canadá</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => handleAddressFormChange('phone', e.target.value)}
                  className={styles.formInput}
                  placeholder="+52 55 1234 5678"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => handleAddressFormChange('is_default', e.target.checked)}
                  />
                  Establecer como dirección predeterminada
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={closeAddressModal}
              >
                Cancelar
              </button>
              <button 
                className={styles.saveButton}
                onClick={saveAddress}
              >
                {editingAddress ? 'Actualizar' : 'Guardar'} Dirección
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

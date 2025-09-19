'use client';

import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import toast from 'react-hot-toast';
import Icon from '../Icon/Icon';
import styles from './CartItems.module.css';

export default function CartItems() {
  const { items, updateQuantityWithSync, removeFromCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();

  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        await removeFromCartWithSync(productId, user, apiRequest);
        toast.success('Producto eliminado del carrito');
      } else {
        await updateQuantityWithSync(productId, newQuantity, user, apiRequest);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Error al actualizar el carrito');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={styles.cartItems}>
      <div className={styles.header}>
        <h2>Productos en tu carrito</h2>
      </div>
      
      <div className={styles.itemsList}>
        {items.map((item) => (
          <div key={item.id} className={styles.cartItem}>
            <div className={styles.itemImage}>
              <img src={item.image} alt={item.name} />
            </div>
            
            <div className={styles.itemDetails}>
              <h3 className={styles.itemName}>{item.name}</h3>
              <p className={styles.itemDescription}>{item.description}</p>
              <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
            </div>
            
            <div className={styles.itemActions}>
              <div className={styles.quantityControls}>
                <button 
                  className={styles.quantityBtn}
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Icon name="remove" size={20} />
                </button>
                <span className={styles.quantity}>{item.quantity}</span>
                <button 
                  className={styles.quantityBtn}
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                >
                  <Icon name="add" size={20} />
                </button>
              </div>
              
              <div className={styles.itemTotal}>
                {formatPrice(item.price * item.quantity)}
              </div>
              
              <button 
                className={styles.removeBtn}
                onClick={async () => {
                  try {
                    await removeFromCartWithSync(item.id, user, apiRequest);
                    toast.success('Producto eliminado del carrito');
                  } catch (error) {
                    console.error('Error removing from cart:', error);
                    toast.error('Error al eliminar producto');
                  }
                }}
                title="Eliminar producto"
              >
                <Icon name="delete" size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
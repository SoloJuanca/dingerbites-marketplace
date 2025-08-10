'use client';

import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import Icon from '../Icon/Icon';
import styles from './CartItems.module.css';

export default function CartItems() {
  const { items, updateQuantityWithSync, removeFromCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCartWithSync(productId, user, apiRequest);
    } else {
      updateQuantityWithSync(productId, newQuantity, user, apiRequest);
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
        {console.log("items", items)}
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
                onClick={() => removeFromCartWithSync(item.id, user, apiRequest)}
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
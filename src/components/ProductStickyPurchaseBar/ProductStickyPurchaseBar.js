'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { getTcgMinPriceForSubType } from '../../lib/currency';
import styles from './ProductStickyPurchaseBar.module.css';

export default function ProductStickyPurchaseBar({
  product,
  marketPriceMxn = null,
  isTcgProduct = false,
  onOpenPanel
}) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { addToCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatPrice = (price) => {
    if (price == null) return 'Consultar';
    if (!isClient) return `$${Number(price).toFixed(2)}`;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const tcgMinForProduct = getTcgMinPriceForSubType(product.tcg_sub_type_name || 'Normal');
  const displayPrice =
    isTcgProduct && marketPriceMxn != null
      ? Math.max(tcgMinForProduct, marketPriceMxn)
      : isTcgProduct && (product.price != null && product.price > 0)
        ? Math.max(tcgMinForProduct, product.price)
        : product.price ?? 0;

  const hasPrice = displayPrice != null && displayPrice > 0;
  const stockQuantity = Number(product.stock_quantity || 0);
  const isOutOfStock = stockQuantity <= 0;
  const maxSelectableQuantity = Math.max(1, Math.min(10, stockQuantity || 1));
  const canAddToCart = !(isTcgProduct && !hasPrice) && !isOutOfStock;

  const handleQuantityChange = (newQuantity) => {
    const bounded = Math.max(1, Math.min(maxSelectableQuantity, Number(newQuantity) || 1));
    setQuantity(bounded);
  };

  useEffect(() => {
    setQuantity((prev) => Math.max(1, Math.min(prev, maxSelectableQuantity)));
  }, [maxSelectableQuantity]);

  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    if (quantity > stockQuantity) {
      toast.error(`Solo hay ${stockQuantity} unidad(es) disponibles`);
      handleQuantityChange(stockQuantity);
      return;
    }

    setIsAddingToCart(true);

    const cartPrice = isTcgProduct && marketPriceMxn != null
      ? Math.max(tcgMinForProduct, marketPriceMxn)
      : (isTcgProduct ? Math.max(tcgMinForProduct, product.price ?? 0) : (product.price ?? 0));

    await addToCartWithSync({
      id: product.id,
      name: product.name,
      description: product.description,
      price: cartPrice,
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
    }, user, apiRequest, quantity);

    setTimeout(() => {
      setIsAddingToCart(false);
    }, 900);
  };

  return (
    <div className={styles.stickyBar} role="region" aria-label="Acciones rápidas de compra">
      <button
        className={styles.viewPanelBtn}
        onClick={onOpenPanel}
        type="button"
        aria-label="Abrir panel completo de compra"
      >
        <Icon name="menu_open" size={20} />
        Panel
      </button>

      {!isOutOfStock && (
        <div className={styles.quantityControls}>
          <button
            className={styles.quantityBtn}
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1 || !canAddToCart}
            aria-label="Disminuir cantidad"
            type="button"
          >
            <Icon name="remove" size={16} />
          </button>
          <span className={styles.quantityValue}>{quantity}</span>
          <button
            className={styles.quantityBtn}
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= maxSelectableQuantity || !canAddToCart}
            aria-label="Aumentar cantidad"
            type="button"
          >
            <Icon name="add" size={16} />
          </button>
        </div>
      )}

      <button
        className={styles.addToCartBtn}
        onClick={handleAddToCart}
        disabled={isAddingToCart || !canAddToCart}
        type="button"
        aria-label={canAddToCart ? 'Agregar al carrito' : 'Producto no disponible'}
      >
        {isOutOfStock
          ? 'Sin stock'
          : isAddingToCart
            ? 'Agregado'
            : `Agregar ${hasPrice ? formatPrice(displayPrice * quantity) : ''}`.trim()}
      </button>
    </div>
  );
}

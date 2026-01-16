'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './pos.module.css';

const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Otro'
];

export default function AdminPOS() {
  const { apiRequest } = useAuth();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [usbDevice, setUsbDevice] = useState(null);
  const [usbPrinting, setUsbPrinting] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('pos-printing');
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    if (!navigator?.usb) return;

    const handleDisconnect = (event) => {
      if (usbDevice && event.device === usbDevice) {
        setUsbDevice(null);
      }
    };

    navigator.usb.addEventListener('disconnect', handleDisconnect);
    return () => {
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
    };
  }, [usbDevice]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const normalizedDiscount = useMemo(() => {
    if (!discountAmount) return 0;
    return Math.min(Math.max(discountAmount, 0), subtotal);
  }, [discountAmount, subtotal]);

  const total = useMemo(() => {
    return Math.max(subtotal - normalizedDiscount, 0);
  }, [subtotal, normalizedDiscount]);

  useEffect(() => {
    let isActive = true;
    const timeout = setTimeout(async () => {
      try {
        setLoadingProducts(true);
        const params = new URLSearchParams({
          search,
          status: 'active',
          limit: '20'
        });
        const response = await apiRequest(`/api/admin/products?${params.toString()}`);
        if (!response.ok) {
          throw new Error('No fue posible cargar los productos');
        }
        const data = await response.json();
        if (isActive) {
          const nextProducts = Array.isArray(data.products)
            ? data.products
            : Array.isArray(data.products?.rows)
              ? data.products.rows
              : [];
          setProducts(nextProducts);
        }
      } catch (error) {
        if (isActive) {
          console.error('Error loading products:', error);
          toast.error('Error al cargar los productos');
        }
      } finally {
        if (isActive) {
          setLoadingProducts(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [search, apiRequest]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const addProduct = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: parseFloat(product.price || 0),
          quantity: 1
        }
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const resetSale = () => {
    setCartItems([]);
    setCustomer({ name: '', email: '', phone: '' });
    setNotes('');
    setDiscountAmount(0);
    setPaymentMethod(PAYMENT_METHODS[0]);
  };

  const handleSubmit = async () => {
    if (!customer.name.trim() || !customer.email.trim()) {
      toast.error('Nombre y correo del cliente son obligatorios');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        user_id: null,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim(),
        customer_name: customer.name.trim(),
        payment_method: paymentMethod,
        shipping_method: 'Recoger en tienda',
        subtotal,
        tax_amount: 0,
        shipping_amount: 0,
        discount_amount: normalizedDiscount,
        total_amount: total,
        notes: notes.trim()
      };

      const response = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        throw new Error('No fue posible crear el pedido');
      }

      const result = await response.json();
      const orderNumber = result.order_number || result?.order?.order_number || `ORD-${Date.now()}`;

      setLastOrder({
        orderNumber,
        createdAt: new Date().toISOString(),
        customer: { ...customer },
        items: [...cartItems],
        subtotal,
        discount: normalizedDiscount,
        total,
        paymentMethod
      });

      resetSale();
      toast.success(`Pedido ${orderNumber} creado y notificado`);
    } catch (error) {
      console.error('Error creating POS order:', error);
      toast.error('No se pudo crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!lastOrder) {
      toast.error('No hay un ticket para imprimir');
      return;
    }
    document.body.classList.add('pos-printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('pos-printing');
    }, 1000);
  };

  const connectUsbPrinter = async () => {
    if (!navigator?.usb) {
      toast.error('WebUSB no está disponible en este navegador');
      return;
    }

    try {
      const device = await navigator.usb.requestDevice({
        filters: []
      });
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      setUsbDevice(device);
      toast.success('Impresora USB conectada');
    } catch (error) {
      console.error('Error connecting USB printer:', error);
      if (error?.name === 'SecurityError' || `${error?.message}`.includes('Access denied')) {
        toast.error('Acceso denegado. Revisa permisos y driver WinUSB para la impresora.');
      } else {
        toast.error('No se pudo conectar la impresora');
      }
    }
  };

  const buildUsbReceipt = (order) => {
    const encoder = new TextEncoder();
    const lines = [];
    const now = new Date(order.createdAt);

    lines.push('\x1B\x40'); // Initialize
    lines.push('\x1B\x61\x01'); // Center
    lines.push('Patito Montenegro\n');
    lines.push('Ticket de venta\n');
    lines.push('\n');
    lines.push('\x1B\x61\x00'); // Left
    lines.push(`Pedido: ${order.orderNumber}\n`);
    lines.push(`${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX')}\n`);
    lines.push(`Cliente: ${order.customer.name}\n`);
    if (order.customer.email) {
      lines.push(`${order.customer.email}\n`);
    }
    lines.push('\n');

    order.items.forEach((item) => {
      const totalItem = formatCurrency(item.price * item.quantity);
      lines.push(`${item.name}\n`);
      lines.push(`x${item.quantity} ${totalItem}\n`);
    });

    lines.push('\n');
    lines.push(`Subtotal: ${formatCurrency(order.subtotal)}\n`);
    if (order.discount > 0) {
      lines.push(`Descuento: -${formatCurrency(order.discount)}\n`);
    }
    lines.push(`Total: ${formatCurrency(order.total)}\n`);
    lines.push(`Pago: ${order.paymentMethod}\n`);
    lines.push('\n');
    lines.push('\x1B\x61\x01'); // Center
    lines.push('Gracias por tu compra.\n');
    lines.push('\n\n\n');
    lines.push('\x1D\x56\x00'); // Cut

    return encoder.encode(lines.join(''));
  };

  const handleUsbPrint = async () => {
    if (!lastOrder) {
      toast.error('No hay un ticket para imprimir');
      return;
    }
    if (!navigator?.usb) {
      toast.error('WebUSB no está disponible en este navegador');
      return;
    }
    if (!usbDevice) {
      toast.error('Conecta primero la impresora USB');
      return;
    }

    setUsbPrinting(true);
    try {
      if (!usbDevice.opened) {
        await usbDevice.open();
      }
      if (usbDevice.configuration === null) {
        await usbDevice.selectConfiguration(1);
      }
      await usbDevice.claimInterface(0);

      const outEndpoint = usbDevice.configuration.interfaces[0]
        .alternates[0]
        .endpoints.find((endpoint) => endpoint.direction === 'out');

      if (!outEndpoint) {
        throw new Error('No se encontró endpoint de salida');
      }

      const payload = buildUsbReceipt(lastOrder);
      await usbDevice.transferOut(outEndpoint.endpointNumber, payload);
      toast.success('Ticket enviado a la impresora');
    } catch (error) {
      console.error('Error printing via USB:', error);
      toast.error('No se pudo imprimir por USB');
    } finally {
      setUsbPrinting(false);
    }
  };

  return (
    <AdminLayout title="Punto de venta">
      <div className={styles.container}>
        <section className={styles.productsSection}>
          <div className={styles.sectionHeader}>
            <h2>Productos</h2>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o SKU"
              className={styles.searchInput}
            />
          </div>
          <div className={styles.productsList}>
            {loadingProducts ? (
              <div className={styles.loading}>Cargando productos...</div>
            ) : !Array.isArray(products) || products.length === 0 ? (
              <div className={styles.emptyState}>No hay productos disponibles</div>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className={styles.productCard}
                >
                  <div>
                    <p className={styles.productName}>{product.name}</p>
                    <p className={styles.productSku}>{product.sku || 'SKU sin definir'}</p>
                  </div>
                  <span className={styles.productPrice}>{formatCurrency(product.price)}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={styles.cartSection}>
          <div className={styles.sectionHeader}>
            <h2>Venta actual</h2>
            <button type="button" onClick={resetSale} className={styles.clearButton}>
              Limpiar
            </button>
          </div>

          <div className={styles.cartList}>
            {cartItems.length === 0 ? (
              <div className={styles.emptyState}>No hay productos en la venta</div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <p className={styles.cartItemName}>{item.name}</p>
                    <p className={styles.cartItemSku}>{item.sku || 'SKU sin definir'}</p>
                    <p className={styles.cartItemPrice}>{formatCurrency(item.price)}</p>
                  </div>
                  <div className={styles.cartItemActions}>
                    <div className={styles.quantityControls}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className={styles.qtyButton}
                      >
                        −
                      </button>
                      <span className={styles.qtyValue}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className={styles.qtyButton}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className={styles.removeButton}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <label className={styles.discountRow}>
              <span>Descuento</span>
              <input
                type="number"
                min="0"
                step="1"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(Number(event.target.value))}
                className={styles.discountInput}
              />
            </label>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className={styles.customerSection}>
            <h3>Datos del cliente</h3>
            <div className={styles.customerFields}>
              <input
                type="text"
                placeholder="Nombre completo"
                value={customer.name}
                onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
                className={styles.input}
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={customer.email}
                onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
                className={styles.input}
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={customer.phone}
                onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.paymentSection}>
            <label className={styles.paymentLabel}>
              Método de pago
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className={styles.select}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas internas para el pedido"
              className={styles.textarea}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={styles.submitButton}
          >
            {submitting ? 'Procesando...' : 'Crear pedido y enviar correo'}
          </button>

          <div className={styles.usbActions}>
            <button
              type="button"
              onClick={connectUsbPrinter}
              className={styles.secondaryButton}
            >
              {usbDevice ? 'Impresora conectada' : 'Conectar impresora USB'}
            </button>
          </div>

          {lastOrder && (
            <div className={styles.receiptSection}>
              <div className={styles.receiptHeader}>
                <div>
                  <h3>Ticket listo</h3>
                  <p>Pedido {lastOrder.orderNumber}</p>
                </div>
                <button type="button" onClick={handlePrint} className={styles.printButton}>
                  Imprimir ticket
                </button>
              </div>
              <p className={styles.printHint}>
                Selecciona la impresora térmica GTP501 en el diálogo de impresión.
              </p>
              <div className={styles.receiptActions}>
                <button
                  type="button"
                  onClick={handleUsbPrint}
                  className={styles.usbPrintButton}
                  disabled={usbPrinting}
                >
                  {usbPrinting ? 'Enviando...' : 'Imprimir por WebUSB'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {lastOrder && (
        <div className={`${styles.printArea} posPrintArea`}>
          <div className={styles.printHeader}>
            <h2>Patito Montenegro</h2>
            <p>Ticket de venta</p>
          </div>
          <div className={styles.printMeta}>
            <span>Pedido: {lastOrder.orderNumber}</span>
            <span>{new Date(lastOrder.createdAt).toLocaleString('es-MX')}</span>
          </div>
          <div className={styles.printMeta}>
            <span>Cliente: {lastOrder.customer.name}</span>
            <span>{lastOrder.customer.email}</span>
          </div>
          <div className={styles.printItems}>
            {lastOrder.items.map((item) => (
              <div key={item.id} className={styles.printItemRow}>
                <div className={styles.printItemName}>{item.name}</div>
                <div className={styles.printItemQty}>x{item.quantity}</div>
                <div className={styles.printItemPrice}>{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className={styles.printTotals}>
            <div>
              <span>Subtotal</span>
              <span>{formatCurrency(lastOrder.subtotal)}</span>
            </div>
            {lastOrder.discount > 0 && (
              <div>
                <span>Descuento</span>
                <span>-{formatCurrency(lastOrder.discount)}</span>
              </div>
            )}
            <div className={styles.printTotalRow}>
              <span>Total</span>
              <span>{formatCurrency(lastOrder.total)}</span>
            </div>
          </div>
          <div className={styles.printFooter}>
            <p>Pago: {lastOrder.paymentMethod}</p>
            <p>Gracias por tu compra.</p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

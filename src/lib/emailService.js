// URL base de la API de Brevo
const BREVO_API_URL = 'https://api.brevo.com/v3';

// Configuraciones por defecto
const DEFAULT_SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || 'noreply@patitomontenegro.com',
  name: process.env.BREVO_SENDER_NAME || 'Dingerbites'
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@patitomontenegro.com';

/**
 * Envía un correo usando Brevo
 * @param {Object} emailData - Datos del correo
 * @param {Array} emailData.to - Lista de destinatarios
 * @param {string} emailData.subject - Asunto del correo
 * @param {string} emailData.htmlContent - Contenido HTML del correo
 * @param {Object} emailData.sender - Remitente (opcional)
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendEmail({ to, subject, htmlContent, sender = DEFAULT_SENDER }) {
  try {
    // Verificar que la API key esté configurada
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    const payload = {
      sender: sender,
      to: to,
      subject: subject,
      htmlContent: htmlContent
    };

    console.log('[Send] Enviando correo vía API REST de Brevo...');
    console.log('[Email] Destinatarios:', to.map(t => t.email).join(', '));
    console.log('[Info] Asunto:', subject);

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('[OK] Correo enviado exitosamente:', responseData);
      return { 
        success: true, 
        data: responseData,
        method: 'rest_api'
      };
    } else {
      console.error('[Error] Error de la API de Brevo:', responseData);
      throw new Error(`API Error: ${responseData.message || 'Error desconocido'} (${response.status})`);
    }

  } catch (error) {
    console.error('[Error] Error enviando correo:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

/**
 * Genera el contenido HTML para el correo del administrador
 * @param {Object} orderData - Datos del pedido
 * @returns {string} - Contenido HTML
 */
export function generateAdminEmailContent(orderData) {
  const {
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    total_amount,
    payment_method,
    shipping_method,
    items,
    service_items,
    address,
    notes,
    created_at
  } = orderData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  let itemsHtml = '';
  
  // Productos
  if (items && items.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    itemsHtml += '<h3 style="color: #2d3748; margin-bottom: 16px;">Productos:</h3>';
    itemsHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
    itemsHtml += '<thead><tr style="background-color: #f7fafc;"><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Producto</th><th style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">Cantidad</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Precio Unit.</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Total</th></tr></thead>';
    itemsHtml += '<tbody>';
    
    items.forEach(item => {
      const productUrl = item.product_slug ? `${baseUrl}/catalog/${item.product_slug}` : '#';
      const hasImage = item.product_image && item.product_image.trim() !== '';
      
      itemsHtml += `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${hasImage ? `
              <div style="flex-shrink: 0;">
                <img src="${item.product_image}" alt="${item.product_name || 'Producto'}" 
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">
              </div>
            ` : ''}
            <div>
              ${item.product_slug ? `
                <a href="${productUrl}" style="color: #3182ce; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ${item.product_name || 'Producto'}
                </a>
              ` : `
                <span style="font-weight: 600; font-size: 16px; color: #2d3748;">
                  ${item.product_name || 'Producto'}
                </span>
              `}
              ${item.product_slug ? `
                <br><small style="color: #718096;">Ver producto</small>
              ` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.unit_price || 0)}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.total_price || 0)}</td>
      </tr>`;
    });
    
    itemsHtml += '</tbody></table>';
  }

  // Servicios
  if (service_items && service_items.length > 0) {
    itemsHtml += '<h3 style="color: #2d3748; margin-bottom: 16px;">Servicios:</h3>';
    itemsHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
    itemsHtml += '<thead><tr style="background-color: #f7fafc;"><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Servicio</th><th style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">Cantidad</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Precio Unit.</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Total</th></tr></thead>';
    itemsHtml += '<tbody>';
    
    service_items.forEach(item => {
      itemsHtml += `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.service_name || 'Servicio'}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.unit_price || 0)}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.total_price || 0)}</td>
      </tr>`;
    });
    
    itemsHtml += '</tbody></table>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo Pedido - ${order_number}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0;">
          <h1 style="color: #2d3748; margin: 0; font-size: 28px;">Nuevo Pedido Recibido</h1>
          <p style="color: #718096; margin: 8px 0 0 0; font-size: 16px;">Dingerbites</p>
        </div>

        <!-- Información del Pedido -->
        <div style="background-color: #f7fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">Información del Pedido</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Número de Pedido:</td>
              <td style="padding: 8px 0; color: #2d3748;">${order_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Fecha:</td>
              <td style="padding: 8px 0; color: #2d3748;">${formatDate(created_at)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Total:</td>
              <td style="padding: 8px 0; color: #2d3748; font-size: 16px; font-weight: bold;">${formatCurrency(total_amount)}</td>
            </tr>
          </table>
        </div>

        <!-- Información del Cliente -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">Información del Cliente</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Nombre:</td>
              <td style="padding: 8px 0; color: #2d3748;">${customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Email:</td>
              <td style="padding: 8px 0; color: #2d3748;"><a href="mailto:${customer_email}" style="color: #3182ce; text-decoration: none;">${customer_email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Teléfono:</td>
              <td style="padding: 8px 0; color: #2d3748;">${customer_phone || 'No proporcionado'}</td>
            </tr>
          </table>
        </div>

        <!-- Detalles del Pedido -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">Detalles del Pedido</h2>
          ${itemsHtml}
        </div>

        <!-- Información de Entrega -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">Información de Entrega</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Método de Entrega:</td>
              <td style="padding: 8px 0; color: #2d3748;">${shipping_method || 'No especificado'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Método de Pago:</td>
              <td style="padding: 8px 0; color: #2d3748;">${payment_method || 'No especificado'}</td>
            </tr>
            ${address ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Dirección de Entrega:</td>
              <td style="padding: 8px 0; color: #2d3748;">${address}</td>
            </tr>
            ` : ''}
            ${notes ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Notas:</td>
              <td style="padding: 8px 0; color: #2d3748;">${notes}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0; font-size: 14px;">
            Este es un correo automático generado por el sistema de e-commerce de Dingerbites.
          </p>
          <p style="color: #718096; margin: 8px 0 0 0; font-size: 14px;">
            Por favor, procese este pedido lo antes posible.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Genera el contenido HTML para el correo del cliente
 * @param {Object} orderData - Datos del pedido
 * @returns {string} - Contenido HTML
 */
const BBVA_TITULAR = 'María Fernanda Villegas Nieto';

export function generateCustomerEmailContent(orderData) {
  const {
    order_number,
    customer_name,
    total_amount,
    payment_method,
    shipping_method,
    items,
    service_items,
    address,
    pickup_point,
    notes,
    created_at
  } = orderData;

  const isTransfer = payment_method && payment_method.toLowerCase().includes('transferencia');
  const bbvaClabe = process.env.NEXT_PUBLIC_BBVA_CLABE || '';
  const bbvaCardNumber = process.env.NEXT_PUBLIC_BBVA_CARD_NUMBER || '';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  let itemsHtml = '';
  
  // Productos
  if (items && items.length > 0) {
    itemsHtml += '<h3 style="color: #2d3748; margin-bottom: 16px;">Productos:</h3>';
    itemsHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
    itemsHtml += '<thead><tr style="background-color: #f7fafc;"><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Producto</th><th style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">Cantidad</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Total</th></tr></thead>';
    itemsHtml += '<tbody>';
    
    items.forEach(item => {
      itemsHtml += `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.product_name || 'Producto'}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.total_price || 0)}</td>
      </tr>`;
    });
    
    itemsHtml += '</tbody></table>';
  }

  // Servicios
  if (service_items && service_items.length > 0) {
    itemsHtml += '<h3 style="color: #2d3748; margin-bottom: 16px;">Servicios:</h3>';
    itemsHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">';
    itemsHtml += '<thead><tr style="background-color: #f7fafc;"><th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Servicio</th><th style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">Cantidad</th><th style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">Total</th></tr></thead>';
    itemsHtml += '<tbody>';
    
    service_items.forEach(item => {
      itemsHtml += `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.service_name || 'Servicio'}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.total_price || 0)}</td>
      </tr>`;
    });
    
    itemsHtml += '</tbody></table>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido - ${order_number}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0;">
          <h1 style="color: #2d3748; margin: 0; font-size: 28px;">Pedido Confirmado</h1>
          <p style="color: #718096; margin: 8px 0 0 0; font-size: 16px;">Dingerbites</p>
        </div>

        <!-- Saludo -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 22px;">¡Hola ${customer_name}!</h2>
          <p style="color: #4a5568; margin: 0; font-size: 16px;">
            Hemos recibido tu pedido y está siendo procesado. Te contactaremos pronto para coordinar la entrega.
          </p>
        </div>

        <!-- Información del Pedido -->
        <div style="background-color: #f7fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 16px;">Resumen de tu Pedido</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Número de Pedido:</td>
              <td style="padding: 8px 0; color: #2d3748;">${order_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Fecha:</td>
              <td style="padding: 8px 0; color: #2d3748;">${formatDate(created_at)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Total:</td>
              <td style="padding: 8px 0; color: #2d3748; font-size: 16px; font-weight: bold;">${formatCurrency(total_amount)}</td>
            </tr>
          </table>
        </div>

        <!-- Detalles del Pedido -->
        <div style="margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 16px;">Detalles de tu Pedido</h3>
          ${itemsHtml}
        </div>

        <!-- Aviso Confirmación día de entrega -->
        <div style="background-color: #e6f7ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #91d5ff;">
          <p style="margin: 0; color: #0050b3; font-weight: 600;">Se enviará mensaje por correo electrónico y teléfono para confirmar el día de entrega.</p>
        </div>

        <!-- Información de Entrega -->
        <div style="margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 16px;">Información de Entrega</h3>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Método de Entrega:</strong> ${shipping_method || 'No especificado'}</p>
            <p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Método de Pago:</strong> ${payment_method || 'No especificado'}</p>
            ${address ? `<p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Dirección de Entrega:</strong> ${address}</p>` : ''}
            ${pickup_point ? `<p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Punto de recolección:</strong> ${pickup_point}</p>` : ''}
            ${notes ? `<p style="margin: 0; color: #2d3748;"><strong>Notas:</strong> ${notes}</p>` : ''}
          </div>
        </div>

        ${isTransfer ? `
        <!-- Datos de Transferencia BBVA -->
        <div style="margin-bottom: 32px;">
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border: 2px solid #f59e0b; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; color: #92400e; font-size: 16px; font-weight: 700;">IMPORTANTE: Agrega el número de pedido <strong>${order_number}</strong> en el concepto o referencia de tu transferencia.</p>
          </div>
          <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; border: 2px solid #ef4444; margin-bottom: 24px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">Si no se recibe el comprobante de pago o el número de pedido no se agrega en la transferencia, el pedido será cancelado.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h4 style="margin: 0 0 16px 0; color: #2d3748;">Datos para transferencia</h4>
            <p style="margin: 8px 0; color: #4a5568;"><strong>Banco:</strong> BBVA</p>
            <p style="margin: 8px 0; color: #4a5568;"><strong>Titular:</strong> ${BBVA_TITULAR}</p>
            ${bbvaClabe ? `<p style="margin: 8px 0; color: #4a5568;"><strong>CLABE:</strong> ${bbvaClabe}</p>` : ''}
            ${bbvaCardNumber ? `<p style="margin: 8px 0; color: #4a5568;"><strong>Número de tarjeta:</strong> ${bbvaCardNumber}</p>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Estado del Pedido -->
        <div style="background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%); padding: 24px; border-radius: 12px; margin-bottom: 32px; border: 1px solid #f6ad55;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 16px;">Estado de tu Pedido</h3>
          <p style="color: #4a5568; margin: 0 0 16px 0;">
            Tu pedido está actualmente <strong style="color: #c05621;">en proceso</strong>. Nuestro equipo está revisando los detalles y preparando tu orden.
          </p>
          <p style="color: #4a5568; margin: 0;">
            Te contactaremos pronto para coordinar la entrega y cualquier detalle adicional.
          </p>
        </div>

        <!-- Contacto -->
        <div style="background-color: #f7fafc; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 16px;">¿Necesitas Ayuda?</h3>
          <p style="color: #4a5568; margin: 0 0 16px 0;">
            Si tienes alguna pregunta sobre tu pedido o necesitas hacer algún cambio, no dudes en contactarnos:
          </p>
          <p style="color: #4a5568; margin: 0;">
            <a href="mailto:admin@patitomontenegro.com" style="color: #3182ce; text-decoration: none;">admin@patitomontenegro.com</a><br>
            WhatsApp: Pronto te enviaremos un mensaje
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ¡Gracias por elegirnos!
          </p>
          <p style="color: #718096; margin: 0; font-size: 14px;">
            Dingerbites - Tu tienda online de confianza
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Envía las notificaciones de correo para un nuevo pedido
 * @param {Object} orderData - Datos del pedido
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendOrderNotifications(orderData) {
  const results = {
    adminEmail: { success: false },
    customerEmail: { success: false }
  };

  try {
    // Enviar correo al administrador
    const adminEmailResult = await sendEmail({
      to: [{ email: ADMIN_EMAIL, name: 'Administrador' }],
      subject: `Nuevo Pedido Recibido - ${orderData.order_number}`,
      htmlContent: generateAdminEmailContent(orderData)
    });
    results.adminEmail = adminEmailResult;

    // Enviar correo al cliente
    if (orderData.customer_email) {
      const customerEmailResult = await sendEmail({
        to: [{ email: orderData.customer_email, name: orderData.customer_name || 'Cliente' }],
        subject: `Confirmación de Pedido - ${orderData.order_number}`,
        htmlContent: generateCustomerEmailContent(orderData)
      });
      results.customerEmail = customerEmailResult;
      if (!customerEmailResult.success) {
        console.error('Customer order confirmation email failed:', customerEmailResult.error);
      }
    } else {
      console.warn('Order has no customer_email; skipping customer notification');
    }

    return results;
  } catch (error) {
    console.error('Error sending order notifications:', error);
    return results;
  }
}

export function generateBackInStockEmailContent({ customerName, product }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const productUrl = product?.slug ? `${baseUrl}/catalog/${product.slug}` : baseUrl;
  const productImage = product?.image || '';
  const productPrice =
    product?.price != null
      ? new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(Number(product.price))
      : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Producto de vuelta en stock</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2d3748; margin: 0; font-size: 28px;">Tu producto ya tiene stock</h1>
          <p style="color: #718096; margin-top: 8px;">Dingerbites</p>
        </div>

        <p style="margin-bottom: 24px; color: #4a5568;">
          Hola ${customerName || 'Cliente'}, el producto que estabas esperando vuelve a estar disponible.
        </p>

        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; gap: 16px; align-items: center;">
            ${productImage ? `<img src="${productImage}" alt="${product?.name || 'Producto'}" style="width: 96px; height: 96px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">` : ''}
            <div>
              <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #2d3748;">${product?.name || 'Producto'}</h2>
              ${productPrice ? `<p style="margin: 0; color: #4a5568; font-size: 16px;"><strong>Precio:</strong> ${productPrice}</p>` : ''}
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${productUrl}" style="display: inline-block; background-color: #6b21a8; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
            Ver producto
          </a>
        </div>

        <p style="color: #718096; margin-top: 24px; font-size: 14px; text-align: center;">
          Recibes este correo porque activaste un recordatorio de stock.
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function sendBackInStockNotification({ email, name, product }) {
  if (!email) {
    return { success: false, error: 'Recipient email is required' };
  }

  return sendEmail({
    to: [{ email, name: name || 'Cliente' }],
    subject: `Producto disponible nuevamente: ${product?.name || 'Producto'}`,
    htmlContent: generateBackInStockEmailContent({
      customerName: name,
      product
    })
  });
}

export function generateAdminQuestionEmailContent({ productName, productSlug, question, customerName, adminUrl }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const productUrl = productSlug ? `${baseUrl}/catalog/${productSlug}` : baseUrl;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva pregunta de producto</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px;">
        <h1 style="margin-top: 0; color: #2d3748;">Nueva pregunta de cliente</h1>
        <p style="color: #4a5568;">${customerName || 'Un usuario'} hizo una nueva pregunta sobre un producto.</p>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>Producto:</strong> <a href="${productUrl}" style="color: #2563eb; text-decoration: none;">${productName || 'Producto'}</a></p>
          <p style="margin: 0;"><strong>Pregunta:</strong> ${question}</p>
        </div>
        <a href="${adminUrl}" style="display: inline-block; background: #6b21a8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
          Responder en admin
        </a>
      </div>
    </body>
    </html>
  `;
}

export function generateUserQuestionAnsweredEmailContent({ customerName, productName, productSlug, question, answer }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const productUrl = productSlug ? `${baseUrl}/catalog/${productSlug}` : baseUrl;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu pregunta fue respondida</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px;">
        <h1 style="margin-top: 0; color: #2d3748;">Tu pregunta ya tiene respuesta</h1>
        <p style="color: #4a5568;">Hola ${customerName || 'cliente'}, el equipo respondió tu pregunta.</p>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>Producto:</strong> ${productName || 'Producto'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Pregunta:</strong> ${question}</p>
          <p style="margin: 0;"><strong>Respuesta:</strong> ${answer}</p>
        </div>
        <a href="${productUrl}" style="display: inline-block; background: #6b21a8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
          Ver producto
        </a>
      </div>
    </body>
    </html>
  `;
}

export async function sendNewQuestionAdminNotificationEmail({ productName, productSlug, question, customerName, questionId }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminUrl = `${baseUrl}/admin/questions?questionId=${encodeURIComponent(String(questionId || ''))}`;
  return sendEmail({
    to: [{ email: ADMIN_EMAIL, name: 'Administrador' }],
    subject: `Nueva pregunta sobre ${productName || 'producto'}`,
    htmlContent: generateAdminQuestionEmailContent({
      productName,
      productSlug,
      question,
      customerName,
      adminUrl
    })
  });
}

export async function sendQuestionAnsweredUserEmail({ email, customerName, productName, productSlug, question, answer }) {
  if (!email) {
    return { success: false, error: 'Recipient email is required' };
  }

  return sendEmail({
    to: [{ email, name: customerName || 'Cliente' }],
    subject: `Respondimos tu pregunta sobre ${productName || 'un producto'}`,
    htmlContent: generateUserQuestionAnsweredEmailContent({
      customerName,
      productName,
      productSlug,
      question,
      answer
    })
  });
}

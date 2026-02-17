// URL base de la API de Brevo
const BREVO_API_URL = 'https://api.brevo.com/v3';

// Configuraciones por defecto
const DEFAULT_SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || 'noreply@patitomontenegro.com',
  name: process.env.BREVO_SENDER_NAME || 'Wildshot Games'
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

    console.log('📤 Enviando correo vía API REST de Brevo...');
    console.log('📧 Destinatarios:', to.map(t => t.email).join(', '));
    console.log('📋 Asunto:', subject);

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
      console.log('✅ Correo enviado exitosamente:', responseData);
      return { 
        success: true, 
        data: responseData,
        method: 'rest_api'
      };
    } else {
      console.error('❌ Error de la API de Brevo:', responseData);
      throw new Error(`API Error: ${responseData.message || 'Error desconocido'} (${response.status})`);
    }

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
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
          <h1 style="color: #2d3748; margin: 0; font-size: 28px;">🛍️ Nuevo Pedido Recibido</h1>
          <p style="color: #718096; margin: 8px 0 0 0; font-size: 16px;">Wildshot Games</p>
        </div>

        <!-- Información del Pedido -->
        <div style="background-color: #f7fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">📋 Información del Pedido</h2>
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
              <td style="padding: 8px 0; color: #2d3748; font-size: 18px; font-weight: bold;">${formatCurrency(total_amount)}</td>
            </tr>
          </table>
        </div>

        <!-- Información del Cliente -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">👤 Información del Cliente</h2>
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
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">📦 Detalles del Pedido</h2>
          ${itemsHtml}
        </div>

        <!-- Información de Entrega -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 20px;">🚚 Información de Entrega</h2>
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
            Este es un correo automático generado por el sistema de e-commerce de Wildshot Games.
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
          <h1 style="color: #2d3748; margin: 0; font-size: 28px;">✅ Pedido Confirmado</h1>
          <p style="color: #718096; margin: 8px 0 0 0; font-size: 16px;">Wildshot Games</p>
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
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px;">📋 Resumen de tu Pedido</h3>
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
              <td style="padding: 8px 0; color: #2d3748; font-size: 18px; font-weight: bold;">${formatCurrency(total_amount)}</td>
            </tr>
          </table>
        </div>

        <!-- Detalles del Pedido -->
        <div style="margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px;">📦 Detalles de tu Pedido</h3>
          ${itemsHtml}
        </div>

        <!-- Información de Entrega -->
        <div style="margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px;">🚚 Información de Entrega</h3>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Método de Entrega:</strong> ${shipping_method || 'No especificado'}</p>
            <p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Método de Pago:</strong> ${payment_method || 'No especificado'}</p>
            ${address ? `<p style="margin: 0 0 12px 0; color: #2d3748;"><strong>Dirección de Entrega:</strong> ${address}</p>` : ''}
            ${notes ? `<p style="margin: 0; color: #2d3748;"><strong>Notas:</strong> ${notes}</p>` : ''}
          </div>
        </div>

        <!-- Estado del Pedido -->
        <div style="background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%); padding: 24px; border-radius: 12px; margin-bottom: 32px; border: 1px solid #f6ad55;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px;">📊 Estado de tu Pedido</h3>
          <p style="color: #4a5568; margin: 0 0 16px 0;">
            Tu pedido está actualmente <strong style="color: #c05621;">en proceso</strong>. Nuestro equipo está revisando los detalles y preparando tu orden.
          </p>
          <p style="color: #4a5568; margin: 0;">
            Te contactaremos pronto para coordinar la entrega y cualquier detalle adicional.
          </p>
        </div>

        <!-- Contacto -->
        <div style="background-color: #f7fafc; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
          <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px;">📞 ¿Necesitas Ayuda?</h3>
          <p style="color: #4a5568; margin: 0 0 16px 0;">
            Si tienes alguna pregunta sobre tu pedido o necesitas hacer algún cambio, no dudes en contactarnos:
          </p>
          <p style="color: #4a5568; margin: 0;">
            📧 <a href="mailto:admin@patitomontenegro.com" style="color: #3182ce; text-decoration: none;">admin@patitomontenegro.com</a><br>
            📱 WhatsApp: Pronto te enviaremos un mensaje
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ¡Gracias por elegirnos!
          </p>
          <p style="color: #718096; margin: 0; font-size: 14px;">
            Wildshot Games - Tu tienda online de confianza
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
      subject: `🛍️ Nuevo Pedido Recibido - ${orderData.order_number}`,
      htmlContent: generateAdminEmailContent(orderData)
    });
    results.adminEmail = adminEmailResult;

    // Enviar correo al cliente
    if (orderData.customer_email) {
      const customerEmailResult = await sendEmail({
        to: [{ email: orderData.customer_email, name: orderData.customer_name }],
        subject: `✅ Confirmación de Pedido - ${orderData.order_number}`,
        htmlContent: generateCustomerEmailContent(orderData)
      });
      results.customerEmail = customerEmailResult;
    }

    return results;
  } catch (error) {
    console.error('Error sending order notifications:', error);
    return results;
  }
}

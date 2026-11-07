import { sendEmail } from './emailService';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wildshotgames.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function statusLabel(status) {
  const labels = {
    picked_up: 'Tu paquete fue enviado',
    in_transit: 'Tu paquete está en camino',
    delivered: 'Tu paquete fue entregado',
    canceled: 'Tu envío fue cancelado',
    failed: 'Hubo un problema con tu envío'
  };
  return labels[status] || 'Actualización de tu envío';
}

function statusMessage(status, orderNumber) {
  const messages = {
    picked_up: `Tu pedido <strong>${orderNumber}</strong> ya fue enviado y está en manos de la paquetería.`,
    in_transit: `Tu pedido <strong>${orderNumber}</strong> está en tránsito hacia su destino.`,
    delivered: `Tu pedido <strong>${orderNumber}</strong> fue entregado correctamente.`,
    canceled: `El envío de tu pedido <strong>${orderNumber}</strong> fue cancelado.`,
    failed: `Hubo un inconveniente con el envío de tu pedido <strong>${orderNumber}</strong>. Nuestro equipo te contactará si es necesario.`
  };
  return messages[status] || `Hay una actualización sobre tu pedido <strong>${orderNumber}</strong>.`;
}

function buildShipmentEmailHtml({
  customerName,
  orderNumber,
  status,
  trackingNumber,
  carrier,
  trackingUrl,
  statusDescription,
  location
}) {
  const title = statusLabel(status);
  const greeting = customerName ? `Hola ${customerName},` : 'Hola,';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <h2 style="color: #111827; margin-bottom: 16px;">${title}</h2>
      <p style="font-size: 16px; line-height: 1.6;">${greeting}</p>
      <p style="font-size: 16px; line-height: 1.6;">${statusMessage(status, orderNumber)}</p>
      ${statusDescription ? `<p style="font-size: 14px; color: #4b5563;">${statusDescription}</p>` : ''}
      ${location ? `<p style="font-size: 14px; color: #4b5563;">Ubicación: ${location}</p>` : ''}
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0;">
        ${carrier ? `<p style="margin: 0 0 8px 0;"><strong>Paquetería:</strong> ${carrier}</p>` : ''}
        ${trackingNumber ? `<p style="margin: 0 0 8px 0;"><strong>Guía:</strong> ${trackingNumber}</p>` : ''}
        ${trackingUrl ? `<p style="margin: 0;"><a href="${trackingUrl}" style="color: #2563eb;">Rastrear paquete</a></p>` : ''}
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        Puedes ver el detalle de tu pedido en <a href="${APP_URL}/orders" style="color: #2563eb;">tu cuenta</a>.
      </p>
    </div>
  `;
}

export async function sendShipmentUpdateEmail({
  to,
  customerName,
  orderNumber,
  status,
  trackingNumber,
  carrier,
  trackingUrl,
  statusDescription,
  location
}) {
  if (!to) return { skipped: true, reason: 'no_recipient' };

  const subject = `${statusLabel(status)} — Pedido ${orderNumber}`;
  const htmlContent = buildShipmentEmailHtml({
    customerName,
    orderNumber,
    status,
    trackingNumber,
    carrier,
    trackingUrl,
    statusDescription,
    location
  });

  return sendEmail({
    to: [{ email: to, name: customerName || to }],
    subject,
    htmlContent
  });
}

export async function sendSurchargeAlertEmail({
  orderNumber,
  trackingNumber,
  surcharge
}) {
  if (!surcharge) return { skipped: true, reason: 'no_surcharge' };

  const isRefund = surcharge.transactionType === 'refund';
  const subject = isRefund
    ? `Reembolso de recargo Envia — ${orderNumber || trackingNumber}`
    : `Recargo Envia aplicado — ${orderNumber || trackingNumber}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${isRefund ? 'Reembolso de recargo' : 'Recargo de envío'}</h2>
      <p><strong>Pedido:</strong> ${orderNumber || 'N/A'}</p>
      <p><strong>Guía:</strong> ${trackingNumber || 'N/A'}</p>
      <p><strong>Tipo:</strong> ${surcharge.type}</p>
      <p><strong>Monto:</strong> ${surcharge.amount} ${surcharge.currency}</p>
      ${surcharge.reason ? `<p><strong>Motivo:</strong> ${surcharge.reason}</p>` : ''}
    </div>
  `;

  return sendEmail({
    to: [{ email: ADMIN_EMAIL, name: 'Admin Dingerbites' }],
    subject,
    htmlContent
  });
}

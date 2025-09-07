import { NextResponse } from 'next/server';
import { sendOrderNotifications } from '../../../lib/emailService';

// POST /api/test-email - Endpoint para probar el envío de correos
export async function POST(request) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Datos de prueba para simular un pedido
    const sampleOrderData = {
      order_number: `TEST-${Date.now()}`,
      customer_name: 'Cliente de Prueba',
      customer_email: testEmail,
      customer_phone: '+52 1234567890',
      total_amount: 1250.00,
      payment_method: 'Transferencia bancaria',
      shipping_method: 'Envío a domicilio',
      items: [
        {
          product_name: 'Esmalte Gel UV - Rojo Intenso',
          quantity: 2,
          unit_price: 350.00,
          total_price: 700.00
        },
        {
          product_name: 'Kit de Uñas Básico',
          quantity: 1,
          unit_price: 450.00,
          total_price: 450.00
        }
      ],
      service_items: [
        {
          service_name: 'Manicure Profesional',
          quantity: 1,
          unit_price: 100.00,
          total_price: 100.00
        }
      ],
      address: 'Calle Principal #123, Colonia Centro, Guadalupe, Nuevo León',
      notes: 'Esta es una prueba del sistema de correos electrónicos.',
      created_at: new Date()
    };

    console.log('🧪 Enviando correos de prueba...');
    
    const results = await sendOrderNotifications(sampleOrderData);
    
    const response = {
      success: true,
      orderNumber: sampleOrderData.order_number,
      testEmail: testEmail,
      results: {
        adminEmail: {
          sent: results.adminEmail.success,
          error: results.adminEmail.error || null
        },
        customerEmail: {
          sent: results.customerEmail.success,
          error: results.customerEmail.error || null
        }
      },
      summary: {
        totalSent: (results.adminEmail.success ? 1 : 0) + (results.customerEmail.success ? 1 : 0),
        totalFailed: (results.adminEmail.success ? 0 : 1) + (results.customerEmail.success ? 0 : 1)
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error testing email notifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test email notifications',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET /api/test-email - Obtener información sobre las pruebas de correo
export async function GET() {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const envVars = {
      BREVO_API_KEY: process.env.BREVO_API_KEY ? '✅ Configurada' : '❌ No configurada',
      BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '❌ No configurada',
      BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || '❌ No configurada',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || '❌ No configurada'
    };

    return NextResponse.json({
      status: 'Test endpoint available',
      environment: process.env.NODE_ENV,
      configuration: envVars,
      instructions: {
        method: 'POST',
        body: { testEmail: 'tu-email@ejemplo.com' },
        description: 'Envía correos de prueba al email especificado y al administrador'
      }
    });

  } catch (error) {
    console.error('Error getting test endpoint info:', error);
    return NextResponse.json(
      { error: 'Failed to get test endpoint info' },
      { status: 500 }
    );
  }
}

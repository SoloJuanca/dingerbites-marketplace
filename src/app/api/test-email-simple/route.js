import { NextResponse } from 'next/server';

// URL base de la API de Brevo
const BREVO_API_URL = 'https://api.brevo.com/v3';

// POST /api/test-email-simple - Prueba simple usando solo la API REST de Brevo
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

    // Verificar variables de entorno
    const envCheck = {
      BREVO_API_KEY: !!process.env.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: !!process.env.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: !!process.env.BREVO_SENDER_NAME,
      ADMIN_EMAIL: !!process.env.ADMIN_EMAIL
    };

    console.log('[Info] Variables de entorno:', envCheck);

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'BREVO_API_KEY no está configurada',
        envCheck
      }, { status: 400 });
    }

    // Probar conexión con la API de Brevo
    console.log('[Test] Probando conexión con API de Brevo...');
    
    try {
      const accountResponse = await fetch(`${BREVO_API_URL}/account`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        }
      });

      const accountData = await accountResponse.json();

      if (!accountResponse.ok) {
        return NextResponse.json({
          success: false,
          error: `Error de conexión con Brevo: ${accountData.message || 'Error desconocido'} (${accountResponse.status})`,
          step: 'connection_test',
          envCheck,
          apiResponse: accountData
        }, { status: 500 });
      }

      console.log('[OK] Conexión exitosa con Brevo:', {
        email: accountData.email,
        firstName: accountData.firstName,
        lastName: accountData.lastName
      });

      // Preparar correo de prueba
      const emailPayload = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@patitomontenegro.com',
          name: process.env.BREVO_SENDER_NAME || 'Dingerbites'
        },
        to: [{ email: testEmail, name: 'Destinatario de Prueba' }],
        subject: 'Prueba API REST - Dingerbites',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Prueba API REST</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2d3748;">API REST Funcionando</h1>
              <p style="color: #718096;">Sistema de correos de Dingerbites</p>
            </div>
            
            <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38a169;">
              <h2 style="color: #2d3748; margin-top: 0;">¡Correo Enviado Exitosamente!</h2>
              <ul style="color: #4a5568;">
                <li>API REST de Brevo funcionando correctamente</li>
                <li>Sin dependencias de librerías externas</li>
                <li>Implementación simple y confiable</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #2d3748; margin-top: 0;">Información de la Cuenta</h3>
              <p style="color: #4a5568; margin: 0;">
                <strong>Email:</strong> ${accountData.email}<br>
                <strong>Nombre:</strong> ${accountData.firstName} ${accountData.lastName}<br>
                ${accountData.companyName ? `<strong>Empresa:</strong> ${accountData.companyName}<br>` : ''}
                <strong>Plan:</strong> ${accountData.plan?.type || 'N/A'}<br>
                <strong>Créditos de Email:</strong> ${accountData.emailCredits || 'Ilimitado'}
              </p>
            </div>
            
            <div style="background: #fff5e6; padding: 20px; border-radius: 8px; border-left: 4px solid #f6ad55;">
              <p style="margin: 0; color: #2d3748;">
                <strong>Método:</strong> API REST Directa<br>
                <strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}<br>
                <strong>Destinatario:</strong> ${testEmail}<br>
                <strong>Endpoint:</strong> https://api.brevo.com/v3/smtp/email
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px;">
                Sistema de correos simplificado - Solo API REST, sin complicaciones.
              </p>
            </div>
          </body>
          </html>
        `
      };

      // Enviar correo
      console.log('[Send] Enviando correo de prueba...');
      
      const emailResponse = await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify(emailPayload)
      });

      const emailResult = await emailResponse.json();

      if (emailResponse.ok) {
        console.log('[OK] Correo enviado exitosamente:', emailResult);
        
        return NextResponse.json({
          success: true,
          message: 'Correo enviado exitosamente usando API REST',
          data: {
            messageId: emailResult.messageId || 'N/A',
            testEmail: testEmail,
            timestamp: new Date().toISOString(),
            sender: emailPayload.sender,
            subject: emailPayload.subject,
            method: 'rest_api'
          },
          account: {
            email: accountData.email,
            name: `${accountData.firstName} ${accountData.lastName}`,
            company: accountData.companyName,
            plan: accountData.plan?.type,
            emailCredits: accountData.emailCredits
          },
          checks: {
            envCheck,
            connectionTest: true,
            emailSent: true
          }
        });
      } else {
        console.error('[Error] Error enviando correo:', emailResult);
        return NextResponse.json({
          success: false,
          error: `Error enviando correo: ${emailResult.message || 'Error desconocido'} (${emailResponse.status})`,
          step: 'send_email',
          details: emailResult,
          checks: {
            envCheck,
            connectionTest: true,
            emailSent: false
          }
        }, { status: 500 });
      }

    } catch (connectionError) {
      console.error('[Error] Error de conexión:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Error de conexión con la API de Brevo: ' + connectionError.message,
        step: 'connection_error',
        envCheck
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Error] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error general: ' + error.message,
      step: 'general'
    }, { status: 500 });
  }
}

// GET /api/test-email-simple - Información sobre el endpoint
export async function GET() {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const envStatus = {
      BREVO_API_KEY: process.env.BREVO_API_KEY ? 'OK' : 'Error (not configured)',
      BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'Error (not configured)',
      BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Error (not configured)',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Error (not configured)',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json({
      status: 'Simple REST API test endpoint ready',
      description: 'Endpoint simplificado que usa únicamente la API REST de Brevo',
      environment: process.env.NODE_ENV,
      configuration: envStatus,
      apiEndpoint: 'https://api.brevo.com/v3/smtp/email',
      documentation: 'https://developers.brevo.com/reference/sendtransacemail',
      usage: {
        method: 'POST',
        body: { testEmail: 'tu-email@ejemplo.com' },
        description: 'Envía un correo usando únicamente la API REST de Brevo'
      },
      advantages: [
        'Sin dependencias de librerías externas',
        'Implementación simple y directa',
        'Basado en la documentación oficial de Brevo',
        'Fácil de mantener y debuggear',
        'Control total sobre las peticiones HTTP'
      ]
    });

  } catch (error) {
    console.error('Error getting test endpoint info:', error);
    return NextResponse.json(
      { error: 'Failed to get test endpoint info' },
      { status: 500 }
    );
  }
}

# Configuración de Correos con Brevo

Este documento explica cómo configurar el sistema de notificaciones por correo electrónico usando Brevo (anteriormente SendinBlue).

## ¿Qué hace este sistema?

Cuando un cliente realiza un pedido en la tienda, el sistema automáticamente:

1. **Envía un correo al administrador** notificando que se recibió un nuevo pedido con todos los detalles
2. **Envía un correo al cliente** confirmando que su pedido está en proceso

## Configuración de Brevo

### 1. Crear cuenta en Brevo

1. Ve a [Brevo.com](https://www.brevo.com/)
2. Crea una cuenta gratuita
3. Verifica tu cuenta de correo

### 2. Obtener API Key

1. Inicia sesión en tu cuenta de Brevo
2. Ve a **Settings** > **API Keys**
3. Crea una nueva API key con los permisos:
   - **Send emails**: Habilitado
   - **Manage contacts**: Opcional (para futuras funcionalidades)
4. Copia la API key generada

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto (si no existe) y agrega las siguientes variables:

```env
# Brevo Email Configuration
BREVO_API_KEY=tu-api-key-de-brevo-aqui
BREVO_SENDER_EMAIL=noreply@tudominio.com
BREVO_SENDER_NAME=Tu Tienda

# Email del administrador que recibirá las notificaciones
ADMIN_EMAIL=admin@tudominio.com
```

## ✅ Implementación Simplificada

Este sistema ahora usa **únicamente la API REST de Brevo**, sin dependencias externas:

- 🚀 **Sin SDK**: No usa librerías externas de Brevo
- 🔗 **API REST Directa**: Usa `fetch()` y la [API oficial de Brevo](https://developers.brevo.com/reference/sendtransacemail)
- 🛠️ **Simple**: Código fácil de mantener y debuggear
- ⚡ **Rápido**: Menos overhead que las librerías
- 🔒 **Confiable**: Sin problemas de compatibilidad de SDKs

### 4. Configurar dominio de envío (Recomendado)

Para mejorar la entregabilidad de correos:

1. En Brevo, ve a **Settings** > **Senders & IP**
2. Agrega y verifica tu dominio
3. Configura los registros DNS requeridos
4. Actualiza `BREVO_SENDER_EMAIL` con un email de tu dominio verificado

## Verificar Configuración

Antes de usar el sistema, ejecuta el script de verificación para asegurarte de que todo esté configurado correctamente:

```bash
node src/utils/verifyEmailConfig.js
```

Este script verificará:
- ✅ Variables de entorno requeridas
- ✅ Importación correcta de la librería Brevo
- ✅ Inicialización del cliente de Brevo
- ✅ Configuración de la API key

### Probar Correos en Desarrollo

- **✅ Prueba Simple** (Recomendado): http://localhost:3000/test-email-simple
- **📧 Prueba Completa**: http://localhost:3000/test-email
- **APIs disponibles**: 
  - `POST /api/test-email-simple` (Recomendado)
  - `POST /api/test-email`

#### Herramientas de Prueba

**Para probar el sistema de correos:**

1. **Prueba Simple** (Recomendado): http://localhost:3000/test-email-simple
   - Usa únicamente la API REST de Brevo
   - Prueba básica y confiable
   - Muestra información de tu cuenta de Brevo

2. **Prueba Completa**: http://localhost:3000/test-email
   - Simula un pedido completo con productos y servicios
   - Envía correos tanto al admin como al cliente
   - Usa los templates completos del sistema

## Estructura de los correos

### Correo para el Administrador

El administrador recibe un correo con:
- 📋 Información del pedido (número, fecha, total)
- 👤 Datos del cliente (nombre, email, teléfono)
- 📦 Lista detallada de productos/servicios
- 🚚 Información de entrega y pago
- 📝 Notas adicionales (si las hay)

### Correo para el Cliente

El cliente recibe un correo con:
- ✅ Confirmación de que el pedido fue recibido
- 📋 Resumen del pedido
- 📦 Lista de productos/servicios
- 🚚 Información de entrega
- 📊 Estado actual: "En proceso"
- 📞 Información de contacto

## Personalización

### Modificar templates de correo

Los templates de correo se encuentran en `src/lib/emailService.js`:

- `generateAdminEmailContent()`: Template para el administrador
- `generateCustomerEmailContent()`: Template para el cliente

### Cambiar remitente

Modifica las variables de entorno:
```env
BREVO_SENDER_EMAIL=ventas@tudominio.com
BREVO_SENDER_NAME=Nombre de tu Tienda
```

### Cambiar destinatario admin

```env
ADMIN_EMAIL=tu-email-admin@tudominio.com
```

## Solución de problemas

### ✅ Sin problemas de SDK

Al usar únicamente la API REST, se eliminan los problemas comunes de SDKs:

- ❌ **Ya no hay**: Errores de importación de librerías
- ❌ **Ya no hay**: Problemas de compatibilidad de versiones
- ❌ **Ya no hay**: Errores de inicialización de clientes
- ❌ **Ya no hay**: Dependencias conflictivas

### Problemas posibles y soluciones

### Los correos no se envían

1. **Verifica la API key**:
   - Asegúrate de que la API key sea correcta
   - Verifica que tenga permisos para enviar correos

2. **Revisa los logs**:
   - Los errores aparecen en la consola del servidor
   - Busca mensajes que empiecen con "Error sending email"

3. **Verifica el dominio del remitente**:
   - Si usas un dominio personalizado, asegúrate de que esté verificado en Brevo

4. **Comprueba las variables de entorno**:
   ```bash
   # En el servidor de desarrollo, verifica que estén cargadas:
   console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Configurada' : 'No configurada');
   ```

### Los correos llegan a spam

1. **Configura SPF, DKIM y DMARC** en tu dominio
2. **Usa un dominio verificado** en Brevo
3. **Revisa el contenido** de los correos para evitar palabras spam

### Límites de envío

- **Plan gratuito de Brevo**: 300 correos por día
- **Planes pagos**: Límites más altos según el plan

## Funcionamiento técnico

### Flujo de envío

1. Cliente completa un pedido
2. Se crea el pedido en la base de datos
3. Se preparan los datos del pedido
4. Se enriquecen con información de productos/servicios
5. Se generan los templates HTML
6. **Se envían los correos con sistema de fallback:**
   - Intenta primero con la librería oficial de Brevo
   - Si falla, usa automáticamente la API REST directa
   - Garantiza máxima confiabilidad
7. Se registran los resultados en logs

### Implementación API REST

El sistema usa únicamente la API REST de Brevo:

```javascript
// Envío directo usando fetch()
const response = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'api-key': process.env.BREVO_API_KEY
  },
  body: JSON.stringify(emailData)
});
```

**Ventajas de la implementación actual:**
- ✅ **Simple**: Solo usa `fetch()` nativo
- ✅ **Sin dependencias**: No requiere librerías externas
- ✅ **Confiable**: Basado en la API oficial de Brevo
- ✅ **Mantenible**: Código fácil de entender y debuggear
- ✅ **Rápido**: Sin overhead de SDKs

### Manejo de errores

- Los correos se envían de forma **asíncrona**
- Si falla el envío, **no afecta** la creación del pedido
- Los errores se registran en los logs del servidor
- El cliente siempre recibe confirmación del pedido

## Próximas mejoras

- [ ] Correos de actualización de estado de pedido
- [ ] Templates responsivos mejorados
- [ ] Sistema de reintento automático
- [ ] Dashboard de estadísticas de correos
- [ ] Plantillas personalizables desde admin

## Soporte

Si tienes problemas con la configuración:

1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Comprueba la configuración de Brevo
4. Contacta al equipo de desarrollo

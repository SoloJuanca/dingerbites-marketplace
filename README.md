# Dingerbites E-commerce

Este es un proyecto de e-commerce construido con [Next.js](https://nextjs.org) 14 usando App Router y JavaScript puro.

## Características Principales

- 🛍️ **E-commerce completo** con carrito, checkout y gestión de pedidos
- 👑 **Panel de administración** para gestión de productos, pedidos y usuarios  
- 📧 **Notificaciones por correo** automáticas usando Brevo
- 🎨 **CSS Modules** para estilos personalizados (sin TailwindCSS)
- 🔐 **Autenticación JWT** con roles de usuario
- 📱 **Diseño responsivo** optimizado para móviles
- 🗄️ **Base de datos PostgreSQL** con esquema completo

## Nuevas Funcionalidades - Notificaciones por Correo 📧

El sistema ahora envía automáticamente correos electrónicos cuando se recibe un pedido:

- **📨 Al Administrador**: Notificación completa con todos los detalles del pedido
- **✅ Al Cliente**: Confirmación de que el pedido está en proceso

### ✅ Implementación Simplificada

**Sin dependencias externas** - Solo usa la API REST de Brevo:

- 🚀 **Sin SDK**: No requiere librerías de Brevo
- 🔗 **API REST Directa**: Usa `fetch()` y la [API oficial](https://developers.brevo.com/reference/sendtransacemail)
- 🛠️ **Simple**: Código fácil de mantener
- ⚡ **Rápido**: Sin overhead de librerías

### Configuración de Correos

1. **Configurar variables de entorno** en `.env.local`:
   ```env
   BREVO_API_KEY=tu-api-key-de-brevo
   BREVO_SENDER_EMAIL=noreply@tudominio.com
   BREVO_SENDER_NAME=Dingerbites
   ADMIN_EMAIL=admin@tudominio.com
   ```

2. **Ver documentación completa**: [BREVO_EMAIL_SETUP.md](./BREVO_EMAIL_SETUP.md)

### Probar Correos en Desarrollo

- **✅ Prueba Simple** (Recomendado): http://localhost:3000/test-email-simple
- **📧 Prueba Completa**: http://localhost:3000/test-email

**Implementación confiable**: Solo API REST, sin complicaciones de SDKs.

## Configuración Inicial

Para probar la integración de envíos de Envia en local, consulta [el entorno de desarrollo de Envia](./docs/envia-development.md).

Primero, ejecuta el servidor de desarrollo:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Added fisical tickets and printing

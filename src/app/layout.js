import { Poppins } from "next/font/google";
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from "../lib/CartContext";
import { AuthProvider } from "../lib/AuthContext";
import { WishlistProvider } from "../lib/WishlistContext";
import CartSync from "../components/CartSync/CartSync";
import WishlistSync from "../components/WishlistSync/WishlistSync";
import CookieBanner from "../components/CookieBanner/CookieBanner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Dingerbites",
    template: "%s | Dingerbites"
  },
  description: "Tienda online de juegos de mesa: familiares, estrategicos, party games y novedades para toda tu mesa.",
  keywords: ["juegos de mesa", "board games", "tienda online", "e-commerce", "compras", "Mexico", "familiares", "estrategia", "party games"],
  authors: [{ name: "Dingerbites" }],
  creator: "Dingerbites",
  publisher: "Dingerbites",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Dingerbites",
    description: "Tienda online de juegos de mesa: familiares, estrategicos, party games y novedades para toda tu mesa.",
    url: "/",
    siteName: "Dingerbites",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dingerbites",
    description: "Tienda online de juegos de mesa: familiares, estrategicos, party games y novedades para toda tu mesa.",
    creator: "@wildshotgames",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { url: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  manifest: '/icons/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={poppins.variable}>
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NCLN9F9C');`}
        </Script>
        {/* End Google Tag Manager */}
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body suppressHydrationWarning={true}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NCLN9F9C"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <CartSync />
              <WishlistSync />
              {children}
              <CookieBanner />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#ffffff',
                    color: '#2d3748',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '500'
                  },
                  success: {
                    iconTheme: {
                      primary: '#48bb78',
                      secondary: '#ffffff'
                    }
                  },
                  error: {
                    iconTheme: {
                      primary: '#f56565',
                      secondary: '#ffffff'
                    }
                  }
                }}
              />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { CartProvider } from "../lib/CartContext";
import { AuthProvider } from "../lib/AuthContext";
import { WishlistProvider } from "../lib/WishlistContext";
import CartSync from "../components/CartSync/CartSync";
import WishlistSync from "../components/WishlistSync/WishlistSync";
import CookieBanner from "../components/CookieBanner/CookieBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Patito Montenegro",
    template: "%s | Patito Montenegro"
  },
  description: "Tu tienda online de confianza con los mejores productos de uñas y belleza en México.",
  keywords: ["tienda online", "e-commerce", "productos", "compras", "México", "uñas", "belleza", "Nuevo León", "Monterrey", "Guadalupe"],
  authors: [{ name: "Patito Montenegro" }],
  creator: "Patito Montenegro",
  publisher: "Patito Montenegro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Patito Montenegro",
    description: "Tu tienda online de confianza con los mejores productos de uñas y belleza en México.",
    url: "/",
    siteName: "Patito Montenegro",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Patito Montenegro",
    description: "Tu tienda online de confianza con los mejores productos de uñas y belleza en México.",
    creator: "@patitomontenegro",
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body suppressHydrationWarning={true}>
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

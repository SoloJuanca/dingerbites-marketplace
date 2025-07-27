'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import styles from './BrowseMenu.module.css';

export default function BrowseMenu() {
  const [activeTab, setActiveTab] = useState('esmaltes');

  const productCategories = {
    esmaltes: [
      {
        id: 1,
        name: 'Esmalte Sueños de Rosa',
        description: 'Esmalte de uñas de larga duración con un acabado rosa soñador que complementa cualquier outfit',
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 2,
        name: 'Laca Felicidad de Mora',
        description: 'Laca de uñas de tono mora rico con acabado de alto brillo y fórmula resistente a astillas',
        price: 14.50,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 3,
        name: 'Esmalte Beso Coral',
        description: 'Esmalte de uñas coral vibrante perfecto para días de verano y vibes de playa',
        price: 11.99,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 4,
        name: 'Elegancia Nude',
        description: 'Esmalte de uñas nude clásico para elegancia atemporal y looks profesionales',
        price: 13.99,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 5,
        name: 'Rosa Brillante',
        description: 'Esmalte de uñas rosa con brillantina que agrega glamour y brillo a cualquier ocasión',
        price: 15.99,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 6,
        name: 'Cereza Pop',
        description: 'Esmalte de uñas rojo cereza audaz para hacer una declaración con confianza',
        price: 12.50,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      }
    ],
    cuidadoPiel: [
      {
        id: 7,
        name: 'Serum Vitamina C',
        description: 'Serum antioxidante con vitamina C pura para iluminar y proteger la piel',
        price: 29.99,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 8,
        name: 'Crema Hidratante Nocturna',
        description: 'Crema reparadora nocturna con ácido hialurónico para una piel suave y radiante',
        price: 35.50,
        image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 9,
        name: 'Limpiador Facial Suave',
        description: 'Gel limpiador facial libre de sulfatos para todo tipo de piel',
        price: 18.99,
        image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 10,
        name: 'Tónico Equilibrante',
        description: 'Tónico facial con extractos naturales para equilibrar el pH de la piel',
        price: 22.99,
        image: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 11,
        name: 'Mascarilla Purificante',
        description: 'Mascarilla de arcilla con carbón activado para limpiar profundamente los poros',
        price: 24.99,
        image: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 12,
        name: 'Protector Solar SPF 50',
        description: 'Protector solar facial de amplio espectro con textura ligera no grasa',
        price: 26.50,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center'
      }
    ],
    herramientas: [
      {
        id: 13,
        name: 'Set de Pinceles Profesional',
        description: 'Set completo de 12 pinceles de maquillaje con cerdas sintéticas de alta calidad',
        price: 45.99,
        image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 14,
        name: 'Rizador de Pestañas',
        description: 'Rizador de pestañas ergonómico con almohadillas de silicona reemplazables',
        price: 16.99,
        image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 15,
        name: 'Esponja de Maquillaje',
        description: 'Esponja beauty blender libre de látex para aplicación uniforme de base',
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 16,
        name: 'Espejo con Luz LED',
        description: 'Espejo de maquillaje con iluminación LED y aumento 10x para precisión',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 17,
        name: 'Organizador de Cosméticos',
        description: 'Organizador acrílico transparente con múltiples compartimentos giratorios',
        price: 28.50,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      },
      {
        id: 18,
        name: 'Pinzas de Precisión',
        description: 'Pinzas profesionales de acero inoxidable con punta inclinada para cejas perfectas',
        price: 19.99,
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
      }
    ]
  };

  const tabs = [
    { id: 'esmaltes', label: 'Esmaltes', className: 'burgerBtn' },
    { id: 'cuidadoPiel', label: 'Cuidado de Piel', className: 'sidesBtn' },
    { id: 'herramientas', label: 'Herramientas', className: 'drinksBtn' }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const currentProducts = productCategories[activeTab];

  return (
    <section className={styles.browseMenu}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Explora nuestra colección</h2>
          <p className={styles.subtitle}>
            Descubre nuestros productos de belleza premium y realiza un pedido en línea, o{' '}
            <a href="#phone" className={styles.phoneLink}>visita</a> nuestra tienda de belleza para 
            consultas personalizadas. Calidad premium, resultados hermosos.
          </p>
          <div className={styles.buttons}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles[tab.className]} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.products}>
          {currentProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className={styles.footer}>
          <Link href="/catalog" className={styles.seeFullBtn}>Ver Colección Completa</Link>
        </div>
      </div>
    </section>
  );
} 
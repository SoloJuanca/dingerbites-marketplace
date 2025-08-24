'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import styles from './BrowseMenu.module.css';

export default function BrowseMenu() {
  const [activeTab, setActiveTab] = useState('extractor');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define the target categories
  const targetCategories = [
    { id: 'extractor', label: 'Extractor', className: 'burgerBtn' },
    { id: 'lamparas-de-secado', label: 'Lámparas de Secado', className: 'sidesBtn' },
    { id: 'drill', label: 'Drill', className: 'drinksBtn' }
  ];

  // Fetch categories and their products
  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        setLoading(true);
        
        // First, get all categories
        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();
        
        // Filter to only show the target categories that exist and have products
        const availableCategories = [];
        
        for (const targetCategory of targetCategories) {
          // Find if this category exists in the database
          const dbCategory = categoriesData.categories?.find(cat => cat.slug === targetCategory.id);
          
          if (dbCategory) {
            // Check if this category has products
            const productsResponse = await fetch(`/api/products?category=${targetCategory.id}&limit=6`);
            const productsData = await productsResponse.json();
            
            if (productsData.products && productsData.products.length > 0) {
              availableCategories.push({
                ...targetCategory,
                dbCategory,
                products: productsData.products
              });
            }
          }
        }
        
        setCategories(availableCategories);
        
        // Set the first available category as active, or default to first target category
        if (availableCategories.length > 0) {
          const firstCategory = availableCategories[0];
          setActiveTab(firstCategory.id);
          setProducts(firstCategory.products || []);
        } else {
          setActiveTab('');
          setProducts([]);
        }
        
      } catch (error) {
        console.error('Error fetching categories and products:', error);
        setCategories([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesAndProducts();
  }, []);

  // Update products when active tab changes
  useEffect(() => {
    if (activeTab && categories.length > 0) {
      const activeCategory = categories.find(cat => cat.id === activeTab);
      setProducts(activeCategory?.products || []);
    }
  }, [activeTab, categories]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // If loading, show loading state
  if (loading) {
    return (
      <section className={styles.browseMenu}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Explora nuestra colección</h2>
            <p className={styles.subtitle}>Cargando productos...</p>
          </div>
        </div>
      </section>
    );
  }

  // If no categories have products, show only the catalog button
  if (categories.length === 0) {
    return (
      <section className={styles.browseMenu}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Explora nuestra colección</h2>
            <p className={styles.subtitle}>
              Descubre nuestros productos premium y realiza un pedido en línea, o{' '}
              <a href="#phone" className={styles.phoneLink}>visita</a> nuestra tienda para 
              consultas personalizadas. Calidad premium, resultados hermosos.
            </p>
          </div>
          <div className={styles.footer}>
            <Link href="/catalog" className={styles.seeFullBtn}>Ver Catálogo Completo</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.browseMenu}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Explora nuestra colección</h2>
          <p className={styles.subtitle}>
            Descubre nuestros productos premium y realiza un pedido en línea, o{' '}
            <a href="#phone" className={styles.phoneLink}>visita</a> nuestra tienda para 
            consultas personalizadas. Calidad premium, resultados hermosos.
          </p>
          <div className={styles.buttons}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles[category.className]} ${activeTab === category.id ? styles.active : ''}`}
                onClick={() => handleTabChange(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.products}>
          {products.map((product) => (
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
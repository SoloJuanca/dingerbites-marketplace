'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import styles from './BrowseMenu.module.css';

export default function BrowseMenu() {
  const [activeTab, setActiveTab] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories and build highlighted groups with products
  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        setLoading(true);

        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();

        const catalogCategories = Array.isArray(categoriesData.categories) ? categoriesData.categories : [];
        const candidateCategories = catalogCategories.slice(0, 6);
        const availableCategories = [];

        for (const category of candidateCategories) {
          const productsResponse = await fetch(`/api/products?category=${category.slug}&limit=6`);
          const productsData = await productsResponse.json();

          if (productsData.products && productsData.products.length > 0) {
            availableCategories.push({
              id: category.slug,
              label: category.name,
              products: productsData.products
            });
          }

          if (availableCategories.length === 3) {
            break;
          }
        }

        setCategories(availableCategories);

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
            <h2 className={styles.title}>Explora nuestra coleccion</h2>
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
            <h2 className={styles.title}>Explora nuestra coleccion</h2>
            <p className={styles.subtitle}>
              Descubre juegos para todos los gustos: cooperativos, estrategicos, familiares y party games.
              Encuentra el titulo ideal para tu siguiente noche de juego.
            </p>
          </div>
          <div className={styles.footer}>
            <Link href="/catalog" className={styles.seeFullBtn}>Ver catalogo completo</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.browseMenu}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Explora nuestra coleccion</h2>
          <p className={styles.subtitle}>
            Descubre juegos para todos los gustos: cooperativos, estrategicos, familiares y party games.
            Encuentra el titulo ideal para tu siguiente noche de juego.
          </p>
          <div className={styles.buttons}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles.categoryBtn} ${activeTab === category.id ? styles.active : ''}`}
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
          <Link href="/catalog" className={styles.seeFullBtn}>Ver catalogo completo</Link>
        </div>
      </div>
    </section>
  );
} 
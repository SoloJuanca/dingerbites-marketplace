'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Pagination.module.css';

export default function Pagination({ currentPage, totalPages, hasNextPage, hasPrevPage }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updatePage = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/catalog?${params.toString()}`);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  const pageNumbers = generatePageNumbers();

  return (
    <div className={styles.pagination}>
      {/* Botón anterior */}
      <button
        onClick={() => updatePage(currentPage - 1)}
        disabled={!hasPrevPage}
        className={`${styles.pageBtn} ${styles.prevNext} ${!hasPrevPage ? styles.disabled : ''}`}
      >
        ← Anterior
      </button>

      {/* Primera página si no está visible */}
      {pageNumbers[0] > 1 && (
        <>
          <button
            onClick={() => updatePage(1)}
            className={styles.pageBtn}
          >
            1
          </button>
          {pageNumbers[0] > 2 && <span className={styles.ellipsis}>...</span>}
        </>
      )}

      {/* Números de página */}
      {pageNumbers.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => updatePage(pageNum)}
          className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
        >
          {pageNum}
        </button>
      ))}

      {/* Última página si no está visible */}
      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className={styles.ellipsis}>...</span>
          )}
          <button
            onClick={() => updatePage(totalPages)}
            className={styles.pageBtn}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Botón siguiente */}
      <button
        onClick={() => updatePage(currentPage + 1)}
        disabled={!hasNextPage}
        className={`${styles.pageBtn} ${styles.prevNext} ${!hasNextPage ? styles.disabled : ''}`}
      >
        Siguiente →
      </button>
    </div>
  );
} 
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeBannerCarousel.module.css';

const AUTOPLAY_MS = 5000;

function BannerSlide({ banner }) {
  const hasCtaUrl = Boolean(String(banner.cta_url || '').trim());
  const hasOverlayCopy =
    Boolean(String(banner.title || '').trim()) ||
    Boolean(String(banner.subtitle || '').trim()) ||
    (Boolean(String(banner.cta_label || '').trim()) && hasCtaUrl);

  const image = (
    <Image
      src={banner.image_url}
      alt={banner.title || 'Banner principal'}
      width={1200}
      height={420}
      className={styles.image}
      priority
    />
  );

  const overlay = hasOverlayCopy ? (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {banner.title && <h2 className={styles.title}>{banner.title}</h2>}
        {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}
        {banner.cta_label && hasCtaUrl && (
          <span className={styles.ctaButton}>{banner.cta_label}</span>
        )}
      </div>
    </div>
  ) : null;

  if (hasCtaUrl) {
    return (
      <Link href={banner.cta_url} className={styles.imageLink} aria-label={banner.title || 'Ir al banner'}>
        {image}
        {overlay}
      </Link>
    );
  }

  return (
    <>
      {image}
      {overlay}
    </>
  );
}

export default function HomeBannerCarousel({ banners = [] }) {
  const [index, setIndex] = useState(0);

  const safeBanners = useMemo(
    () => (Array.isArray(banners) ? banners : []).filter((banner) => banner?.image_url),
    [banners]
  );

  useEffect(() => {
    if (safeBanners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeBanners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [safeBanners.length]);

  const goToSlide = (nextIndex) => {
    if (safeBanners.length === 0) return;
    const normalized = (nextIndex + safeBanners.length) % safeBanners.length;
    setIndex(normalized);
  };

  if (safeBanners.length === 0) {
    return (
      <section className={styles.section} aria-label="Banners principales">
        <div className="container">
          <div className={styles.stateBox}>Sin banners activos.</div>
        </div>
      </section>
    );
  }

  const current = safeBanners[index];

  return (
    <section className={styles.section} aria-label="Banners principales">
      <div className="container">
        <div className={styles.carousel}>
          <div className={styles.imageWrap}>
            <BannerSlide banner={current} />
          </div>

          {safeBanners.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.navButton} ${styles.prev}`}
                onClick={() => goToSlide(index - 1)}
                aria-label="Banner anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.navButton} ${styles.next}`}
                onClick={() => goToSlide(index + 1)}
                aria-label="Banner siguiente"
              >
                ›
              </button>

              <div className={styles.dots}>
                {safeBanners.map((banner, dotIndex) => (
                  <button
                    key={banner.id || dotIndex}
                    type="button"
                    className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ''}`}
                    onClick={() => goToSlide(dotIndex)}
                    aria-label={`Ir al banner ${dotIndex + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

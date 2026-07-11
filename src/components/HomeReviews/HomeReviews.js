'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './HomeReviews.module.css';

const GRADIENT_VARIANTS = 4;
const AUTO_SCROLL_SPEED = 0.5; // px per frame

function formatReviewDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function ReviewCard({ review, gradientIndex }) {
  const name = review.author_name || review.name || 'Cliente';
  const initial = name.trim().charAt(0).toUpperCase() || 'C';
  const location = review.location || review.author_location || '';
  const date = formatReviewDate(review.created_at);
  const subtitle = [location, date].filter(Boolean).join(' · ');
  const gradientClass = styles[`grad${gradientIndex % GRADIENT_VARIANTS}`];

  return (
    <article className={`${styles.card} ${gradientClass}`}>
      <div className={styles.cardTop}>
        <div className={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={16}
              className={styles.star}
              filled={i < (review.rating || 0)}
            />
          ))}
        </div>
      </div>

      {review.image_url && (
        <div className={styles.imageWrap}>
          <Image
            src={review.image_url}
            alt=""
            width={320}
            height={180}
            className={styles.image}
            draggable={false}
          />
        </div>
      )}

      <p className={styles.text}>{review.comment || ''}</p>

      <div className={styles.author}>
        <span className={styles.avatar}>{initial}</span>
        <div className={styles.authorMeta}>
          <strong className={styles.authorName}>{name}</strong>
          {subtitle && (
            <span className={styles.authorSubtitle}>{subtitle}</span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Group reviews into vertical columns so stacked cards fill the gaps */
function buildColumns(reviews, perColumn) {
  if (perColumn <= 1) {
    return reviews.map((review) => [review]);
  }
  const columns = [];
  for (let i = 0; i < reviews.length; i += perColumn) {
    columns.push(reviews.slice(i, i + perColumn));
  }
  return columns;
}

export default function HomeReviews({ reviews = [] }) {
  const reviewList = Array.isArray(reviews) ? reviews : [];

  const trackRef = useRef(null);
  const offsetRef = useRef(0); // current translateX (positive => moved left)
  const baseWidthRef = useRef(0); // width of one full set of columns
  const pendingRef = useRef(0); // remaining px queued by the arrows
  const hoverRef = useRef(false);
  const draggingRef = useRef(false);
  const dragState = useRef({ startX: 0, startOffset: 0 });

  const [perColumn, setPerColumn] = useState(2);
  const [isDragging, setIsDragging] = useState(false);

  /** One row on mobile, two stacked rows on wider screens */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setPerColumn(mq.matches ? 1 : 2);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /** Measure the width of a single (non-duplicated) set of columns */
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      // Track renders two identical copies, so one set is half the width
      baseWidthRef.current = track.scrollWidth / 2;
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [perColumn, reviewList.length]);

  /** Transform-based marquee: modulo wrapping keeps it infinite both ways */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let rafId;
    const frame = () => {
      const base = baseWidthRef.current;
      if (base > 0) {
        if (pendingRef.current !== 0) {
          // Ease through the distance queued by the arrow buttons
          let stepAmt = pendingRef.current * 0.18;
          if (Math.abs(pendingRef.current) < 1) {
            stepAmt = pendingRef.current;
          }
          offsetRef.current += stepAmt;
          pendingRef.current -= stepAmt;
        } else if (
          !reduceMotion &&
          !hoverRef.current &&
          !draggingRef.current
        ) {
          offsetRef.current += AUTO_SCROLL_SPEED;
        }

        // Wrap into [0, base) so the loop never ends
        offsetRef.current = ((offsetRef.current % base) + base) % base;
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [perColumn, reviewList.length]);

  if (reviewList.length === 0) {
    return null;
  }

  const columns = buildColumns(reviewList, perColumn);
  const loopedColumns = [...columns, ...columns];

  const scrollByCards = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.parentElement.clientWidth * 0.8, 280);
    pendingRef.current += dir * amount;
  };

  const onPointerDown = (e) => {
    draggingRef.current = true;
    setIsDragging(true);
    pendingRef.current = 0;
    dragState.current = { startX: e.clientX, startOffset: offsetRef.current };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - dragState.current.startX;
    offsetRef.current = dragState.current.startOffset - delta;
  };

  const endDrag = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    if (e?.pointerId != null) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
  };

  return (
    <section id="reviews" className={styles.reviews}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Lo que dicen nuestros clientes</h2>
      </div>

      <div className={styles.marquee}>
        <button
          type="button"
          className={`${styles.navButton} ${styles.navPrev}`}
          onClick={() => scrollByCards(-1)}
          aria-label="Ver reseñas anteriores"
        >
          <Icon name="chevron_left" size={24} />
        </button>

        <div
          className={`${styles.viewport} ${isDragging ? styles.dragging : ''}`}
          onMouseEnter={() => {
            hoverRef.current = true;
          }}
          onMouseLeave={() => {
            hoverRef.current = false;
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <div ref={trackRef} className={styles.track}>
            {loopedColumns.map((column, columnIndex) => (
              <div
                key={`col-${columnIndex}`}
                className={styles.column}
                aria-hidden={columnIndex >= columns.length ? 'true' : undefined}
              >
                {column.map((review, cardIndex) => (
                  <ReviewCard
                    key={`${review.id}-${columnIndex}-${cardIndex}`}
                    review={review}
                    gradientIndex={columnIndex + cardIndex}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.navButton} ${styles.navNext}`}
          onClick={() => scrollByCards(1)}
          aria-label="Ver más reseñas"
        >
          <Icon name="chevron_right" size={24} />
        </button>
      </div>
    </section>
  );
}

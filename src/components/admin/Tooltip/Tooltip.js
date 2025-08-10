import { useState } from 'react';
import styles from './Tooltip.module.css';

export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.tooltipContainer}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={styles.trigger}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`${styles.tooltip} ${styles[position]}`}>
          {content}
          <div className={styles.arrow}></div>
        </div>
      )}
    </div>
  );
}

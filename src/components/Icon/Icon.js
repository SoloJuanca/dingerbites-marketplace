import styles from './Icon.module.css';

export default function Icon({ name, size = 24, className = '', filled = false }) {
  return (
    <span 
      className={`material-symbols-outlined ${styles.icon} ${className}`}
      style={{ 
        fontSize: `${size}px`,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0"
      }}
    >
      {name}
    </span>
  );
} 
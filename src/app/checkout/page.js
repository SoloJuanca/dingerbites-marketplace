import SimpleCheckout from '../../components/SimpleCheckout/SimpleCheckout';
import styles from './checkout.module.css';

export default function CheckoutPage() {
  return (
    <div className={styles.checkoutPage}>
      <div className={styles.container}>
        <SimpleCheckout />
      </div>
    </div>
  );
}

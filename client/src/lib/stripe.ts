import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get Stripe public key from environment
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  console.error('VITE_STRIPE_PUBLIC_KEY is not set in environment variables');
}

// Initialize Stripe promise - this will be null if no public key
export const stripePromise: Promise<Stripe | null> = stripePublicKey 
  ? loadStripe(stripePublicKey)
  : Promise.resolve(null);

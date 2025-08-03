// Environment variable validation
export function validateEnvironmentVariables() {
  const requiredEnvVars = {
    // Server-side only (secure)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CSRF_SECRET_KEY: process.env.CSRF_SECRET_KEY,
    
    // Firebase Admin credentials (server-side only)
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    
    // Client-side (public but validated)
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    
    // Stripe Price IDs (public)
    NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate Stripe keys format
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    throw new Error('Invalid STRIPE_SECRET_KEY format');
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_')) {
    throw new Error('Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
    throw new Error('Invalid STRIPE_WEBHOOK_SECRET format');
  }

  console.log('✅ All environment variables validated successfully');
}

// Call validation on module load
if (typeof window === 'undefined') {
  // Only validate on server-side
  try {
    validateEnvironmentVariables();
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    // In production, throw fatal error to prevent app from starting
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`FATAL: Application cannot start due to missing environment variables: ${error}`);
    }
  }
} 
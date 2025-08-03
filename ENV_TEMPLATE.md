# Environment Variables Template

Add these environment variables to your `.env.local` file to fix the Stripe configuration error:

```bash
# Firebase Configuration (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Security Configuration
CSRF_SECRET_KEY=your_csrf_secret_key_here_minimum_32_characters

# Optional: Error Monitoring Services
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_LOGROCKET_APP_ID=your_logrocket_app_id_here
NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT=https://your-error-logging-service.com/api/errors
SECURITY_LOGGING_ENDPOINT=https://your-security-logging-service.com/api/security

# Public Stripe Price IDs (for client-side access)
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID=price_your_starter_monthly_price_id
NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID=price_your_starter_yearly_price_id
NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID=price_your_growth_monthly_price_id
NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PRICE_ID=price_your_growth_yearly_price_id
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_your_pro_monthly_price_id
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_your_pro_yearly_price_id
```

## Important Notes:

1. **Public vs Private Keys**: The `NEXT_PUBLIC_` prefix makes these variables available on the client side
2. **Firebase Admin**: The Firebase Admin credentials are for server-side authentication only and should never be exposed to the client
3. **Price IDs**: These are the same Price IDs you already have in your Stripe setup
4. **Security**: Price IDs are safe to expose on the client side - they're just identifiers
5. **Error Monitoring**: Optional environment variables for production error tracking and monitoring

## How to Get Your Price IDs:

1. Go to your Stripe Dashboard
2. Navigate to Products > [Your Product]
3. Copy the Price ID for each tier and billing cycle
4. Replace the placeholder values above with your actual Price IDs

## Example:
```bash
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID=price_1ABC123DEF456GHI789
NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID=price_1JKL012MNO345PQR678
# ... etc for all tiers
```

After adding these environment variables, restart your development server for the changes to take effect. 
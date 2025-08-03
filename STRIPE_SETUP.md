# Stripe Integration Setup Guide

## Environment Variables Required

Add these environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs for Subscription Tiers
STRIPE_STARTER_MONTHLY_PRICE_ID=price_your_starter_monthly_price_id
STRIPE_STARTER_YEARLY_PRICE_ID=price_your_starter_yearly_price_id
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_your_growth_monthly_price_id
STRIPE_GROWTH_YEARLY_PRICE_ID=price_your_growth_yearly_price_id
STRIPE_PRO_MONTHLY_PRICE_ID=price_your_pro_monthly_price_id
STRIPE_PRO_YEARLY_PRICE_ID=price_your_pro_yearly_price_id
```

## Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to your Stripe Dashboard
2. Navigate to Products > Add Product
3. Create the following products:

#### Starter Plan
- **Product Name**: Starter Plan
- **Price**: $19/month and $190/year
- **Recurring**: Yes
- **Billing period**: Monthly and Yearly

#### Growth Plan  
- **Product Name**: Growth Plan
- **Price**: $49/month and $490/year
- **Recurring**: Yes
- **Billing period**: Monthly and Yearly

#### Pro Plan
- **Product Name**: Pro Plan  
- **Price**: $99/month and $990/year
- **Recurring**: Yes
- **Billing period**: Monthly and Yearly

### 2. Get Price IDs

After creating each product, copy the Price IDs and update your environment variables:

```bash
STRIPE_STARTER_MONTHLY_PRICE_ID=price_1ABC123...
STRIPE_STARTER_YEARLY_PRICE_ID=price_1DEF456...
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_1GHI789...
STRIPE_GROWTH_YEARLY_PRICE_ID=price_1JKL012...
STRIPE_PRO_MONTHLY_PRICE_ID=price_1MNO345...
STRIPE_PRO_YEARLY_PRICE_ID=price_1PQR678...
```

### 3. Set Up Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret and add it to your environment variables

### 4. Test Mode

For development, use Stripe's test mode:
- Use test API keys (start with `sk_test_` and `pk_test_`)
- Use test card numbers: `4242 4242 4242 4242`
- Use any future expiry date and any 3-digit CVC

## Features Implemented

✅ **Subscription Tiers**: Starter, Growth, Pro with different restaurant limits
✅ **Billing Options**: Monthly and yearly billing with discounts
✅ **Stripe Checkout**: Secure payment processing
✅ **Webhook Handling**: Automatic subscription management
✅ **User Role Updates**: Automatic role assignment after payment
✅ **Restaurant Limits**: Enforced based on subscription tier
✅ **Email Verification**: Required before subscription purchase

## Testing the Integration

1. Start your development server
2. Go to `/subscribe` page
3. Select a subscription tier
4. Complete the Stripe checkout with test card
5. Verify the user role is updated to 'owner'
6. Check that restaurant limits are enforced in the dashboard

## Production Deployment

For production:
1. Switch to live Stripe keys
2. Update webhook endpoint URL
3. Test with real payment methods
4. Monitor webhook events in Stripe Dashboard 
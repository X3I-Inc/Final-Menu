# Subscription Management Features

## Overview
The application now includes comprehensive subscription management functionality that allows users to upgrade, downgrade, and cancel their subscriptions directly from the dashboard.

## Features Implemented

### 1. Subscription Management Dashboard
- **Location**: Available in the main dashboard for owners with active subscriptions
- **Access**: Only visible to users with `owner` role and active subscription status
- **Components**: 
  - Current subscription information display
  - Plan change functionality
  - Subscription cancellation

### 2. Upgrade/Downgrade Functionality
- **API Endpoint**: `/api/update-subscription`
- **Features**:
  - Change between Starter, Growth, and Pro plans
  - Switch between monthly and yearly billing cycles
  - Automatic proration for plan changes
  - Real-time price calculation and display

### 3. Cancel Subscription
- **API Endpoint**: `/api/cancel-subscription`
- **Features**:
  - Cancel at period end (no immediate termination)
  - Confirmation dialog with warning
  - Maintains access until current billing period ends

### 4. Enhanced Auth Context
- **New Properties**:
  - `stripeSubscriptionId`: Stores the Stripe subscription ID
  - Enhanced subscription status tracking
  - Real-time subscription data updates

## API Endpoints

### Update Subscription
```typescript
POST /api/update-subscription
{
  subscriptionId: string,
  newTier: 'starter' | 'growth' | 'pro',
  billingInterval: 'monthly' | 'yearly',
  userId: string
}
```

### Cancel Subscription
```typescript
POST /api/cancel-subscription
{
  subscriptionId: string,
  userId: string
}
```

## User Interface

### Subscription Manager Component
- **Current Plan Display**: Shows current tier, price, and restaurant limit
- **Plan Selection**: Dropdown to select new plan and billing cycle
- **Price Preview**: Shows new plan details before confirming
- **Cancel Option**: Destructive action with confirmation dialog

### Dashboard Integration
- **Conditional Display**: Only shows for owners with active subscriptions
- **Automatic Refresh**: Page reloads after subscription changes
- **Toast Notifications**: Success and error feedback

## Subscription Tiers

### Starter Plan
- **Price**: $19/month or $190/year
- **Restaurant Limit**: 1 restaurant
- **Features**: Basic restaurant management

### Growth Plan
- **Price**: $49/month or $490/year
- **Restaurant Limit**: 5 restaurants
- **Features**: Multiple restaurant management

### Pro Plan
- **Price**: $99/month or $990/year
- **Restaurant Limit**: 20 restaurants
- **Features**: Enterprise-level management

## Security Features

### Validation
- Server-side validation of all subscription changes
- Stripe webhook signature verification
- User authentication and authorization checks

### Error Handling
- Comprehensive error handling for all API endpoints
- User-friendly error messages
- Graceful fallbacks for failed operations

## Webhook Integration

### Enhanced Webhook Handler
- **Events Handled**:
  - `checkout.session.completed`: New subscriptions
  - `customer.subscription.updated`: Plan changes
  - `customer.subscription.deleted`: Cancellations

### Firestore Updates
- Automatic user role and subscription data updates
- Real-time subscription status tracking
- Historical subscription change logging

## Usage Instructions

### For Users
1. **Access**: Navigate to the dashboard as an owner with an active subscription
2. **Upgrade/Downgrade**: Select new plan and billing cycle, then click "Update Plan"
3. **Cancel**: Click "Cancel Subscription" and confirm the action
4. **Monitor**: Check subscription status and billing information

### For Developers
1. **Environment Variables**: Ensure all Stripe keys are configured
2. **Webhook Setup**: Configure Stripe webhook endpoint
3. **Testing**: Use Stripe test mode for development
4. **Monitoring**: Check webhook logs for subscription events

## Future Enhancements

### Planned Features
- **Billing History**: View past invoices and payments
- **Usage Analytics**: Track restaurant and feature usage
- **Auto-scaling**: Automatic plan upgrades based on usage
- **Team Management**: Multi-user subscription management

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Analytics**: Detailed usage and billing analytics
- **API Rate Limiting**: Enhanced API security and performance
- **Multi-currency**: Support for different currencies and regions 
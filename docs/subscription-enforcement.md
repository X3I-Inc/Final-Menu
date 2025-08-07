# Subscription Enforcement System

This document explains how the subscription enforcement system works, including the 30-day grace period and automatic data cleanup for expired subscriptions.

## Overview

The subscription enforcement system ensures that users who don't pay their subscription fees have their data automatically cleaned up after a 30-day grace period. This prevents abuse while giving users time to resolve payment issues.

## Key Components

### 1. Grace Period Management

- **Duration**: 30 days from payment failure
- **Status**: Users are marked as `past_due` during grace period
- **Access**: Users can still access their data during grace period
- **Notifications**: Users receive warnings about impending data deletion

### 2. Payment Failure Tracking

When a payment fails, the system:

1. Marks the subscription as `past_due`
2. Sets a `gracePeriodEnd` date (30 days from failure)
3. Records the `paymentFailureDate`
4. Sends notifications to the user

### 3. Data Cleanup Process

After the grace period expires:

1. All restaurants owned by the user are permanently deleted
2. User's subscription is reset to `free` tier
3. Restaurant limits are reset to 1
4. Grace period and payment failure dates are cleared

## Implementation Details

### Webhook Integration

The system integrates with Stripe webhooks to automatically detect:

- **Payment failures** (`past_due`, `unpaid` status)
- **Payment recoveries** (status changes back to `active`)
- **Subscription cancellations**

### Database Schema Updates

The `user_roles` collection now includes additional fields:

```typescript
interface UserRole {
  // ... existing fields ...
  gracePeriodEnd?: string;        // ISO date string
  paymentFailureDate?: string;    // ISO date string
  subscriptionStatus: string;     // 'active' | 'past_due' | 'canceled' | 'free'
}
```

### API Endpoints

#### Cleanup Endpoint
- **URL**: `/api/cleanup-expired-subscriptions`
- **Method**: POST (with auth) or GET (for testing)
- **Purpose**: Clean up all expired subscriptions
- **Authentication**: Requires `CLEANUP_API_TOKEN`

### Components

#### SubscriptionNotification
- Shows warnings for payment issues
- Displays grace period countdown
- Provides action buttons for payment updates
- Appears on dashboard for affected users

## User Experience

### During Grace Period

1. **Dashboard Warning**: Orange banner shows days remaining
2. **Popup Dialog**: Modal appears when accessing dashboard
3. **Action Buttons**: Direct links to payment management
4. **Countdown**: Clear indication of time remaining

### After Grace Period

1. **Data Deletion**: All restaurants and menus are permanently removed
2. **Account Reset**: Subscription reset to free tier
3. **Fresh Start**: User can start new subscription

## Configuration

### Environment Variables

```bash
# Required for cleanup API
CLEANUP_API_TOKEN=your_secure_token_here
```

### Grace Period Settings

```typescript
// In subscription-enforcement.ts
export const DEFAULT_ENFORCEMENT_CONFIG: SubscriptionEnforcementConfig = {
  gracePeriodDays: 30,
  cleanupBatchSize: 50,
};
```

## Scheduled Cleanup

### Setup Options

1. **Cron Job** (Linux/Mac)
2. **GitHub Actions**
3. **Vercel Cron** (if using Vercel)
4. **Cloud Functions** (Firebase/Google Cloud)

### Manual Testing

```bash
# Test cleanup endpoint
curl -X GET https://your-domain.com/api/cleanup-expired-subscriptions

# Test with authentication
curl -X POST https://your-domain.com/api/cleanup-expired-subscriptions \
  -H "Authorization: Bearer YOUR_CLEANUP_API_TOKEN"
```

## Security Considerations

### API Protection

- Cleanup endpoint requires authentication token
- Token should be cryptographically secure
- Rate limiting recommended for production

### Data Safety

- Grace period prevents accidental data loss
- Users receive multiple warnings
- Cleanup is logged for audit purposes
- Manual testing available

## Monitoring

### Logs to Monitor

1. **Payment failures**: Track when users enter grace period
2. **Cleanup operations**: Monitor successful data deletion
3. **User notifications**: Ensure warnings are being shown
4. **Recovery rates**: Track how many users resolve payment issues

### Metrics to Track

- Number of users in grace period
- Cleanup success rate
- Payment recovery rate
- User engagement during grace period

## Troubleshooting

### Common Issues

1. **Cleanup not running**: Check scheduled job configuration
2. **Notifications not showing**: Verify user role and subscription status
3. **Data not deleted**: Check Firestore permissions and batch operations
4. **Webhook failures**: Verify Stripe webhook configuration

### Debug Commands

```bash
# Check subscription status
curl -X GET https://your-domain.com/api/cleanup-expired-subscriptions

# Generate secure token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Best Practices

### For Development

1. Test with shorter grace periods (e.g., 1 day)
2. Use staging environment for testing
3. Monitor logs during testing
4. Verify webhook delivery

### For Production

1. Set appropriate grace period (30 days recommended)
2. Monitor cleanup job execution
3. Set up alerts for failed cleanups
4. Regular testing of cleanup process
5. Backup important data before testing

## Migration Notes

### Existing Users

- Existing active subscriptions are unaffected
- Only new payment failures trigger grace period
- Cancelled subscriptions remain accessible until cleanup

### Data Migration

- No migration required for existing data
- New fields are added automatically
- Existing subscriptions continue to work normally

## Future Enhancements

### Potential Improvements

1. **Flexible grace periods**: Different periods for different tiers
2. **Partial data retention**: Keep some data for longer periods
3. **Recovery options**: Allow data recovery for a fee
4. **Advanced notifications**: Email/SMS reminders
5. **Analytics dashboard**: Track subscription health metrics

### Integration Opportunities

1. **Email marketing**: Automated payment recovery campaigns
2. **Customer support**: Integration with help desk systems
3. **Analytics**: Track subscription lifecycle metrics
4. **A/B testing**: Test different grace period lengths 
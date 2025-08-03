# Firebase Security Rules

## Firestore Security Rules

Create a `firestore.rules` file in your project root:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User roles collection - users can only read/write their own data
    match /user_roles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Restaurants collection - owners can manage their restaurants, superowners can manage all
    match /restaurants/{restaurantId} {
      // Read access for authenticated users
      allow read: if request.auth != null;
      
      // Write access for owners and superowners
      allow write: if request.auth != null && (
        // Superowner can manage all restaurants
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'superowner' ||
        // Owner can manage their assigned restaurants
        (get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'owner' &&
         restaurantId in get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.ownedRestaurantIds)
      );
    }
    
    // Counters collection - only superowners can modify
    match /counters/{counterId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'superowner';
    }
  }
}
```

## Storage Security Rules

Create a `storage.rules` file in your project root:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Menu item images - only restaurant owners can upload/delete
    match /menu_item_images/{restaurantId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role in ['owner', 'superowner'] &&
        (get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'superowner' ||
         restaurantId in get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.ownedRestaurantIds);
    }
    
    // Restaurant logos - only restaurant owners can upload/delete
    match /restaurant_logos/{restaurantId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role in ['owner', 'superowner'] &&
        (get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'superowner' ||
         restaurantId in get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.ownedRestaurantIds);
    }
  }
}
```

## Deployment Commands

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

## Security Best Practices

1. **Always validate data on the server side** - Client-side validation can be bypassed
2. **Use proper authentication** - Ensure users are authenticated before allowing access
3. **Implement role-based access control** - Different user roles have different permissions
4. **Validate file uploads** - Check file types and sizes before allowing uploads
5. **Monitor access patterns** - Set up alerts for suspicious activity
6. **Regular security audits** - Review and update rules periodically
7. **Test rules thoroughly** - Use the Firebase emulator to test security rules
8. **Keep rules simple** - Complex rules are harder to debug and maintain

## Testing Security Rules

```bash
# Start Firebase emulator
firebase emulators:start

# Test rules with custom data
firebase emulators:exec --only firestore "npm test"
```

## Monitoring and Logging

Enable Firebase Security Rules monitoring in the Firebase Console:

1. Go to Firestore > Rules
2. Click on "Monitoring" tab
3. Enable "Security Rules monitoring"
4. Set up alerts for rule violations

This will help you identify potential security issues and unauthorized access attempts. 
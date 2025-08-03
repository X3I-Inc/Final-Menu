# Enhanced Sign-Up Functionality

## Overview
The sign-up form has been enhanced to collect additional user information and provide better validation.

## New Fields Added

### 1. First Name
- **Field**: `firstName`
- **Validation**: Minimum 2 characters
- **Required**: Yes
- **Placeholder**: "John"

### 2. Last Name
- **Field**: `lastName`
- **Validation**: Minimum 2 characters
- **Required**: Yes
- **Placeholder**: "Doe"

### 3. Date of Birth
- **Field**: `dateOfBirth`
- **Validation**: Must be at least 13 years old
- **Required**: Yes
- **Type**: Date input with max date set to today

### 4. Confirm Password
- **Field**: `confirmPassword`
- **Validation**: Must match the password field
- **Required**: Yes (only for sign-up)
- **Features**: Show/hide password toggle

## Enhanced Password Requirements
- **Minimum length**: 8 characters (increased from 6)
- **Must contain**: At least one uppercase letter, one lowercase letter, and one number
- **Pattern**: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`

## Data Storage
User profile information is stored in Firestore in the `user_roles` collection with the following additional fields:
- `firstName`: User's first name
- `lastName`: User's last name
- `dateOfBirth`: User's date of birth
- `createdAt`: Timestamp when the account was created

## Form Behavior
- **Sign In**: Shows only email and password fields
- **Sign Up**: Shows all fields (first name, last name, date of birth, email, password, confirm password)
- **Validation**: Real-time validation with helpful error messages
- **Password Visibility**: Toggle buttons for both password and confirm password fields

## Age Verification
The system enforces a minimum age of 13 years old for registration, calculated based on the provided date of birth.

## Error Handling
- Form validation errors are displayed inline
- Firebase authentication errors are shown as toast notifications
- Password mismatch errors are clearly indicated

## Security Features
- Email verification is still required after sign-up
- Passwords are validated for strength
- All user data is stored securely in Firestore 
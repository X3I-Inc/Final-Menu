import { z } from 'zod';

// Password strength validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// User input validation schemas
export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export const subscriptionRequestSchema = z.object({
  tier: z.enum(['starter', 'growth', 'pro'], {
    errorMap: () => ({ message: 'Invalid subscription tier' })
  }),
  billingInterval: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid billing interval' })
  }),
  userId: z.string().min(1, 'User ID is required'),
  userEmail: z.string().email('Invalid email address'),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long'),
  price: z.number().positive('Price must be positive').max(999.99, 'Price too high'),
  imageUrl: z.string().url('Invalid URL').optional(),
  isAvailable: z.boolean(),
  dataAiHint: z.string().max(100, 'AI hint too long').optional(),
});

export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long'),
  contactPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number'),
  contactAddress: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  contactWebsite: z.string().url('Invalid website URL').optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  logoAiHint: z.string().max(100, 'Logo AI hint too long').optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
});

// File upload validation
export interface FileValidationConfig {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  maxFileNameLength: number;
}

export const DEFAULT_IMAGE_VALIDATION: FileValidationConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  maxFileNameLength: 100,
};

export function validateFileUpload(
  file: File, 
  config: FileValidationConfig = DEFAULT_IMAGE_VALIDATION
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file size
  if (file.size > config.maxSize) {
    errors.push(`File size must be less than ${Math.round(config.maxSize / (1024 * 1024))}MB`);
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
  }

  // Check file extension
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!config.allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`);
  }

  // Check file name length
  if (file.name.length > config.maxFileNameLength) {
    errors.push(`File name must be less than ${config.maxFileNameLength} characters`);
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names on Windows
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains invalid characters or patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validation functions
export function validateUserProfile(data: unknown) {
  return userProfileSchema.safeParse(data);
}

export function validateSubscriptionRequest(data: unknown) {
  return subscriptionRequestSchema.safeParse(data);
}

export function validateMenuItem(data: unknown) {
  return menuItemSchema.safeParse(data);
}

export function validateRestaurant(data: unknown) {
  return restaurantSchema.safeParse(data);
}

export function validateCategory(data: unknown) {
  return categorySchema.safeParse(data);
}

// Sanitization functions
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d\s\-\(\)\+]/g, '');
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }

    const requests = this.requests.get(identifier)!;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
} 
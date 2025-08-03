// Security monitoring utility
export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity' | 'webhook_failure' | 'api_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events

  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(securityEvent);

    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔒 Security Event:', securityEvent);
    }

    // In production, you would send this to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(securityEvent);
    }
  }

  private async sendToMonitoringService(event: SecurityEvent) {
    // Production-grade logging service integration
    try {
      // Option 1: Sentry integration
      if (process.env.SENTRY_DSN) {
        // This would require @sentry/nextjs package
        // Sentry.captureException(new Error(event.message), {
        //   tags: { type: event.type, severity: event.severity },
        //   extra: { ...event }
        // });
      }
      
      // Option 2: AWS CloudWatch integration
      if (process.env.AWS_CLOUDWATCH_ENDPOINT) {
        // This would require AWS SDK
        // const cloudwatch = new AWS.CloudWatch();
        // await cloudwatch.putMetricData({
        //   Namespace: 'FinalMenu/Security',
        //   MetricData: [{
        //     MetricName: event.type,
        //     Value: 1,
        //     Unit: 'Count',
        //     Timestamp: new Date(event.timestamp)
        //   }]
        // }).promise();
      }
      
      // Option 3: Custom logging endpoint
      if (process.env.SECURITY_LOGGING_ENDPOINT) {
        await fetch(process.env.SECURITY_LOGGING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      }
      
      // Fallback: Enhanced console logging for production
      console.error('🚨 Security Alert:', {
        type: event.type,
        severity: event.severity,
        message: event.message,
        userId: event.userId,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp,
        details: event.details,
      });
      
    } catch (error) {
      // If all logging methods fail, at least log to console
      console.error('🚨 Security Alert (fallback):', {
        type: event.type,
        severity: event.severity,
        message: event.message,
        userId: event.userId,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp,
        loggingError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  // Rate limiting helper
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  isRateLimited(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (record.count >= maxRequests) {
      this.logEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        message: `Rate limit exceeded for ${identifier}`,
        ipAddress: identifier,
      });
      return true;
    }

    record.count++;
    return false;
  }

  // Input validation helper
  validateInput<T>(input: T, schema: { parse: (data: T) => unknown }, context: string): { isValid: boolean; errors?: string[] } {
    try {
      schema.parse(input);
      return { isValid: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid input';
      const errors = [errorMessage];
      
      this.logEvent({
        type: 'invalid_input',
        severity: 'low',
        message: `Invalid input in ${context}`,
        details: { input, errors },
      });

      return { isValid: false, errors };
    }
  }

  // Authentication failure tracking
  logAuthFailure(userId: string, reason: string, ipAddress?: string) {
    this.logEvent({
      type: 'auth_failure',
      severity: 'high',
      message: `Authentication failure for user ${userId}: ${reason}`,
      userId,
      ipAddress,
    });
  }

  // Suspicious activity detection
  logSuspiciousActivity(activity: string, userId?: string, ipAddress?: string) {
    this.logEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      message: `Suspicious activity detected: ${activity}`,
      userId,
      ipAddress,
    });
  }

  // Webhook security monitoring
  logWebhookFailure(reason: string, ipAddress?: string) {
    this.logEvent({
      type: 'webhook_failure',
      severity: 'high',
      message: `Webhook failure: ${reason}`,
      ipAddress,
    });
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper functions for common security checks
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
}

export function isSuspiciousActivity(userAgent: string, ipAddress: string): boolean {
  // Check for common bot patterns
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python',
    'headless', 'phantom', 'selenium', 'puppeteer'
  ];

  const userAgentLower = userAgent.toLowerCase();
  const isBot = botPatterns.some(pattern => userAgentLower.includes(pattern));

  // Check for suspicious IP patterns (basic)
  const isLocalhost = ipAddress === '127.0.0.1' || ipAddress === '::1';
  const isPrivateIP = ipAddress.startsWith('192.168.') || 
                     ipAddress.startsWith('10.') || 
                     ipAddress.startsWith('172.');

  return isBot || isLocalhost || isPrivateIP;
} 
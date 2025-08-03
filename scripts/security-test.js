#!/usr/bin/env node

/**
 * Security Testing Script for Final-Menu Application
 * 
 * This script performs basic security tests to validate:
 * - CSRF protection
 * - Input validation
 * - Security headers
 * - Rate limiting
 * - Authentication
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:9002';
const TEST_EMAIL = 'security-test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`PASSED: ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`FAILED: ${name}`, 'error');
    if (details) {
      log(`  Details: ${details}`, 'error');
    }
  }
  testResults.details.push({ name, passed, details });
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test 1: Security Headers
async function testSecurityHeaders() {
  log('Testing security headers...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/`);
    
    const requiredHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-Download-Options': 'noopen',
      'X-DNS-Prefetch-Control': 'off'
    };

    let allHeadersPresent = true;
    let missingHeaders = [];

    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const actualValue = response.headers[header.toLowerCase()];
      if (!actualValue) {
        allHeadersPresent = false;
        missingHeaders.push(header);
      } else if (actualValue !== expectedValue) {
        allHeadersPresent = false;
        missingHeaders.push(`${header} (expected: ${expectedValue}, got: ${actualValue})`);
      }
    }

    recordTest('Security Headers', allHeadersPresent, 
      allHeadersPresent ? '' : `Missing or incorrect headers: ${missingHeaders.join(', ')}`);
  } catch (error) {
    recordTest('Security Headers', false, `Request failed: ${error.message}`);
  }
}

// Test 2: CSRF Protection
async function testCSRFProtection() {
  log('Testing CSRF protection...');
  
  try {
    // Test without CSRF token (should fail)
    const responseWithoutToken = await makeRequest(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tier: 'starter',
        billingInterval: 'monthly',
        userId: 'test-user',
        userEmail: TEST_EMAIL
      })
    });

    const csrfProtected = responseWithoutToken.statusCode === 403;
    recordTest('CSRF Protection', csrfProtected, 
      csrfProtected ? '' : `Expected 403, got ${responseWithoutToken.statusCode}`);
  } catch (error) {
    recordTest('CSRF Protection', false, `Request failed: ${error.message}`);
  }
}

// Test 3: Input Validation
async function testInputValidation() {
  log('Testing input validation...');
  
  try {
    // Test with invalid data
    const response = await makeRequest(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'invalid-token'
      },
      body: JSON.stringify({
        tier: 'invalid-tier',
        billingInterval: 'invalid-interval',
        userId: '',
        userEmail: 'invalid-email'
      })
    });

    const validationWorking = response.statusCode === 400;
    recordTest('Input Validation', validationWorking, 
      validationWorking ? '' : `Expected 400, got ${response.statusCode}`);
  } catch (error) {
    recordTest('Input Validation', false, `Request failed: ${error.message}`);
  }
}

// Test 4: Rate Limiting
async function testRateLimiting() {
  log('Testing rate limiting...');
  
  try {
    const requests = [];
    const maxRequests = 15; // Should trigger rate limiting
    
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        makeRequest(`${BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-token'
          },
          body: JSON.stringify({
            tier: 'starter',
            billingInterval: 'monthly',
            userId: 'test-user',
            userEmail: TEST_EMAIL
          })
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(res => res.statusCode === 429);
    
    recordTest('Rate Limiting', rateLimited, 
      rateLimited ? '' : 'No rate limiting detected');
  } catch (error) {
    recordTest('Rate Limiting', false, `Request failed: ${error.message}`);
  }
}

// Test 5: Authentication Protection
async function testAuthenticationProtection() {
  log('Testing authentication protection...');
  
  try {
    // Test accessing protected route without authentication
    const response = await makeRequest(`${BASE_URL}/dashboard`);
    
    // Should redirect to login or return 401/403
    const protected = response.statusCode === 401 || 
                     response.statusCode === 403 || 
                     response.statusCode === 302 ||
                     response.data.includes('login');
    
    recordTest('Authentication Protection', protected, 
      protected ? '' : `Expected auth redirect, got ${response.statusCode}`);
  } catch (error) {
    recordTest('Authentication Protection', false, `Request failed: ${error.message}`);
  }
}

// Test 6: Content Security Policy
async function testContentSecurityPolicy() {
  log('Testing Content Security Policy...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/`);
    const cspHeader = response.headers['content-security-policy'];
    
    const cspPresent = cspHeader && cspHeader.length > 0;
    const cspStrong = cspHeader && 
                     cspHeader.includes("default-src 'self'") &&
                     cspHeader.includes("script-src 'self'") &&
                     cspHeader.includes("object-src 'none'");
    
    recordTest('Content Security Policy', cspPresent && cspStrong, 
      cspPresent ? '' : 'CSP header not found');
  } catch (error) {
    recordTest('Content Security Policy', false, `Request failed: ${error.message}`);
  }
}

// Test 7: HTTPS Redirect (if applicable)
async function testHTTPSRedirect() {
  log('Testing HTTPS redirect...');
  
  if (BASE_URL.startsWith('https://')) {
    log('Skipping HTTPS test - already using HTTPS', 'info');
    recordTest('HTTPS Redirect', true, 'Already using HTTPS');
    return;
  }
  
  try {
    const httpsUrl = BASE_URL.replace('http://', 'https://');
    const response = await makeRequest(httpsUrl);
    
    const httpsWorking = response.statusCode === 200 || response.statusCode === 301 || response.statusCode === 302;
    recordTest('HTTPS Redirect', httpsWorking, 
      httpsWorking ? '' : `HTTPS not working, got ${response.statusCode}`);
  } catch (error) {
    recordTest('HTTPS Redirect', false, `HTTPS request failed: ${error.message}`);
  }
}

// Main test runner
async function runSecurityTests() {
  log('🚀 Starting Security Tests for Final-Menu Application', 'info');
  log(`Testing against: ${BASE_URL}`, 'info');
  log('', 'info');

  const tests = [
    testSecurityHeaders,
    testCSRFProtection,
    testInputValidation,
    testRateLimiting,
    testAuthenticationProtection,
    testContentSecurityPolicy,
    testHTTPSRedirect
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      log(`Test failed with error: ${error.message}`, 'error');
    }
    log('', 'info');
  }

  // Print summary
  log('📊 Security Test Summary', 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, testResults.passed === testResults.total ? 'success' : 'info');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log('', 'info');

  if (testResults.failed > 0) {
    log('❌ Failed Tests:', 'error');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`  - ${test.name}: ${test.details}`, 'error');
      });
  }

  if (testResults.passed === testResults.total) {
    log('🎉 All security tests passed!', 'success');
    process.exit(0);
  } else {
    log('⚠️  Some security tests failed. Please review and fix the issues.', 'error');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests,
  testResults
}; 
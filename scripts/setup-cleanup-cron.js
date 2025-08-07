#!/usr/bin/env node

/**
 * Setup script for subscription cleanup cron job
 * This script provides instructions and examples for setting up automated cleanup
 * of expired subscriptions.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Subscription Cleanup Setup');
console.log('=============================\n');

console.log('This script helps you set up automated cleanup of expired subscriptions.');
console.log('You have several options for scheduling the cleanup job:\n');

// Option 1: Cron job (Linux/Mac)
console.log('1. CRON JOB (Linux/Mac)');
console.log('-----------------------');
console.log('Add this to your crontab (crontab -e):');
console.log('');
console.log('   # Run cleanup every day at 2 AM');
console.log('   0 2 * * * curl -X POST https://your-domain.com/api/cleanup-expired-subscriptions \\');
console.log('     -H "Authorization: Bearer YOUR_CLEANUP_API_TOKEN" \\');
console.log('     -H "Content-Type: application/json"');
console.log('');

// Option 2: GitHub Actions
console.log('2. GITHUB ACTIONS');
console.log('-----------------');
console.log('Create .github/workflows/cleanup.yml:');
console.log('');

const githubActionsYaml = `name: Cleanup Expired Subscriptions

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup expired subscriptions
        run: |
          curl -X POST https://your-domain.com/api/cleanup-expired-subscriptions \\
            -H "Authorization: Bearer \${{ secrets.CLEANUP_API_TOKEN }}" \\
            -H "Content-Type: application/json"
`;

console.log(githubActionsYaml);
console.log('');

// Option 3: Vercel Cron
console.log('3. VERCEL CRON (if using Vercel)');
console.log('--------------------------------');
console.log('Add this to your vercel.json:');
console.log('');

const vercelConfig = `{
  "crons": [
    {
      "path": "/api/cleanup-expired-subscriptions",
      "schedule": "0 2 * * *"
    }
  ]
}`;

console.log(vercelConfig);
console.log('');

// Option 4: Cloud Functions
console.log('4. CLOUD FUNCTIONS (Firebase/Google Cloud)');
console.log('-------------------------------------------');
console.log('Create a Cloud Function that calls your API endpoint:');
console.log('');

const cloudFunctionCode = `const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.cleanupExpiredSubscriptions = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const response = await fetch('https://your-domain.com/api/cleanup-expired-subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.CLEANUP_API_TOKEN}\`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      console.log('Cleanup completed:', result);
      return null;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  });`;

console.log(cloudFunctionCode);
console.log('');

// Environment setup
console.log('5. ENVIRONMENT SETUP');
console.log('-------------------');
console.log('Make sure to set the CLEANUP_API_TOKEN environment variable:');
console.log('');
console.log('   # In your .env.local file:');
console.log('   CLEANUP_API_TOKEN=your_secure_token_here');
console.log('');
console.log('   # Generate a secure token:');
console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
console.log('');

// Testing
console.log('6. TESTING');
console.log('----------');
console.log('Test the cleanup endpoint manually:');
console.log('');
console.log('   curl -X GET https://your-domain.com/api/cleanup-expired-subscriptions');
console.log('');
console.log('Or test with authorization:');
console.log('');
console.log('   curl -X POST https://your-domain.com/api/cleanup-expired-subscriptions \\');
console.log('     -H "Authorization: Bearer YOUR_CLEANUP_API_TOKEN"');
console.log('');

// Security notes
console.log('7. SECURITY NOTES');
console.log('----------------');
console.log('• Keep your CLEANUP_API_TOKEN secure and random');
console.log('• Only allow the cleanup endpoint to be called from trusted sources');
console.log('• Monitor the cleanup logs to ensure it\'s working correctly');
console.log('• Consider adding rate limiting to the cleanup endpoint');
console.log('• Test the cleanup process in a staging environment first');
console.log('');

console.log('✅ Setup complete! Choose the scheduling method that works best for your deployment.');
console.log('');
console.log('For more information, see the documentation in the /docs folder.'); 
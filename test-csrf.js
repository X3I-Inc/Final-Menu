const fetch = require('node-fetch');

async function testCSRFToken() {
  try {
    console.log('Testing CSRF token endpoint...');
    
    const response = await fetch('http://localhost:3000/api/csrf-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    // Check if the token is present in the response
    if (data.token) {
      console.log('✅ CSRF token received successfully');
      console.log('Token length:', data.token.length);
    } else {
      console.log('❌ No CSRF token in response');
    }
    
    // Check if the cookie is set
    const cookies = response.headers.get('set-cookie');
    if (cookies && cookies.includes('csrf_token')) {
      console.log('✅ CSRF cookie set successfully');
      console.log('Cookie:', cookies);
    } else {
      console.log('❌ CSRF cookie not set');
    }
    
  } catch (error) {
    console.error('Error testing CSRF token:', error);
  }
}

testCSRFToken(); 
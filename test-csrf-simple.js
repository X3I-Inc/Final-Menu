const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
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
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
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

async function testCSRFToken() {
  try {
    console.log('🧪 Testing CSRF token endpoint...');
    
    const response = await makeRequest('http://localhost:9002/api/csrf-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', response.status);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ CSRF token received successfully');
      console.log('📝 Token length:', data.token?.length || 0);
      console.log('⏰ Expires at:', new Date(data.expiresAt).toISOString());
      
      // Check if the cookie is set
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.some(cookie => cookie.includes('csrf_token'))) {
        console.log('🍪 CSRF cookie set successfully');
        console.log('🔒 Cookie attributes:', cookies);
      } else {
        console.log('❌ CSRF cookie not set');
      }
    } else {
      console.log('❌ Failed to get CSRF token');
      console.log('Status:', response.status);
      console.log('Error:', response.data);
    }
    
  } catch (error) {
    console.error('💥 Error testing CSRF token:', error.message);
  }
}

testCSRFToken(); 
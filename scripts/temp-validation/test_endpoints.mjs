#!/usr/bin/env node
// test_endpoints moved here
console.log('test_endpoints moved to temp-validation')
import http from 'http';

async function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve({ status: res.statusCode, body: j });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

async function run() {
  try {
    console.log('Testing /api/qa-data...');
    const a = await fetchUrl('/api/qa-data');
    console.log('Status:', a.status);
    console.log('Body preview:', typeof a.body === 'object' ? Object.keys(a.body).slice(0,10) : String(a.body).slice(0,200));

    console.log('\nTesting /api/debug-qa...');
    const b = await fetchUrl('/api/debug-qa');
    console.log('Status:', b.status);
    console.log('Body preview:', typeof b.body === 'object' ? Object.keys(b.body).slice(0,10) : String(b.body).slice(0,200));

    process.exit(0);
  } catch (e) {
    console.error('Request error:', e.message);
    process.exit(2);
  }
}

run();

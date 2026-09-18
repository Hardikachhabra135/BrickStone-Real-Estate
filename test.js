const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/interns',
  method: 'GET',
  headers: {
    // we don't have token, but let's see if it returns 401
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});
req.on('error', e => console.error(e));
req.end();

const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, 'supersecret123', { expiresIn: '1h' });
console.log(token);

window.ENV = {
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : window.location.hostname.startsWith('192.168.') 
      ? `http://${window.location.hostname}:5000/api`
      : 'https://brickstone-real-estate-m8w1.onrender.com/api',
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.hostname.startsWith('192.168.') 
      ? `http://${window.location.hostname}:5000`
      : 'https://brickstone-real-estate-m8w1.onrender.com'
};

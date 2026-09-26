window.ENV = {
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : 'https://brickstone-real-estate-m8w1.onrender.com/api'
};

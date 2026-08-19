const axios = require('axios');
axios.defaults.headers.common['Authorization'] = 'Bearer token123';
const config = { headers: { 'X-Store-Id': '1' } };
const merged = axios.defaults.headers;
console.log(merged);

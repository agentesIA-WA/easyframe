import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Configura o token JWT no header de autorização ao inicializar
const storedToken = localStorage.getItem('token');
if (storedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

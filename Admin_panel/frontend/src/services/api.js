import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust if backend runs on different port
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized globally (e.g., redirect to login)
        if (error.response && error.response.status === 401) {
            // Optional: Clear token and redirect
            // localStorage.removeItem('token');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

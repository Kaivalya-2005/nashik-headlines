import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Avoid infinite redirect if already on login page
            const isLoginPage = window.location.pathname.startsWith('/admin/login') || window.location.pathname.startsWith('/login');
            if (!isLoginPage) {
                window.location.replace('/admin/login');
            }
        }
        return Promise.reject(error);
    }
);

export default api;

import api from './api';

const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    return user || response.data;
};

const register = async (email, password, name, role = 'EDITOR') => {
    const response = await api.post('/auth/register', { email, password, name, role });
    const { token, user } = response.data;
    
    if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    return user || response.data;
};

const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch {
        console.log('Logout error (expected if no endpoint exists)');
    } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }
};

const getCurrentUser = async () => {
    const stored = localStorage.getItem('user');
    if (stored) {
        return JSON.parse(stored);
    }
    return null;
};

const authService = { login, register, logout, getCurrentUser };
export default authService;

import api from './api';

const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
        await api.post('/auth/logout');
    } catch (err) {
        // ignore logout error
    }
};

const getCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;
    } catch (err) {
        throw err;
    }
};

const authService = { login, logout, getCurrentUser };
export default authService;

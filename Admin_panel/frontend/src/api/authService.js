import api from './api';

const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
};

const logout = async () => {
    await api.post('/auth/logout');
};

const getCurrentUser = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

const authService = { login, logout, getCurrentUser };
export default authService;

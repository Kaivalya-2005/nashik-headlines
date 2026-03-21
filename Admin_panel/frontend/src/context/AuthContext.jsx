/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import authService from '../api/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeUser = async () => {
            try {
                // Check localStorage first
                const storedToken = localStorage.getItem('authToken');
                const storedUser = localStorage.getItem('user');
                
                if (storedToken && storedUser) {
                    setUser(JSON.parse(storedUser));
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Failed to initialize user:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeUser();
    }, []);

    const login = async (email, password) => {
        const result = await authService.login(email, password);
        setUser(result);
        return result;
    };

    const register = async (email, password, name, role = 'EDITOR') => {
        const result = await authService.register(email, password, name, role);
        setUser(result);
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};


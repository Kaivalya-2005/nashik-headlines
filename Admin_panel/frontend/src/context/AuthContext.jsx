import React, { createContext, useState, useEffect } from 'react';
import authService from '../api/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch {
                    localStorage.removeItem('user');
                }
            }

            try {
                const current = await authService.getCurrentUser();
                if (current) {
                    setUser(current);
                    localStorage.setItem('user', JSON.stringify(current));
                }
            } catch (error) {
                setUser(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        const loggedInUser = data?.user || null;

        if (loggedInUser) {
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
        }

        try {
            const current = await authService.getCurrentUser();
            if (current) {
                setUser(current);
                localStorage.setItem('user', JSON.stringify(current));
                return current;
            }
        } catch {
        }

        return loggedInUser;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

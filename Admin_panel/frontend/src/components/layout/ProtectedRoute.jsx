import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = null }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user?.role)) {
            return <Navigate to="/" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;

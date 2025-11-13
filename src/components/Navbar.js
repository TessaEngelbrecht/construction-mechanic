import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const getDashboardLink = () => {
        if (user.role === 'admin' || user.is_admin) return '/admin';
        if (user.role === 'clerk') return '/clerk';
        return '/mechanic';
    };

    const getRoleDisplay = () => {
        if (user.role === 'admin' || user.is_admin) return 'Admin';
        if (user.role === 'clerk') return 'Clerk';
        return 'Mechanic';
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand" onClick={() => navigate(getDashboardLink())}>
                🏗️ JODAN Construction
            </div>
            <div className="navbar-user">
                <span className="user-name">{user.name}</span>
                <span className="user-role">({getRoleDisplay()})</span>
                <button onClick={handleLogout} className="btn-logout">
                    Logout
                </button>
            </div>
        </nav>
    );
}

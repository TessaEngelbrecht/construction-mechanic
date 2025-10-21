import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <h3>🏗️ Construction Manager</h3>
                </div>
                <div className="navbar-user">
                    <span className="user-name">{user?.name}</span>
                    {user?.is_admin && <span className="admin-badge">Admin</span>}
                    <button onClick={handleLogout} className="btn-logout">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

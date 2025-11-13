import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { query } from '../utils/neonClient';
import bcrypt from 'bcryptjs';

export default function Login() {
    const [formData, setFormData] = useState({
        phone: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const formatPhoneNumber = (phone) => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '27' + cleaned.slice(1);
        } else if (!cleaned.startsWith('27')) {
            cleaned = '27' + cleaned;
        }
        return '+' + cleaned;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formattedPhone = formatPhoneNumber(formData.phone);

            const { data: users } = await query`
        SELECT * FROM users WHERE phone = ${formattedPhone}
      `;

            if (!users || users.length === 0) {
                setError('User not found. Please sign up first.');
                setLoading(false);
                return;
            }

            const user = users[0];

            // Check password
            if (!user.password_hash) {
                setError('Please contact admin to set up your password.');
                setLoading(false);
                return;
            }

            // For now, simple comparison (in production, use bcrypt.compare)
            // const passwordMatch = await bcrypt.compare(formData.password, user.password_hash);
            const passwordMatch = formData.password === user.password_hash; // Temporary simple check

            if (!passwordMatch) {
                setError('Incorrect password. Please try again.');
                setLoading(false);
                return;
            }

            localStorage.setItem('currentUser', JSON.stringify(user));

            // Route based on role
            if (user.role === 'admin' || user.is_admin) {
                navigate('/admin');
            } else if (user.role === 'clerk') {
                navigate('/clerk');
            } else {
                navigate('/mechanic');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred. Please try again.');
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>🏗️ JODAN Construction</h1>
                    <h2>Login</h2>
                    <p>Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="0821234567"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>

                    <p className="auth-switch">
                        Don't have an account? <a href="/signup">Sign Up</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

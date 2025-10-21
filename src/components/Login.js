import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function Login() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handlePhoneChange = (e) => {
        setPhone(e.target.value);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Auto-format phone number
            const formattedPhone = formatPhoneNumber(phone);

            // Check if user exists
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('phone', formattedPhone)
                .maybeSingle();

            if (userError) {
                setError('Error connecting to database. Please try again.');
                setLoading(false);
                return;
            }

            if (!userData) {
                setError('User not found. Please check your phone number or sign up first.');
                setLoading(false);
                return;
            }

            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // Navigate based on user type
            if (userData.is_admin) {
                navigate('/admin');
            } else {
                navigate('/mechanic');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            console.error('Login error:', err);
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🏗️</div>
                    <h2>Welcome Back</h2>
                    <p className="auth-subtitle">Login to your account</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            placeholder="0844062222"
                            value={phone}
                            onChange={handlePhoneChange}
                            required
                        />
                        <small>Enter your 10-digit phone number (starting with 0)</small>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="test-accounts">
                    <p><strong>Test Accounts:</strong></p>
                    <ul>
                        <li>Admin: <code>0844062222</code> (Tessa)</li>
                        <li>Mechanic: <code>0821234567</code> (John)</li>
                        <li>Mechanic: <code>0829876543</code> (Sarah)</li>
                    </ul>
                </div>

                <p className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign up here</Link>
                </p>
            </div>
        </div>
    );
}

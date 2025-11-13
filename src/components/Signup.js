import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { query } from '../utils/neonClient';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function Signup() {
    const [formData, setFormData] = useState({
        phone: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Auto-format phone number
            const formattedPhone = formatPhoneNumber(formData.phone);

            // Check if user exists - TAGGED TEMPLATE
            const { data: existingUser } = await query`
      SELECT * FROM users WHERE phone = ${formattedPhone} LIMIT 1
    `;

            if (existingUser && existingUser.length > 0) {
                setError('User with this phone number already exists.');
                setLoading(false);
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters');
                setLoading(false);
                return;
            }

            // Check if admin
            const isAdmin = formattedPhone === '+27844062222';

            // Insert new user - TAGGED TEMPLATE
            const { error: insertError } = await query`
  INSERT INTO users (phone, name, email, is_admin, role, password_hash) VALUES (${formattedPhone}, ${formData.name}, ${formData.email}, ${isAdmin}, ${isAdmin ? 'admin' : 'mechanic'}, ${formData.password}) RETURNING *
`;

            if (insertError) {
                setError('Signup failed. Please try again.');
                setLoading(false);
                return;
            }

            setSuccess('Account created successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError('Signup failed. Please try again.');
        }

        setLoading(false);
    };


    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🏗️</div>
                    <h2>Create Account</h2>
                    <p className="auth-subtitle">Join our construction team</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSignup}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                        <small>Enter your 10-digit phone number (starting with 0)</small>
                    </div>

                    <div className="form-group">
                        <label>Email (Optional)</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength="6"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>


                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

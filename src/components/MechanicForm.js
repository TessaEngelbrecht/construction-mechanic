import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Navbar from './Navbar';
import Select from 'react-select';

export default function MechanicForm() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 10),
        hours_worked: '',
        work_done: '',
        equipment_used: []
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [recentLogs, setRecentLogs] = useState([]);
    const [equipmentOptions, setEquipmentOptions] = useState([]);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        setUser(userData);
        if (userData) {
            fetchRecentLogs(userData.id);
            fetchEquipment();
        }
    }, []);

    // Helper function to safely parse equipment
    const parseEquipment = (equipmentData) => {
        try {
            // If it's already an array, return it
            if (Array.isArray(equipmentData)) {
                return equipmentData;
            }

            // If it's a string, try to parse it as JSON
            if (typeof equipmentData === 'string') {
                // Try JSON parse first
                try {
                    const parsed = JSON.parse(equipmentData);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch {
                    // If JSON parse fails, it might be a comma-separated string
                    // Split by comma and clean up
                    return equipmentData.split(',').map(item => item.trim()).filter(item => item);
                }
            }

            // Default fallback
            return [];
        } catch {
            return [];
        }
    };

    const fetchEquipment = async () => {
        const { data } = await supabase
            .from('equipment')
            .select('*')
            .order('category', { ascending: true });

        if (data) {
            // Group by category
            const grouped = data.reduce((acc, item) => {
                if (!acc[item.category]) {
                    acc[item.category] = [];
                }
                acc[item.category].push({
                    value: item.name,
                    label: item.name
                });
                return acc;
            }, {});

            // Convert to react-select format
            const options = Object.keys(grouped).map(category => ({
                label: category,
                options: grouped[category]
            }));

            setEquipmentOptions(options);
        }
    };

    const fetchRecentLogs = async (userId) => {
        const { data } = await supabase
            .from('work_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(5);

        setRecentLogs(data || []);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEquipmentChange = (selectedOptions) => {
        const equipment = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
        setFormData({ ...formData, equipment_used: equipment });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.from('work_logs').insert([
                {
                    user_id: user.id,
                    date: formData.date,
                    hours_worked: parseFloat(formData.hours_worked),
                    work_done: formData.work_done,
                    equipment_used: JSON.stringify(formData.equipment_used)
                }
            ]);

            if (error) {
                setMessage('❌ Error submitting work log. Please try again.');
                console.error('Submit error:', error);
            } else {
                setMessage('✅ Work log submitted successfully!');
                setFormData({
                    date: new Date().toISOString().slice(0, 10),
                    hours_worked: '',
                    work_done: '',
                    equipment_used: []
                });
                fetchRecentLogs(user.id);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ An error occurred. Please try again.');
            console.error('Submit error:', err);
        }

        setLoading(false);
    };

    if (!user) return <div className="loading">Loading...</div>;

    return (
        <div>
            <Navbar user={user} />
            <div className="page-container">
                <div className="mechanic-dashboard">
                    <div className="welcome-section">
                        <h2>Welcome back, {user.name}! 👋</h2>
                        <p>Fill in your daily work log below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="work-form">
                        <h3>Daily Work Log</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Hours Worked</label>
                                <input
                                    type="number"
                                    name="hours_worked"
                                    placeholder="8"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={formData.hours_worked}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Work Done</label>
                            <textarea
                                name="work_done"
                                placeholder="Describe the work you completed today..."
                                rows="4"
                                value={formData.work_done}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Equipment Used</label>
                            <Select
                                isMulti
                                options={equipmentOptions}
                                value={equipmentOptions.flatMap(g => g.options).filter(opt =>
                                    formData.equipment_used.includes(opt.value)
                                )}
                                onChange={handleEquipmentChange}
                                placeholder="Select equipment..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                            <small>Select all equipment you used today</small>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Submitting...' : 'Submit Work Log'}
                        </button>

                        {message && (
                            <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
                                {message}
                            </div>
                        )}
                    </form>

                    <div className="recent-logs">
                        <h3>Your Recent Logs</h3>
                        {recentLogs.length === 0 ? (
                            <p className="no-logs">No logs yet. Submit your first work log above!</p>
                        ) : (
                            <div className="logs-grid">
                                {recentLogs.map((log) => {
                                    const equipment = parseEquipment(log.equipment_used);
                                    return (
                                        <div key={log.id} className="log-card">
                                            <div className="log-header">
                                                <span className="log-date">📅 {log.date}</span>
                                                <span className="log-hours">⏰ {log.hours_worked}h</span>
                                            </div>
                                            <p className="log-work"><strong>Work:</strong> {log.work_done}</p>
                                            <div className="log-equipment">
                                                <strong>Equipment:</strong>
                                                {equipment.length > 0 ? (
                                                    <div className="equipment-badges">
                                                        {equipment.map((item, idx) => (
                                                            <span key={idx} className="equipment-badge">{item}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted"> None specified</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

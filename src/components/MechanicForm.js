import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Navbar from './Navbar';

export default function MechanicForm() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 10),
        plant_number: '',
        smr: '',
        job_type: '',
        description: '',
        work_done: '',
        work_to_plan: '',
        time_started: '',
        time_ended: '',
        delay_reason: '',
        plant_stop_datetime: '',
        plant_start_datetime: '',
        fluids_used: []
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [recentLogs, setRecentLogs] = useState([]);
    const [equipmentList, setEquipmentList] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState(null);

    // Fluid/Oil options
    const fluidOptions = [
        { value: 'Engine Oil 15W40', label: 'Engine Oil 15W40', category: 'Engine' },
        { value: 'Hydraulic Oil 46', label: 'Hydraulic Oil 46', category: 'Hydraulic' },
        { value: 'Transmission Oil 50', label: 'Transmission Oil 50', category: 'Transmission' },
        { value: 'Gear Oil 80W90', label: 'Gear Oil 80W90', category: 'Gears' },
        { value: 'Brake Fluid', label: 'Brake Fluid', category: 'Brakes' },
        { value: 'Grease No.2', label: 'Grease No.2', category: 'Lubricants' }
    ];

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        setUser(userData);
        if (userData) {
            fetchRecentLogs(userData.id);
            fetchEquipment();
        }
    }, []);

    const fetchEquipment = async () => {
        const { data } = await supabase
            .from('equipment')
            .select('*')
            .order('plant_number', { ascending: true });

        if (data) {
            setEquipmentList(data);
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
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Auto-fill SMR when plant is selected
        if (name === 'plant_number') {
            const equipment = equipmentList.find(eq => eq.plant_number === value);
            if (equipment) {
                setSelectedEquipment(equipment);
                setFormData(prev => ({ ...prev, smr: equipment.current_smr }));
            }
        }
    };

    const handleFluidChange = (index, field, value) => {
        const updatedFluids = [...formData.fluids_used];
        updatedFluids[index] = { ...updatedFluids[index], [field]: value };
        setFormData({ ...formData, fluids_used: updatedFluids });
    };

    const addFluidRow = () => {
        setFormData({
            ...formData,
            fluids_used: [...formData.fluids_used, { type: '', quantity: '', unit: 'litres' }]
        });
    };

    const removeFluidRow = (index) => {
        const updatedFluids = formData.fluids_used.filter((_, i) => i !== index);
        setFormData({ ...formData, fluids_used: updatedFluids });
    };

    const calculateDuration = () => {
        if (formData.time_started && formData.time_ended) {
            const start = new Date(`1970-01-01T${formData.time_started}`);
            const end = new Date(`1970-01-01T${formData.time_ended}`);
            const diff = (end - start) / (1000 * 60 * 60); // hours
            return diff > 0 ? diff.toFixed(1) : 0;
        }
        return 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const duration = calculateDuration();
            const jobcardNumber = `JC-${Date.now().toString().slice(-8)}`;

            const { error } = await supabase.from('work_logs').insert([
                {
                    jobcard_number: jobcardNumber,
                    user_id: user.id,
                    date: formData.date,
                    plant_number: formData.plant_number,
                    smr: parseInt(formData.smr),
                    job_type: formData.job_type,
                    description: formData.description,
                    work_done: formData.work_done,
                    work_to_plan: formData.work_to_plan || null,
                    time_started: formData.time_started || null,
                    time_ended: formData.time_ended || null,
                    duration: duration,
                    delay_reason: formData.delay_reason || null,
                    plant_stop_datetime: formData.plant_stop_datetime || null,
                    plant_start_datetime: formData.plant_start_datetime || null,
                    fluids_used: JSON.stringify(formData.fluids_used),
                    status: 'completed',
                    manager_approved: false
                }
            ]);

            if (error) {
                setMessage('❌ Error submitting job card. Please try again.');
                console.error('Submit error:', error);
            } else {
                setMessage(`✅ Job Card ${jobcardNumber} submitted successfully!`);

                // Reset form
                setFormData({
                    date: new Date().toISOString().slice(0, 10),
                    plant_number: '',
                    smr: '',
                    job_type: '',
                    description: '',
                    work_done: '',
                    work_to_plan: '',
                    time_started: '',
                    time_ended: '',
                    delay_reason: '',
                    plant_stop_datetime: '',
                    plant_start_datetime: '',
                    fluids_used: []
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
                        <p>Fill in your job card below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="work-form">
                        <h3>🔧 Job Card</h3>

                        {/* Basic Info Row */}
                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Plant Number *</label>
                                <select
                                    name="plant_number"
                                    value={formData.plant_number}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Plant</option>
                                    {equipmentList.map((eq) => (
                                        <option key={eq.id} value={eq.plant_number}>
                                            {eq.plant_number} - {eq.equipment_type} ({eq.make_model})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>SMR (Service Meter Reading) *</label>
                                <input
                                    type="number"
                                    name="smr"
                                    placeholder="Hours"
                                    value={formData.smr}
                                    onChange={handleChange}
                                    required
                                />
                                {selectedEquipment && (
                                    <small>Current: {selectedEquipment.current_smr}h</small>
                                )}
                            </div>
                        </div>

                        {/* Job Type */}
                        <div className="form-group">
                            <label>B/D or Maintenance (Job Type) *</label>
                            <select
                                name="job_type"
                                value={formData.job_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="Breakdown">Breakdown (B/D)</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Service">Service</option>
                                <option value="Repair">Repair</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                name="description"
                                placeholder="Describe the issue or work required..."
                                rows="3"
                                value={formData.description}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Work Done */}
                        <div className="form-group">
                            <label>Work Done *</label>
                            <textarea
                                name="work_done"
                                placeholder="Describe what work was completed..."
                                rows="4"
                                value={formData.work_done}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Work to Plan */}
                        <div className="form-group">
                            <label>Work to Plan & Parts Required</label>
                            <textarea
                                name="work_to_plan"
                                placeholder="Future work needed, parts to order..."
                                rows="2"
                                value={formData.work_to_plan}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Time Tracking */}
                        <div className="form-section-title">⏱️ Time Tracking</div>
                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label>Time Started</label>
                                <input
                                    type="time"
                                    name="time_started"
                                    value={formData.time_started}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Time Ended</label>
                                <input
                                    type="time"
                                    name="time_ended"
                                    value={formData.time_ended}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Duration (Hours)</label>
                                <input
                                    type="text"
                                    value={calculateDuration()}
                                    disabled
                                    className="calculated-field"
                                />
                            </div>
                        </div>

                        {/* Delay Reason */}
                        <div className="form-group">
                            <label>Delay Reason (if any)</label>
                            <input
                                type="text"
                                name="delay_reason"
                                placeholder="e.g., Waiting for parts, weather delay..."
                                value={formData.delay_reason}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Plant Stop/Start */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Plant Stop Date/Time</label>
                                <input
                                    type="datetime-local"
                                    name="plant_stop_datetime"
                                    value={formData.plant_stop_datetime}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Plant Start Date/Time</label>
                                <input
                                    type="datetime-local"
                                    name="plant_start_datetime"
                                    value={formData.plant_start_datetime}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Fluids/Oils Used */}
                        <div className="form-section-title">🛢️ Fluids & Oils Used</div>
                        {formData.fluids_used.map((fluid, index) => (
                            <div key={index} className="fluid-row">
                                <div className="form-row form-row-fluid">
                                    <div className="form-group">
                                        <label>Oil/Fluid Type</label>
                                        <select
                                            value={fluid.type}
                                            onChange={(e) => handleFluidChange(index, 'type', e.target.value)}
                                        >
                                            <option value="">Select Type</option>
                                            {fluidOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Quantity</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0"
                                            value={fluid.quantity}
                                            onChange={(e) => handleFluidChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Unit</label>
                                        <select
                                            value={fluid.unit}
                                            onChange={(e) => handleFluidChange(index, 'unit', e.target.value)}
                                        >
                                            <option value="litres">Litres</option>
                                            <option value="kg">Kg</option>
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-remove"
                                        onClick={() => removeFluidRow(index)}
                                    >
                                        ❌
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="btn-add-fluid"
                            onClick={addFluidRow}
                        >
                            + Add Fluid/Oil
                        </button>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Submitting Job Card...' : 'Submit Job Card'}
                        </button>

                        {message && (
                            <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
                                {message}
                            </div>
                        )}
                    </form>

                    {/* Recent Job Cards */}
                    <div className="recent-logs">
                        <h3>Your Recent Job Cards</h3>
                        {recentLogs.length === 0 ? (
                            <p className="no-logs">No job cards yet. Submit your first one above!</p>
                        ) : (
                            <div className="logs-grid">
                                {recentLogs.map((log) => (
                                    <div key={log.id} className="log-card">
                                        <div className="log-header">
                                            <span className="jobcard-number">#{log.jobcard_number}</span>
                                            <span className="log-date">📅 {log.date}</span>
                                        </div>
                                        <div className="log-plant-info">
                                            <strong>{log.plant_number}</strong> | SMR: {log.smr}h | {log.job_type}
                                        </div>
                                        <p className="log-description">
                                            <strong>Issue:</strong> {log.description}
                                        </p>
                                        <p className="log-work">
                                            <strong>Work Done:</strong> {log.work_done}
                                        </p>
                                        {log.duration && (
                                            <p className="log-duration">⏱️ Duration: {log.duration}h</p>
                                        )}
                                        <div className="log-status">
                                            <span className={`status-badge ${log.manager_approved ? 'approved' : 'pending'}`}>
                                                {log.manager_approved ? '✓ Approved' : '⏳ Pending Approval'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

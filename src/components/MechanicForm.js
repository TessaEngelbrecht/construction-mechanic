import React, { useState, useEffect } from 'react';
import { query } from '../utils/neonClient';
import Navbar from './Navbar';

export default function MechanicForm() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 10),
        site_name: '',
        plant_number: '',
        kilos_hours: '',
        job_type: '',

        // Arrays for multiple issues
        breakdownIssues: [],
        maintenanceIssues: [],
        tyres: [],

        service_interval: '',
        other_description: '',

        work_to_plan: '',
        time_started: '',
        time_ended: '',
        delay_reason: '',
        fluids_used: []
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [recentLogs, setRecentLogs] = useState([]);

    // Dropdown options from database
    const [equipmentList, setEquipmentList] = useState([]);
    const [sites, setSites] = useState([]);
    const [breakdownIssuesList, setBreakdownIssuesList] = useState([]);
    const [maintenanceIssuesList, setMaintenanceIssuesList] = useState([]);
    const [serviceIntervals, setServiceIntervals] = useState([]);
    const [brakeDetails, setBrakeDetails] = useState([]);
    const [batteryPositions, setBatteryPositions] = useState([]);
    const [tyreActions, setTyreActions] = useState([]);
    const [fluidTypes, setFluidTypes] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState(null);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        setUser(userData);
        if (userData) {
            fetchRecentLogs(userData.id);
            fetchDropdownData();
        }
    }, []);

    const fetchDropdownData = async () => {
        const { data: equipmentData } = await query`SELECT * FROM equipment ORDER BY plant_number ASC`;
        setEquipmentList(equipmentData || []);

        const { data: sitesData } = await query`SELECT * FROM sites WHERE active = true ORDER BY site_name ASC`;
        setSites(sitesData || []);

        const { data: breakdownData } = await query`SELECT * FROM breakdown_issues WHERE active = true ORDER BY issue_name ASC`;
        setBreakdownIssuesList(breakdownData || []);

        const { data: maintenanceData } = await query`SELECT * FROM maintenance_issues WHERE active = true ORDER BY issue_name ASC`;
        setMaintenanceIssuesList(maintenanceData || []);

        const { data: serviceData } = await query`SELECT * FROM service_intervals WHERE active = true ORDER BY interval_name ASC`;
        setServiceIntervals(serviceData || []);

        const { data: brakeData } = await query`SELECT * FROM brake_details WHERE active = true ORDER BY display_order ASC`;
        setBrakeDetails(brakeData || []);

        const { data: batteryData } = await query`SELECT * FROM battery_positions WHERE active = true ORDER BY position_name ASC`;
        setBatteryPositions(batteryData || []);

        const { data: tyreData } = await query`SELECT * FROM tyre_actions WHERE active = true ORDER BY action_name ASC`;
        setTyreActions(tyreData || []);

        const { data: fluidData } = await query`SELECT * FROM fluid_types WHERE active = true ORDER BY fluid_name ASC`;
        setFluidTypes(fluidData || []);
    };

    const fetchRecentLogs = async (userId) => {
        const { data } = await query`
      SELECT * FROM work_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 5
    `;
        setRecentLogs(data || []);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'plant_number') {
            const equipment = equipmentList.find(eq => eq.plant_number === value);
            if (equipment) {
                setSelectedEquipment(equipment);
                setFormData(prev => ({ ...prev, kilos_hours: equipment.current_kilos_hours }));
            }
        }

        if (name === 'job_type') {
            setFormData(prev => ({
                ...prev,
                breakdownIssues: [],
                maintenanceIssues: [],
                tyres: [],
                service_interval: '',
                other_description: '',
                fluids_used: []
            }));
        }
    };

    // Breakdown Issues
    const addBreakdownIssue = () => {
        setFormData(prev => ({
            ...prev,
            breakdownIssues: [...prev.breakdownIssues, { issue: '', detail: '' }]
        }));
    };

    const updateBreakdownIssue = (index, field, value) => {
        const updated = [...formData.breakdownIssues];
        updated[index][field] = value;
        if (field === 'issue' && value !== 'Brakes') {
            updated[index].detail = '';
        }
        setFormData({ ...formData, breakdownIssues: updated });
    };

    const removeBreakdownIssue = (index) => {
        setFormData(prev => ({
            ...prev,
            breakdownIssues: prev.breakdownIssues.filter((_, i) => i !== index)
        }));
    };

    // Maintenance Issues
    const addMaintenanceIssue = () => {
        setFormData(prev => ({
            ...prev,
            maintenanceIssues: [...prev.maintenanceIssues, { issue: '', detail: '', battery_position: '' }]
        }));
    };

    const updateMaintenanceIssue = (index, field, value) => {
        const updated = [...formData.maintenanceIssues];
        updated[index][field] = value;
        if (field === 'issue') {
            if (value !== 'Brakes') updated[index].detail = '';
            if (value !== 'Battery') updated[index].battery_position = '';
        }
        setFormData({ ...formData, maintenanceIssues: updated });
    };

    const removeMaintenanceIssue = (index) => {
        setFormData(prev => ({
            ...prev,
            maintenanceIssues: prev.maintenanceIssues.filter((_, i) => i !== index)
        }));
    };

    // Tyres
    const addTyre = () => {
        setFormData(prev => ({
            ...prev,
            tyres: [...prev.tyres, { tyre_number: '', action: '', serial_number: '', swap_from: '' }]
        }));
    };

    const updateTyre = (index, field, value) => {
        const updated = [...formData.tyres];
        updated[index][field] = value;
        if (field === 'action') {
            if (value !== 'New' && value !== 'Swap') {
                updated[index].serial_number = '';
                updated[index].swap_from = '';
            }
            if (value !== 'Swap') {
                updated[index].swap_from = '';
            }
        }
        setFormData({ ...formData, tyres: updated });
    };

    const removeTyre = (index) => {
        setFormData(prev => ({
            ...prev,
            tyres: prev.tyres.filter((_, i) => i !== index)
        }));
    };

    const handleFluidChange = (index, field, value) => {
        const updatedFluids = [...formData.fluids_used];
        updatedFluids[index] = { ...updatedFluids[index], [field]: value };
        setFormData({ ...formData, fluids_used: updatedFluids });
    };

    const addFluidRow = () => {
        setFormData({
            ...formData,
            fluids_used: [...formData.fluids_used, { type: '', quantity: '' }]
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
            const diff = (end - start) / (1000 * 60 * 60);
            return diff > 0 ? diff.toFixed(1) : 0;
        }
        return 0;
    };

    const isFluidsRequired = () => {
        const hasHydraulicBreakdown = formData.breakdownIssues.some(b =>
            ['Hydraulic Pipe', 'Brakes', 'Clutch'].includes(b.issue)
        );
        const hasFluidMaintenance = formData.maintenanceIssues.some(m =>
            ['Brakes', 'Clutch', 'Turbo'].includes(m.issue)
        );
        return hasHydraulicBreakdown || hasFluidMaintenance;
    };

    const validateForm = () => {
        if (!formData.site_name) return 'Site name is required';
        if (!formData.plant_number) return 'Plant number is required';
        if (!formData.kilos_hours) return 'Kilos/Hours is required';
        if (!formData.job_type) return 'Job type is required';
        if (!formData.time_started) return 'Time started is required';
        if (!formData.time_ended) return 'Time ended is required';

        if (formData.job_type === 'Breakdown') {
            if (formData.breakdownIssues.length === 0) return 'Please add at least one breakdown issue';
            for (let issue of formData.breakdownIssues) {
                if (!issue.issue) return 'Please select all breakdown issues';
                if (issue.issue === 'Brakes' && !issue.detail) return 'Please select brake detail';
            }
        }

        if (formData.job_type === 'Maintenance') {
            if (formData.maintenanceIssues.length === 0) return 'Please add at least one maintenance issue';
            for (let issue of formData.maintenanceIssues) {
                if (!issue.issue) return 'Please select all maintenance issues';
                if (issue.issue === 'Brakes' && !issue.detail) return 'Please select brake detail';
                if (issue.issue === 'Battery' && !issue.battery_position) return 'Please select battery position';
            }
        }

        if (formData.job_type === 'Service' && !formData.service_interval) {
            return 'Please select service interval';
        }

        if (formData.job_type === 'Tyres') {
            if (formData.tyres.length === 0) return 'Please add at least one tyre';
            for (let tyre of formData.tyres) {
                if (!tyre.tyre_number) return 'Please enter tyre number';
                if (!tyre.action) return 'Please select tyre action';
                if (tyre.action === 'New' && !tyre.serial_number) return 'Serial number required for new tyres';
                if (tyre.action === 'Swap' && (!tyre.serial_number || !tyre.swap_from)) {
                    return 'Serial number and swap location required';
                }
            }
        }

        if (formData.job_type === 'Other' && !formData.other_description) {
            return 'Description is required for Other job type';
        }

        if (isFluidsRequired() && formData.fluids_used.length === 0) {
            return 'Fluids used is required for this job type';
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const validationError = validateForm();
        if (validationError) {
            setMessage(`❌ ${validationError}`);
            setLoading(false);
            return;
        }

        try {
            const duration = calculateDuration();
            const jobcardNumber = `JC-${Date.now().toString().slice(-8)}`;

            const { error } = await query`
        INSERT INTO work_logs (
          jobcard_number, user_id, date, site_name, plant_number, kilos_hours,
          job_type, breakdown_issues_array, maintenance_issues_array, tyres_array,
          service_interval, other_description, work_to_plan, time_started, time_ended,
          duration, delay_reason, fluids_used, status, manager_approved
        ) VALUES (
          ${jobcardNumber},
          ${user.id},
          ${formData.date},
          ${formData.site_name},
          ${formData.plant_number},
          ${parseInt(formData.kilos_hours)},
          ${formData.job_type},
          ${JSON.stringify(formData.breakdownIssues)},
          ${JSON.stringify(formData.maintenanceIssues)},
          ${JSON.stringify(formData.tyres)},
          ${formData.service_interval || null},
          ${formData.other_description || null},
          ${formData.work_to_plan || null},
          ${formData.time_started},
          ${formData.time_ended},
          ${duration},
          ${formData.delay_reason || null},
          ${JSON.stringify(formData.fluids_used)},
          ${'completed'},
          ${false}
        )
      `;

            if (error) {
                setMessage('❌ Error submitting job card. Please try again.');
                console.error('Submit error:', error);
            } else {
                setMessage(`✅ Job Card ${jobcardNumber} submitted successfully!`);

                setFormData({
                    date: new Date().toISOString().slice(0, 10),
                    site_name: '',
                    plant_number: '',
                    kilos_hours: '',
                    job_type: '',
                    breakdownIssues: [],
                    maintenanceIssues: [],
                    tyres: [],
                    service_interval: '',
                    other_description: '',
                    work_to_plan: '',
                    time_started: '',
                    time_ended: '',
                    delay_reason: '',
                    fluids_used: []
                });

                setSelectedEquipment(null);
                fetchRecentLogs(user.id);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ An error occurred. Please try again.');
            console.error('Submit error:', err);
        }

        setLoading(false);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
        }
        return String(dateValue);
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

                        {/* Basic Info */}
                        <div className="form-row form-row-3">
                            <div className="form-group">
                                <label>Date *</label>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Site *</label>
                                <select name="site_name" value={formData.site_name} onChange={handleChange} required>
                                    <option value="">Select Site</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.site_name}>{site.site_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Plant Number *</label>
                                <select name="plant_number" value={formData.plant_number} onChange={handleChange} required>
                                    <option value="">Select Plant</option>
                                    {equipmentList.map((eq) => (
                                        <option key={eq.id} value={eq.plant_number}>
                                            {eq.plant_number} - {eq.equipment_type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Kilos/Hours *</label>
                            <input
                                type="number"
                                name="kilos_hours"
                                placeholder="Hours"
                                value={formData.kilos_hours}
                                onChange={handleChange}
                                min={selectedEquipment ? selectedEquipment.current_kilos_hours : 0}
                                required
                            />
                            {selectedEquipment && (
                                <small>Current: {selectedEquipment.current_kilos_hours}h (minimum value)</small>
                            )}
                        </div>

                        {/* Job Type */}
                        <div className="form-group">
                            <label>Job Type *</label>
                            <select name="job_type" value={formData.job_type} onChange={handleChange} required>
                                <option value="">Select Type</option>
                                <option value="Breakdown">Breakdown</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Service">Service</option>
                                <option value="Tyres">Tyres</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* BREAKDOWN - Multiple Issues */}
                        {formData.job_type === 'Breakdown' && (
                            <div className="issues-section">
                                <div className="section-header">
                                    <h4>Breakdown Issues</h4>
                                    <button type="button" onClick={addBreakdownIssue} className="btn-add-issue">
                                        + Add Breakdown Issue
                                    </button>
                                </div>

                                {formData.breakdownIssues.map((issue, index) => (
                                    <div key={index} className="issue-card">
                                        <div className="issue-header">
                                            <span className="issue-number">Issue #{index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeBreakdownIssue(index)}
                                                className="btn-remove-issue"
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>

                                        <div className="form-group">
                                            <label>Breakdown Issue *</label>
                                            <select
                                                value={issue.issue}
                                                onChange={(e) => updateBreakdownIssue(index, 'issue', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Issue</option>
                                                {breakdownIssuesList.map((b) => (
                                                    <option key={b.id} value={b.issue_name}>{b.issue_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {issue.issue === 'Brakes' && (
                                            <div className="form-group">
                                                <label>Brake Detail *</label>
                                                <select
                                                    value={issue.detail}
                                                    onChange={(e) => updateBreakdownIssue(index, 'detail', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Detail</option>
                                                    {brakeDetails.map((detail) => (
                                                        <option key={detail.id} value={detail.position_name}>
                                                            {detail.position_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {formData.breakdownIssues.length === 0 && (
                                    <div className="empty-state">
                                        <p>No breakdown issues added yet. Click "+ Add Breakdown Issue" above.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MAINTENANCE - Multiple Issues */}
                        {formData.job_type === 'Maintenance' && (
                            <div className="issues-section">
                                <div className="section-header">
                                    <h4>Maintenance Issues</h4>
                                    <button type="button" onClick={addMaintenanceIssue} className="btn-add-issue">
                                        + Add Maintenance Issue
                                    </button>
                                </div>

                                {formData.maintenanceIssues.map((issue, index) => (
                                    <div key={index} className="issue-card">
                                        <div className="issue-header">
                                            <span className="issue-number">Issue #{index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeMaintenanceIssue(index)}
                                                className="btn-remove-issue"
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>

                                        <div className="form-group">
                                            <label>Maintenance Issue *</label>
                                            <select
                                                value={issue.issue}
                                                onChange={(e) => updateMaintenanceIssue(index, 'issue', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Issue</option>
                                                {maintenanceIssuesList.map((m) => (
                                                    <option key={m.id} value={m.issue_name}>{m.issue_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {issue.issue === 'Brakes' && (
                                            <div className="form-group">
                                                <label>Brake Detail *</label>
                                                <select
                                                    value={issue.detail}
                                                    onChange={(e) => updateMaintenanceIssue(index, 'detail', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Detail</option>
                                                    {brakeDetails.map((detail) => (
                                                        <option key={detail.id} value={detail.position_name}>
                                                            {detail.position_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {issue.issue === 'Battery' && (
                                            <div className="form-group">
                                                <label>Battery Position *</label>
                                                <select
                                                    value={issue.battery_position}
                                                    onChange={(e) => updateMaintenanceIssue(index, 'battery_position', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Position</option>
                                                    {batteryPositions.map((pos) => (
                                                        <option key={pos.id} value={pos.position_name}>
                                                            {pos.position_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {formData.maintenanceIssues.length === 0 && (
                                    <div className="empty-state">
                                        <p>No maintenance issues added yet. Click "+ Add Maintenance Issue" above.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SERVICE */}
                        {formData.job_type === 'Service' && (
                            <div className="form-group">
                                <label>Service Interval *</label>
                                <select name="service_interval" value={formData.service_interval} onChange={handleChange} required>
                                    <option value="">Select Interval</option>
                                    {serviceIntervals.map((interval) => (
                                        <option key={interval.id} value={interval.interval_name}>
                                            {interval.interval_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* TYRES - Multiple */}
                        {formData.job_type === 'Tyres' && (
                            <div className="issues-section">
                                <div className="section-header">
                                    <h4>Tyres</h4>
                                    <button type="button" onClick={addTyre} className="btn-add-issue">
                                        + Add Tyre
                                    </button>
                                </div>

                                {formData.tyres.map((tyre, index) => (
                                    <div key={index} className="issue-card">
                                        <div className="issue-header">
                                            <span className="issue-number">Tyre #{index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeTyre(index)}
                                                className="btn-remove-issue"
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Tyre Number (1-18) *</label>
                                                <select
                                                    value={tyre.tyre_number}
                                                    onChange={(e) => updateTyre(index, 'tyre_number', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Number</option>
                                                    {[...Array(18)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label>Tyre Action *</label>
                                                <select
                                                    value={tyre.action}
                                                    onChange={(e) => updateTyre(index, 'action', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Action</option>
                                                    {tyreActions.map((action) => (
                                                        <option key={action.id} value={action.action_name}>
                                                            {action.action_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {(tyre.action === 'New' || tyre.action === 'Swap') && (
                                            <div className="form-group">
                                                <label>Serial Number *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., SN-2025-TYR-00123"
                                                    value={tyre.serial_number}
                                                    onChange={(e) => updateTyre(index, 'serial_number', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}

                                        {tyre.action === 'Swap' && (
                                            <div className="form-group">
                                                <label>From Where *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., P003 - Position 4"
                                                    value={tyre.swap_from}
                                                    onChange={(e) => updateTyre(index, 'swap_from', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {formData.tyres.length === 0 && (
                                    <div className="empty-state">
                                        <p>No tyres added yet. Click "+ Add Tyre" above.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OTHER */}
                        {formData.job_type === 'Other' && (
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="other_description"
                                    placeholder="Describe the work performed..."
                                    rows="4"
                                    value={formData.other_description}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        {/* Work to Plan */}
                        <div className="form-group">
                            <label>Work to Plan & Parts Required (Optional)</label>
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
                                <label>Time Started *</label>
                                <input type="time" name="time_started" value={formData.time_started} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Time Ended *</label>
                                <input type="time" name="time_ended" value={formData.time_ended} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Duration (Hours)</label>
                                <input type="text" value={calculateDuration()} disabled className="calculated-field" />
                            </div>
                        </div>

                        {/* Delay Reason */}
                        <div className="form-group">
                            <label>Delay Reason (Optional)</label>
                            <input
                                type="text"
                                name="delay_reason"
                                placeholder="e.g., Waiting for parts, weather delay..."
                                value={formData.delay_reason}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Fluids/Oils */}
                        <div className="form-section-title">
                            🛢️ Fluids & Oils Used {isFluidsRequired() && <span className="required-badge">Required</span>}
                        </div>
                        {formData.fluids_used.map((fluid, index) => (
                            <div key={index} className="fluid-row">
                                <div className="form-row form-row-fluid">
                                    <div className="form-group">
                                        <label>Oil/Fluid Type</label>
                                        <select
                                            value={fluid.type}
                                            onChange={(e) => handleFluidChange(index, 'type', e.target.value)}
                                            required={isFluidsRequired()}
                                        >
                                            <option value="">Select Type</option>
                                            {fluidTypes.map((type) => (
                                                <option key={type.id} value={type.fluid_name}>{type.fluid_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Quantity (Litres)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0"
                                            value={fluid.quantity}
                                            onChange={(e) => handleFluidChange(index, 'quantity', e.target.value)}
                                            required={isFluidsRequired()}
                                        />
                                    </div>
                                    <button type="button" className="btn-remove" onClick={() => removeFluidRow(index)}>❌</button>
                                </div>
                            </div>
                        ))}

                        <button type="button" className="btn-add-fluid" onClick={addFluidRow}>
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
                                            <span className="log-date">📅 {formatDate(log.date)}</span>
                                        </div>
                                        <div className="log-plant-info">
                                            <strong>{log.plant_number}</strong> | {log.site_name} | {log.kilos_hours}h | {log.job_type}
                                        </div>
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

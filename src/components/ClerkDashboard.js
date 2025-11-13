import React, { useEffect, useState } from 'react';
import { query } from '../utils/neonClient';
import Navbar from './Navbar';
import './ClerkDashboard.css';

export default function ClerkDashboard() {
    const [user, setUser] = useState(null);
    const [serviceJobs, setServiceJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [completedFilter, setCompletedFilter] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        if (!userData || userData.role !== 'clerk') {
            window.location.href = '/login';
            return;
        }
        setUser(userData);
        fetchServiceJobs();
    }, []);

    const fetchServiceJobs = async () => {
        setLoading(true);
        try {
            const { data: jobs } = await query`
        SELECT 
          wl.*, 
          wc.id as wearcheck_id,
          wc.date_received,
          wc.date_submitted,
          wc.date_reported,
          wc.status as wearcheck_status,
          wc.completed as wearcheck_completed,
          wc.notes,
          u.name as mechanic_name
        FROM work_logs wl
        LEFT JOIN wearcheck wc ON wl.id = wc.work_log_id
        LEFT JOIN users u ON wl.user_id = u.id
        WHERE wl.job_type = 'Service'
        ORDER BY wl.date DESC
      `;
            setServiceJobs(Array.isArray(jobs) ? jobs : []);
        } catch (error) {
            console.error('Error fetching service jobs:', error);
            setServiceJobs([]);
        }
        setLoading(false);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '';
        try {
            const date = new Date(dateValue);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    const startEdit = (job) => {
        setEditingId(job.id);
        setEditData({
            date_received: formatDate(job.date_received),
            date_submitted: formatDate(job.date_submitted),
            date_reported: formatDate(job.date_reported),
            wearcheck_status: job.wearcheck_status || '',
            completed: job.wearcheck_completed || false,
            notes: job.notes || ''
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveWearcheck = async (jobId, wearcheckId) => {
        setLoading(true);
        try {
            if (wearcheckId) {
                // Update existing
                await query`
          UPDATE wearcheck 
          SET 
            date_received = ${editData.date_received || null},
            date_submitted = ${editData.date_submitted || null},
            date_reported = ${editData.date_reported || null},
            status = ${editData.wearcheck_status || null},
            completed = ${editData.completed},
            notes = ${editData.notes || null},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${wearcheckId}
        `;
            } else {
                // Create new wearcheck entry
                const job = serviceJobs.find(j => j.id === jobId);
                await query`
          INSERT INTO wearcheck (
            work_log_id, sample_number, date_received, date_submitted, 
            date_reported, status, completed, notes
          ) VALUES (
            ${jobId}, ${job.sample_number}, ${editData.date_received || null},
            ${editData.date_submitted || null}, ${editData.date_reported || null},
            ${editData.wearcheck_status || null}, ${editData.completed}, ${editData.notes || null}
          )
        `;
            }

            alert('WearCheck updated successfully!');
            setEditingId(null);
            fetchServiceJobs();
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving wearcheck data');
        }
        setLoading(false);
    };

    const getFilteredJobs = () => {
        let filtered = serviceJobs;

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(job =>
                job.jobcard_number?.toLowerCase().includes(search) ||
                job.sample_number?.toLowerCase().includes(search) ||
                job.plant_number?.toLowerCase().includes(search) ||
                job.site_name?.toLowerCase().includes(search)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(job => job.wearcheck_status === statusFilter);
        }

        // Completed filter
        if (completedFilter === 'completed') {
            filtered = filtered.filter(job => job.wearcheck_completed === true);
        } else if (completedFilter === 'pending') {
            filtered = filtered.filter(job => !job.wearcheck_completed);
        }

        return filtered;
    };

    const stats = {
        total: serviceJobs.length,
        pending: serviceJobs.filter(j => !j.wearcheck_completed).length,
        completed: serviceJobs.filter(j => j.wearcheck_completed).length,
        urgent: serviceJobs.filter(j => j.wearcheck_status === 'Urgent').length
    };

    if (!user || loading) {
        return <div className="loading"><div className="spinner"></div>Loading...</div>;
    }

    const filteredJobs = getFilteredJobs();

    return (
        <div>
            <Navbar user={user} />
            <div className="page-container">
                <div className="clerk-dashboard">
                    <div className="dashboard-header">
                        <h2>🔬 WearCheck Management</h2>
                        <p>Manage service sample tracking and reporting</p>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📋</div>
                            <div className="stat-content">
                                <h3>{stats.total}</h3>
                                <p>Total Services</p>
                            </div>
                        </div>
                        <div className="stat-card pending-card">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-content">
                                <h3>{stats.pending}</h3>
                                <p>Pending</p>
                            </div>
                        </div>
                        <div className="stat-card completed-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-content">
                                <h3>{stats.completed}</h3>
                                <p>Completed</p>
                            </div>
                        </div>
                        <div className="stat-card urgent-card">
                            <div className="stat-icon">⚠️</div>
                            <div className="stat-content">
                                <h3>{stats.urgent}</h3>
                                <p>Urgent</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filter-section">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="🔍 Search by job card, sample #, plant #..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Normal">Normal</option>
                            <option value="Borderline">Borderline</option>
                            <option value="Urgent">Urgent</option>
                        </select>

                        <select
                            value={completedFilter}
                            onChange={(e) => setCompletedFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Jobs Table */}
                    <div className="jobs-section">
                        <h3>Service Jobs ({filteredJobs.length})</h3>
                        <div className="table-responsive">
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>Job Card</th>
                                        <th>Date</th>
                                        <th>Plant</th>
                                        <th>Sample #</th>
                                        <th>Received</th>
                                        <th>Submitted</th>
                                        <th>Reported</th>
                                        <th>Status</th>
                                        <th>Completed</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="no-data">No service jobs found</td>
                                        </tr>
                                    ) : (
                                        filteredJobs.map((job) => (
                                            <tr key={job.id} className={job.wearcheck_completed ? 'completed-row' : ''}>
                                                <td><strong>{job.jobcard_number}</strong></td>
                                                <td>{formatDate(job.date)}</td>
                                                <td>{job.plant_number}</td>
                                                <td><strong>{job.sample_number || 'N/A'}</strong></td>
                                                <td>
                                                    {editingId === job.id ? (
                                                        <input
                                                            type="date"
                                                            value={editData.date_received}
                                                            onChange={(e) => setEditData({ ...editData, date_received: e.target.value })}
                                                            className="date-input"
                                                        />
                                                    ) : (
                                                        formatDate(job.date_received) || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === job.id ? (
                                                        <input
                                                            type="date"
                                                            value={editData.date_submitted}
                                                            onChange={(e) => setEditData({ ...editData, date_submitted: e.target.value })}
                                                            className="date-input"
                                                        />
                                                    ) : (
                                                        formatDate(job.date_submitted) || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === job.id ? (
                                                        <input
                                                            type="date"
                                                            value={editData.date_reported}
                                                            onChange={(e) => setEditData({ ...editData, date_reported: e.target.value })}
                                                            className="date-input"
                                                        />
                                                    ) : (
                                                        formatDate(job.date_reported) || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === job.id ? (
                                                        <select
                                                            value={editData.wearcheck_status}
                                                            onChange={(e) => setEditData({ ...editData, wearcheck_status: e.target.value })}
                                                            className="status-select"
                                                        >
                                                            <option value="">-</option>
                                                            <option value="Normal">Normal</option>
                                                            <option value="Borderline">Borderline</option>
                                                            <option value="Urgent">Urgent</option>
                                                        </select>
                                                    ) : (
                                                        job.wearcheck_status ? (
                                                            <span className={`status-badge ${job.wearcheck_status.toLowerCase()}`}>
                                                                {job.wearcheck_status}
                                                            </span>
                                                        ) : '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === job.id ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={editData.completed}
                                                            onChange={(e) => setEditData({ ...editData, completed: e.target.checked })}
                                                            className="checkbox"
                                                        />
                                                    ) : (
                                                        job.wearcheck_completed ? '✅' : '⏳'
                                                    )}
                                                </td>
                                                <td className="action-buttons">
                                                    {editingId === job.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => saveWearcheck(job.id, job.wearcheck_id)}
                                                                className="btn-save"
                                                            >
                                                                ✓ Save
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="btn-cancel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(job)}
                                                            className="btn-edit"
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

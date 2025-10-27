import React, { useEffect, useState } from 'react';
import { query } from '../utils/neonClient';
import SummaryCharts from './SummaryCharts';
import Navbar from './Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedJobCard, setSelectedJobCard] = useState(null);
    const [stats, setStats] = useState({
        totalHours: 0,
        totalJobCards: 0,
        breakdownCount: 0,
        maintenanceCount: 0,
        avgDuration: 0,
        pendingApproval: 0
    });

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        setUser(userData);
        fetchData();
    }, []);

    useEffect(() => {
        calculateStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs]);

    const fetchData = async () => {
        setLoading(true);

        try {
            const { data: logsData } = await query`
        SELECT * FROM work_logs ORDER BY date DESC
      `;

            const { data: usersData } = await query`
        SELECT * FROM users ORDER BY name
      `;

            const { data: equipmentData } = await query`
        SELECT * FROM equipment ORDER BY plant_number
      `;

            // Ensure arrays
            setLogs(Array.isArray(logsData) ? logsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setEquipment(Array.isArray(equipmentData) ? equipmentData : []);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLogs([]);
            setUsers([]);
            setEquipment([]);
        }

        setLoading(false);
    };

    const calculateStats = () => {
        const totalHours = logs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
        const totalJobCards = logs.length;
        const breakdownCount = logs.filter(log => log.job_type === 'Breakdown').length;
        const maintenanceCount = logs.filter(log => log.job_type === 'Maintenance').length;
        const avgDuration = totalJobCards > 0 ? (totalHours / totalJobCards).toFixed(1) : 0;
        const pendingApproval = logs.filter(log => !log.manager_approved).length;

        setStats({
            totalHours: totalHours.toFixed(1),
            totalJobCards,
            breakdownCount,
            maintenanceCount,
            avgDuration,
            pendingApproval
        });
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
        }
        return String(dateValue);
    };

    const getFilteredLogs = () => {
        // Safety check - ensure logs is an array
        if (!Array.isArray(logs) || logs.length === 0) {
            return [];
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        switch (filter) {
            case 'daily':
                return logs.filter((log) => formatDate(log.date) === today);
            case 'weekly': {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekAgoStr = weekAgo.toISOString().slice(0, 10);
                return logs.filter((log) => formatDate(log.date) >= weekAgoStr);
            }
            case 'monthly': {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const monthAgoStr = monthAgo.toISOString().slice(0, 10);
                return logs.filter((log) => formatDate(log.date) >= monthAgoStr);
            }
            case 'yearly': {
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                const yearAgoStr = yearAgo.toISOString().slice(0, 10);
                return logs.filter((log) => formatDate(log.date) >= yearAgoStr);
            }
            default:
                return logs;
        }
    };

    const parseFluids = (fluidsData) => {
        try {
            if (typeof fluidsData === 'string') {
                return JSON.parse(fluidsData);
            }
            if (Array.isArray(fluidsData)) {
                return fluidsData;
            }
            return [];
        } catch {
            return [];
        }
    };

    const approveJobCard = async (jobCardId) => {
        const { error } = await query`
      UPDATE work_logs SET manager_approved = ${true} WHERE id = ${jobCardId}
    `;

        if (!error) {
            fetchData();
            alert('Job card approved successfully!');
        } else {
            alert('Error approving job card');
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const filteredLogs = getFilteredLogs();

        // Add header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('JODAN Construction', 14, 20);
        doc.setFontSize(16);
        doc.text('Job Card Summary Report', 14, 28);

        // Add metadata
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`, 14, 36);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 41);
        doc.text(`Total Job Cards: ${filteredLogs.length} | Total Hours: ${stats.totalHours}h`, 14, 46);
        doc.text(`Breakdowns: ${stats.breakdownCount} | Maintenance: ${stats.maintenanceCount}`, 14, 51);

        // Prepare table data
        const tableData = filteredLogs.map((log) => {
            const worker = users.find((u) => u.id === log.user_id);

            return [
                log.jobcard_number || 'N/A',
                formatDate(log.date),
                log.plant_number,
                log.smr,
                worker?.name || 'Unknown',
                log.job_type,
                log.description.length > 30 ? log.description.substring(0, 30) + '...' : log.description,
                log.duration ? log.duration + 'h' : 'N/A',
                log.manager_approved ? 'Yes' : 'No'
            ];
        });

        // Add table
        autoTable(doc, {
            head: [['Job Card', 'Date', 'Plant', 'SMR', 'Mechanic', 'Type', 'Description', 'Duration', 'Approved']],
            body: tableData,
            startY: 56,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [31, 78, 120],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 20 },
                2: { cellWidth: 15 },
                3: { cellWidth: 15 },
                4: { cellWidth: 25 },
                5: { cellWidth: 20 },
                6: { cellWidth: 35 },
                7: { cellWidth: 15 },
                8: { cellWidth: 15 }
            }
        });

        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Save the PDF
        doc.save(`jodan_jobcards_${filter}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const filteredLogs = getFilteredLogs();

    if (!user || loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                Loading dashboard...
            </div>
        );
    }

    return (
        <div>
            <Navbar user={user} />
            <div className="page-container">
                <div className="admin-dashboard">
                    <div className="dashboard-header">
                        <h2>🏗️ JODAN Construction - Admin Dashboard</h2>
                        <p>Job Card Management & Fleet Monitoring</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">⏰</div>
                            <div className="stat-content">
                                <h3>{stats.totalHours}</h3>
                                <p>Total Hours</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📋</div>
                            <div className="stat-content">
                                <h3>{stats.totalJobCards}</h3>
                                <p>Job Cards</p>
                            </div>
                        </div>
                        <div className="stat-card breakdown-card">
                            <div className="stat-icon">🔴</div>
                            <div className="stat-content">
                                <h3>{stats.breakdownCount}</h3>
                                <p>Breakdowns</p>
                            </div>
                        </div>
                        <div className="stat-card maintenance-card">
                            <div className="stat-icon">🔧</div>
                            <div className="stat-content">
                                <h3>{stats.maintenanceCount}</h3>
                                <p>Maintenance</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-content">
                                <h3>{stats.avgDuration}h</h3>
                                <p>Avg Duration</p>
                            </div>
                        </div>
                        <div className="stat-card pending-card">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-content">
                                <h3>{stats.pendingApproval}</h3>
                                <p>Pending Approval</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filter-section">
                        <div className="filter-buttons">
                            <button
                                className={filter === 'all' ? 'active' : ''}
                                onClick={() => setFilter('all')}
                            >
                                All Time
                            </button>
                            <button
                                className={filter === 'daily' ? 'active' : ''}
                                onClick={() => setFilter('daily')}
                            >
                                Daily
                            </button>
                            <button
                                className={filter === 'weekly' ? 'active' : ''}
                                onClick={() => setFilter('weekly')}
                            >
                                Weekly
                            </button>
                            <button
                                className={filter === 'monthly' ? 'active' : ''}
                                onClick={() => setFilter('monthly')}
                            >
                                Monthly
                            </button>
                            <button
                                className={filter === 'yearly' ? 'active' : ''}
                                onClick={() => setFilter('yearly')}
                            >
                                Yearly
                            </button>
                        </div>
                        <button onClick={exportToPDF} className="btn-export">
                            📄 Export to PDF
                        </button>
                    </div>

                    {/* Charts */}
                    <SummaryCharts
                        logs={filteredLogs}
                        users={users}
                        equipment={equipment}
                        filter={filter}
                    />

                    {/* Job Cards Table */}
                    <div className="logs-section">
                        <h3>📋 Job Cards ({filteredLogs.length})</h3>
                        <div className="table-container">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Job Card #</th>
                                        <th>Date</th>
                                        <th>Plant</th>
                                        <th>SMR</th>
                                        <th>Type</th>
                                        <th>Mechanic</th>
                                        <th>Description</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="no-data">
                                                No job cards found for the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const worker = users.find((u) => u.id === log.user_id);
                                            const equipmentInfo = equipment.find((eq) => eq.plant_number === log.plant_number);

                                            return (
                                                <tr key={log.id} className={log.job_type === 'Breakdown' ? 'breakdown-row' : ''}>
                                                    <td>
                                                        <strong className="jobcard-link" onClick={() => setSelectedJobCard(log)}>
                                                            {log.jobcard_number}
                                                        </strong>
                                                    </td>
                                                    <td>{formatDate(log.date)}</td>
                                                    <td>
                                                        <div className="plant-info">
                                                            <strong>{log.plant_number}</strong>
                                                            {equipmentInfo && (
                                                                <small>{equipmentInfo.equipment_type}</small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{log.smr}h</td>
                                                    <td>
                                                        <span className={`type-badge ${log.job_type.toLowerCase()}`}>
                                                            {log.job_type}
                                                        </span>
                                                    </td>
                                                    <td>{worker?.name || 'Unknown'}</td>
                                                    <td className="description-cell">{log.description}</td>
                                                    <td><strong>{log.duration ? log.duration + 'h' : 'N/A'}</strong></td>
                                                    <td>
                                                        <span className={`status-badge ${log.manager_approved ? 'approved' : 'pending'}`}>
                                                            {log.manager_approved ? '✓ Approved' : '⏳ Pending'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {!log.manager_approved && (
                                                            <button
                                                                className="btn-approve"
                                                                onClick={() => approveJobCard(log.id)}
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Fleet Status Overview */}
                    <div className="fleet-section">
                        <h3>🚜 Fleet Status Overview</h3>
                        <div className="fleet-grid">
                            {equipment.length === 0 ? (
                                <p className="no-data">No equipment data available.</p>
                            ) : (
                                equipment.map((plant) => {
                                    const recentJobs = logs.filter(log => log.plant_number === plant.plant_number).length;
                                    const lastJob = logs.find(log => log.plant_number === plant.plant_number);

                                    return (
                                        <div key={plant.id} className="fleet-card">
                                            <div className="fleet-header">
                                                <strong>{plant.plant_number}</strong>
                                                <span className={`fleet-status ${plant.status}`}>{plant.status}</span>
                                            </div>
                                            <p className="fleet-type">{plant.equipment_type}</p>
                                            <p className="fleet-model">{plant.make_model}</p>
                                            <div className="fleet-stats">
                                                <div className="fleet-stat">
                                                    <span className="label">SMR:</span>
                                                    <span className="value">{plant.current_smr}h</span>
                                                </div>
                                                <div className="fleet-stat">
                                                    <span className="label">Jobs:</span>
                                                    <span className="value">{recentJobs}</span>
                                                </div>
                                            </div>
                                            {lastJob && (
                                                <p className="fleet-last-service">
                                                    Last service: {formatDate(lastJob.date)}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Card Detail Modal */}
            {selectedJobCard && (
                <div className="modal-overlay" onClick={() => setSelectedJobCard(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Job Card Details</h2>
                            <button className="modal-close" onClick={() => setSelectedJobCard(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <strong>Job Card #:</strong> {selectedJobCard.jobcard_number}
                            </div>
                            <div className="detail-row">
                                <strong>Date:</strong> {formatDate(selectedJobCard.date)}
                            </div>
                            <div className="detail-row">
                                <strong>Plant:</strong> {selectedJobCard.plant_number}
                            </div>
                            <div className="detail-row">
                                <strong>SMR:</strong> {selectedJobCard.smr} hours
                            </div>
                            <div className="detail-row">
                                <strong>Job Type:</strong> {selectedJobCard.job_type}
                            </div>
                            <div className="detail-row">
                                <strong>Mechanic:</strong> {users.find(u => u.id === selectedJobCard.user_id)?.name}
                            </div>
                            <div className="detail-section">
                                <strong>Description:</strong>
                                <p>{selectedJobCard.description}</p>
                            </div>
                            <div className="detail-section">
                                <strong>Work Done:</strong>
                                <p>{selectedJobCard.work_done}</p>
                            </div>
                            {selectedJobCard.work_to_plan && (
                                <div className="detail-section">
                                    <strong>Work to Plan:</strong>
                                    <p>{selectedJobCard.work_to_plan}</p>
                                </div>
                            )}
                            <div className="detail-row">
                                <strong>Time Started:</strong> {selectedJobCard.time_started || 'N/A'}
                            </div>
                            <div className="detail-row">
                                <strong>Time Ended:</strong> {selectedJobCard.time_ended || 'N/A'}
                            </div>
                            <div className="detail-row">
                                <strong>Duration:</strong> {selectedJobCard.duration ? selectedJobCard.duration + ' hours' : 'N/A'}
                            </div>
                            {selectedJobCard.delay_reason && (
                                <div className="detail-section alert">
                                    <strong>⚠️ Delay Reason:</strong>
                                    <p>{selectedJobCard.delay_reason}</p>
                                </div>
                            )}
                            {parseFluids(selectedJobCard.fluids_used).length > 0 && (
                                <div className="detail-section">
                                    <strong>Fluids/Oils Used:</strong>
                                    <table className="fluids-table">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Quantity</th>
                                                <th>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parseFluids(selectedJobCard.fluids_used).map((fluid, idx) => (
                                                <tr key={idx}>
                                                    <td>{fluid.type}</td>
                                                    <td>{fluid.quantity}</td>
                                                    <td>{fluid.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="detail-row">
                                <strong>Status:</strong>
                                <span className={`status-badge ${selectedJobCard.manager_approved ? 'approved' : 'pending'}`}>
                                    {selectedJobCard.manager_approved ? '✓ Approved' : '⏳ Pending Approval'}
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            {!selectedJobCard.manager_approved && (
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        approveJobCard(selectedJobCard.id);
                                        setSelectedJobCard(null);
                                    }}
                                >
                                    Approve Job Card
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => setSelectedJobCard(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

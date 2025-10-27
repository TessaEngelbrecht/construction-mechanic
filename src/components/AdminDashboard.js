import React, { useEffect, useState } from 'react';
import { query } from '../utils/neonClient';
import SummaryCharts from './SummaryCharts';
import Navbar from './Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
        pendingApproval: 0,
        completedCount: 0
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
        SELECT * FROM work_logs ORDER BY date DESC, created_at DESC
      `;

            const { data: usersData } = await query`
        SELECT * FROM users ORDER BY name
      `;

            const { data: equipmentData } = await query`
        SELECT * FROM equipment ORDER BY plant_number
      `;

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
        const completedCount = logs.filter(log => log.status === 'completed' && log.manager_approved && log.downloaded).length;

        setStats({
            totalHours: totalHours.toFixed(1),
            totalJobCards,
            breakdownCount,
            maintenanceCount,
            avgDuration,
            pendingApproval,
            completedCount
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
        if (!Array.isArray(logs) || logs.length === 0) {
            return [];
        }

        const now = new Date();

        switch (filter) {
            case 'daily': {
                // Get today's date in YYYY-MM-DD format
                const today = now.toISOString().slice(0, 10);
                return logs.filter((log) => {
                    const logDate = formatDate(log.date); // This ensures consistent format
                    return logDate === today;
                });
            }
            case 'weekly': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekAgoStr = weekAgo.toISOString().slice(0, 10);
                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= weekAgoStr && logDate <= now.toISOString().slice(0, 10);
                });
            }
            case 'monthly': {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const monthAgoStr = monthAgo.toISOString().slice(0, 10);
                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= monthAgoStr && logDate <= now.toISOString().slice(0, 10);
                });
            }
            case 'yearly': {
                const yearAgo = new Date(now);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                const yearAgoStr = yearAgo.toISOString().slice(0, 10);
                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= yearAgoStr && logDate <= now.toISOString().slice(0, 10);
                });
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

    const downloadIndividualJobCardPDF = async (log) => {
        const doc = new jsPDF();
        const worker = users.find((u) => u.id === log.user_id);
        const equipmentInfo = equipment.find((eq) => eq.plant_number === log.plant_number);

        // Header
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('JODAN CONSTRUCTION', 105, 20, { align: 'center' });

        doc.setFontSize(18);
        doc.text('JOB CARD', 105, 28, { align: 'center' });

        // Job card number box
        doc.setFontSize(12);
        doc.setFillColor(31, 78, 120);
        doc.rect(150, 35, 50, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(log.jobcard_number, 175, 42, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Basic Information
        let yPos = 55;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('BASIC INFORMATION', 14, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        const basicInfo = [
            ['Date:', formatDate(log.date)],
            ['Site:', log.site_name],
            ['Plant Number:', `${log.plant_number} ${equipmentInfo ? `(${equipmentInfo.equipment_type})` : ''}`],
            ['Kilos/Hours:', `${log.kilos_hours}h`],
            ['Job Type:', log.job_type],
            ['Mechanic:', worker?.name || 'Unknown']
        ];

        basicInfo.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 14, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(value, 60, yPos);
            yPos += 7;
        });

        // Job Details
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('JOB DETAILS', 14, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        if (log.breakdown_issue) {
            doc.text(`Breakdown Issue: ${log.breakdown_issue}`, 14, yPos);
            yPos += 7;
            if (log.breakdown_detail) {
                doc.text(`Detail: ${log.breakdown_detail}`, 14, yPos);
                yPos += 7;
            }
        }

        if (log.maintenance_issue) {
            doc.text(`Maintenance Issue: ${log.maintenance_issue}`, 14, yPos);
            yPos += 7;
            if (log.maintenance_detail) {
                doc.text(`Detail: ${log.maintenance_detail}`, 14, yPos);
                yPos += 7;
            }
            if (log.battery_position) {
                doc.text(`Battery Position: ${log.battery_position}`, 14, yPos);
                yPos += 7;
            }
        }

        if (log.service_interval) {
            doc.text(`Service Interval: ${log.service_interval}`, 14, yPos);
            yPos += 7;
        }

        if (log.tyre_number) {
            doc.text(`Tyre Number: ${log.tyre_number} | Action: ${log.tyre_action}`, 14, yPos);
            yPos += 7;
            if (log.tyre_serial_number) {
                doc.text(`Serial Number: ${log.tyre_serial_number}`, 14, yPos);
                yPos += 7;
            }
            if (log.tyre_swap_from) {
                doc.text(`Swapped From: ${log.tyre_swap_from}`, 14, yPos);
                yPos += 7;
            }
        }

        if (log.other_description) {
            doc.text('Description:', 14, yPos);
            yPos += 7;
            const splitText = doc.splitTextToSize(log.other_description, 180);
            doc.text(splitText, 14, yPos);
            yPos += (splitText.length * 7);
        }

        // Time Tracking
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('TIME TRACKING', 14, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        doc.text(`Time Started: ${log.time_started || 'N/A'}`, 14, yPos);
        doc.text(`Time Ended: ${log.time_ended || 'N/A'}`, 100, yPos);
        yPos += 7;
        doc.text(`Duration: ${log.duration || 'N/A'} hours`, 14, yPos);
        yPos += 7;

        if (log.delay_reason) {
            doc.text(`Delay Reason: ${log.delay_reason}`, 14, yPos);
            yPos += 7;
        }

        // Fluids Used
        const fluids = parseFluids(log.fluids_used);
        if (fluids.length > 0) {
            yPos += 5;
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFont(undefined, 'bold');
            doc.text('FLUIDS & OILS USED', 14, yPos);
            yPos += 8;

            const fluidData = fluids.map(f => [f.type, `${f.quantity} litres`]);
            autoTable(doc, {
                head: [['Fluid Type', 'Quantity']],
                body: fluidData,
                startY: yPos,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [31, 78, 120] }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // Work to Plan
        if (log.work_to_plan) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFont(undefined, 'bold');
            doc.text('WORK TO PLAN', 14, yPos);
            yPos += 7;
            doc.setFont(undefined, 'normal');
            const splitWork = doc.splitTextToSize(log.work_to_plan, 180);
            doc.text(splitWork, 14, yPos);
            yPos += (splitWork.length * 7);
        }

        // Status
        yPos += 10;
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFont(undefined, 'bold');
        doc.text('STATUS', 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.text(`Approved: ${log.manager_approved ? 'Yes' : 'No'}`, 14, yPos);
        doc.text(`Status: ${log.status}`, 100, yPos);

        // Footer
        doc.setFontSize(8);
        doc.text('Generated by JODAN Construction Management System', 105, 290, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

        // Save PDF
        doc.save(`JobCard_${log.jobcard_number}_${log.plant_number}.pdf`);

        // Mark as downloaded
        await query`
      UPDATE work_logs
      SET downloaded = ${true},
          downloaded_at = ${new Date().toISOString()},
          downloaded_by = ${user.id},
          status = ${log.manager_approved ? 'completed' : 'pending'}
      WHERE id = ${log.id}
    `;

        fetchData();
    };

    const exportToExcel = () => {
        const filteredLogs = getFilteredLogs();

        const excelData = filteredLogs.map((log) => {
            const worker = users.find((u) => u.id === log.user_id);
            const fluids = parseFluids(log.fluids_used);
            const fluidsText = fluids.map(f => `${f.type}: ${f.quantity}L`).join('; ');

            return {
                'Job Card #': log.jobcard_number,
                'Date': formatDate(log.date),
                'Site': log.site_name,
                'Plant Number': log.plant_number,
                'Kilos/Hours': log.kilos_hours,
                'Job Type': log.job_type,
                'Breakdown Issue': log.breakdown_issue || '',
                'Breakdown Detail': log.breakdown_detail || '',
                'Maintenance Issue': log.maintenance_issue || '',
                'Maintenance Detail': log.maintenance_detail || '',
                'Battery Position': log.battery_position || '',
                'Service Interval': log.service_interval || '',
                'Tyre Number': log.tyre_number || '',
                'Tyre Action': log.tyre_action || '',
                'Other Description': log.other_description || '',
                'Work to Plan': log.work_to_plan || '',
                'Mechanic': worker?.name || 'Unknown',
                'Time Started': log.time_started || '',
                'Time Ended': log.time_ended || '',
                'Duration (hrs)': log.duration || '',
                'Delay Reason': log.delay_reason || '',
                'Fluids Used': fluidsText,
                'Status': log.status,
                'Approved': log.manager_approved ? 'Yes' : 'No',
                'Downloaded': log.downloaded ? 'Yes' : 'No'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Job Card #
            { wch: 12 }, // Date
            { wch: 15 }, // Site
            { wch: 12 }, // Plant Number
            { wch: 12 }, // Kilos/Hours
            { wch: 12 }, // Job Type
            { wch: 18 }, // Breakdown Issue
            { wch: 15 }, // Breakdown Detail
            { wch: 18 }, // Maintenance Issue
            { wch: 15 }, // Maintenance Detail
            { wch: 15 }, // Battery Position
            { wch: 15 }, // Service Interval
            { wch: 12 }, // Tyre Number
            { wch: 12 }, // Tyre Action
            { wch: 30 }, // Other Description
            { wch: 30 }, // Work to Plan
            { wch: 20 }, // Mechanic
            { wch: 12 }, // Time Started
            { wch: 12 }, // Time Ended
            { wch: 12 }, // Duration
            { wch: 25 }, // Delay Reason
            { wch: 40 }, // Fluids Used
            { wch: 12 }, // Status
            { wch: 10 }, // Approved
            { wch: 12 }  // Downloaded
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Cards');

        const fileName = `JODAN_JobCards_${filter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
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
                        <div className="stat-card completed-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-content">
                                <h3>{stats.completedCount}</h3>
                                <p>Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Export */}
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
                        <button onClick={exportToExcel} className="btn-export-excel">
                            📊 Export to Excel
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
                                        <th>Site</th>
                                        <th>Plant</th>
                                        <th>Kilos/Hrs</th>
                                        <th>Type</th>
                                        <th>Mechanic</th>
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
                                            const isCompleted = log.status === 'completed' && log.manager_approved && log.downloaded;

                                            return (
                                                <tr key={log.id} className={log.job_type === 'Breakdown' ? 'breakdown-row' : ''}>
                                                    <td>
                                                        <strong className="jobcard-link" onClick={() => setSelectedJobCard(log)}>
                                                            {log.jobcard_number}
                                                        </strong>
                                                    </td>
                                                    <td>{formatDate(log.date)}</td>
                                                    <td>{log.site_name}</td>
                                                    <td><strong>{log.plant_number}</strong></td>
                                                    <td>{log.kilos_hours}h</td>
                                                    <td>
                                                        <span className={`type-badge ${log.job_type.toLowerCase()}`}>
                                                            {log.job_type}
                                                        </span>
                                                    </td>
                                                    <td>{worker?.name || 'Unknown'}</td>
                                                    <td><strong>{log.duration ? log.duration + 'h' : 'N/A'}</strong></td>
                                                    <td>
                                                        {isCompleted ? (
                                                            <span className="status-badge completed">✓ Completed</span>
                                                        ) : log.manager_approved ? (
                                                            <span className="status-badge approved">✓ Approved</span>
                                                        ) : (
                                                            <span className="status-badge pending">⏳ Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="action-buttons">
                                                        {!log.manager_approved && (
                                                            <button
                                                                className="btn-approve"
                                                                onClick={() => approveJobCard(log.id)}
                                                                title="Approve"
                                                            >
                                                                ✓
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn-download"
                                                            onClick={() => downloadIndividualJobCardPDF(log)}
                                                            title="Download PDF"
                                                        >
                                                            📄
                                                        </button>
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
                                                    <span className="label">Kilos/Hours:</span>
                                                    <span className="value">{plant.current_kilos_hours}h</span>
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
                                <strong>Site:</strong> {selectedJobCard.site_name}
                            </div>
                            <div className="detail-row">
                                <strong>Plant:</strong> {selectedJobCard.plant_number}
                            </div>
                            <div className="detail-row">
                                <strong>Kilos/Hours:</strong> {selectedJobCard.kilos_hours} hours
                            </div>
                            <div className="detail-row">
                                <strong>Job Type:</strong> {selectedJobCard.job_type}
                            </div>
                            <div className="detail-row">
                                <strong>Mechanic:</strong> {users.find(u => u.id === selectedJobCard.user_id)?.name}
                            </div>

                            {selectedJobCard.breakdown_issue && (
                                <>
                                    <div className="detail-row">
                                        <strong>Breakdown Issue:</strong> {selectedJobCard.breakdown_issue}
                                    </div>
                                    {selectedJobCard.breakdown_detail && (
                                        <div className="detail-row">
                                            <strong>Detail:</strong> {selectedJobCard.breakdown_detail}
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedJobCard.maintenance_issue && (
                                <>
                                    <div className="detail-row">
                                        <strong>Maintenance Issue:</strong> {selectedJobCard.maintenance_issue}
                                    </div>
                                    {selectedJobCard.maintenance_detail && (
                                        <div className="detail-row">
                                            <strong>Detail:</strong> {selectedJobCard.maintenance_detail}
                                        </div>
                                    )}
                                    {selectedJobCard.battery_position && (
                                        <div className="detail-row">
                                            <strong>Battery Position:</strong> {selectedJobCard.battery_position}
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedJobCard.service_interval && (
                                <div className="detail-row">
                                    <strong>Service Interval:</strong> {selectedJobCard.service_interval}
                                </div>
                            )}

                            {selectedJobCard.tyre_number && (
                                <>
                                    <div className="detail-row">
                                        <strong>Tyre Number:</strong> {selectedJobCard.tyre_number}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Tyre Action:</strong> {selectedJobCard.tyre_action}
                                    </div>
                                    {selectedJobCard.tyre_serial_number && (
                                        <div className="detail-row">
                                            <strong>Serial Number:</strong> {selectedJobCard.tyre_serial_number}
                                        </div>
                                    )}
                                    {selectedJobCard.tyre_swap_from && (
                                        <div className="detail-row">
                                            <strong>Swapped From:</strong> {selectedJobCard.tyre_swap_from}
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedJobCard.other_description && (
                                <div className="detail-section">
                                    <strong>Description:</strong>
                                    <p>{selectedJobCard.other_description}</p>
                                </div>
                            )}

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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parseFluids(selectedJobCard.fluids_used).map((fluid, idx) => (
                                                <tr key={idx}>
                                                    <td>{fluid.type}</td>
                                                    <td>{fluid.quantity} litres</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="detail-row">
                                <strong>Status:</strong>
                                <span className={`status-badge ${selectedJobCard.status === 'completed' && selectedJobCard.manager_approved && selectedJobCard.downloaded
                                        ? 'completed'
                                        : selectedJobCard.manager_approved
                                            ? 'approved'
                                            : 'pending'
                                    }`}>
                                    {selectedJobCard.status === 'completed' && selectedJobCard.manager_approved && selectedJobCard.downloaded
                                        ? '✓ Completed'
                                        : selectedJobCard.manager_approved
                                            ? '✓ Approved'
                                            : '⏳ Pending'}
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
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    downloadIndividualJobCardPDF(selectedJobCard);
                                    setSelectedJobCard(null);
                                }}
                            >
                                Download PDF
                            </button>
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

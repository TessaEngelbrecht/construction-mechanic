import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import SummaryCharts from './SummaryCharts';
import Navbar from './Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalHours: 0,
        totalWorkers: 0,
        totalLogs: 0,
        avgHoursPerDay: 0
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
        const { data: logsData } = await supabase
            .from('work_logs')
            .select('*')
            .order('date', { ascending: false });

        const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .order('name');

        setLogs(logsData || []);
        setUsers(usersData || []);
        setLoading(false);
    };

    const calculateStats = () => {
        const totalHours = logs.reduce((sum, log) => sum + Number(log.hours_worked), 0);
        const totalWorkers = new Set(logs.map((log) => log.user_id)).size;
        const totalLogs = logs.length;
        const avgHoursPerDay = totalLogs > 0 ? (totalHours / totalLogs).toFixed(1) : 0;

        setStats({ totalHours, totalWorkers, totalLogs, avgHoursPerDay });
    };

    const getFilteredLogs = () => {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        switch (filter) {
            case 'daily':
                return logs.filter((log) => log.date === today);
            case 'weekly':
                const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10);
                return logs.filter((log) => log.date >= weekAgo);
            case 'monthly':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().slice(0, 10);
                return logs.filter((log) => log.date >= monthAgo);
            case 'yearly':
                const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().slice(0, 10);
                return logs.filter((log) => log.date >= yearAgo);
            default:
                return logs;
        }
    };

    const parseEquipment = (equipmentData) => {
        try {
            // If it's already a string, try to parse it
            if (typeof equipmentData === 'string') {
                const parsed = JSON.parse(equipmentData);
                return Array.isArray(parsed) ? parsed : [equipmentData];
            }
            // If it's already an array, return it
            if (Array.isArray(equipmentData)) {
                return equipmentData;
            }
            return [String(equipmentData)];
        } catch {
            // If parsing fails, return as single item array
            return [String(equipmentData)];
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const filteredLogs = getFilteredLogs();

        // Add title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Work Logs Summary Report', 14, 22);

        // Add metadata
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`, 14, 32);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
        doc.text(`Total Hours: ${stats.totalHours}h | Total Logs: ${filteredLogs.length}`, 14, 44);

        // Prepare table data
        const tableData = filteredLogs.map((log) => {
            const worker = users.find((u) => u.id === log.user_id);
            const equipment = parseEquipment(log.equipment_used);
            const equipmentStr = equipment.join(', ');

            return [
                log.date,
                worker?.name || 'Unknown',
                log.hours_worked + 'h',
                log.work_done.length > 45 ? log.work_done.substring(0, 45) + '...' : log.work_done,
                equipmentStr.length > 40 ? equipmentStr.substring(0, 40) + '...' : equipmentStr
            ];
        });

        // Add table - doc.autoTable will work now
        autoTable(doc, {
            head: [['Date', 'Worker', 'Hours', 'Work Done', 'Equipment Used']],
            body: tableData,
            startY: 52,
            styles: {
                fontSize: 9,
                cellPadding: 4
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
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 20 },
                3: { cellWidth: 50 },
                4: { cellWidth: 50 }
            }
        });

        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Save the PDF
        doc.save(`work_logs_${filter}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
                        <h2>Admin Dashboard</h2>
                        <p>Manage and monitor all worker activities</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">⏰</div>
                            <div className="stat-content">
                                <h3>{stats.totalHours.toFixed(1)}</h3>
                                <p>Total Hours</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">👷</div>
                            <div className="stat-content">
                                <h3>{stats.totalWorkers}</h3>
                                <p>Active Workers</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📝</div>
                            <div className="stat-content">
                                <h3>{stats.totalLogs}</h3>
                                <p>Work Logs</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-content">
                                <h3>{stats.avgHoursPerDay}</h3>
                                <p>Avg Hours/Day</p>
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
                    <SummaryCharts logs={filteredLogs} users={users} filter={filter} />

                    {/* Logs Table */}
                    <div className="logs-section">
                        <h3>Recent Work Logs ({filteredLogs.length})</h3>
                        <div className="table-container">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Worker</th>
                                        <th>Hours</th>
                                        <th>Work Done</th>
                                        <th>Equipment Used</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="no-data">
                                                No logs found for the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const worker = users.find((u) => u.id === log.user_id);
                                            const equipment = parseEquipment(log.equipment_used);

                                            return (
                                                <tr key={log.id}>
                                                    <td><strong>{log.date}</strong></td>
                                                    <td>{worker?.name || 'Unknown'}</td>
                                                    <td><strong>{log.hours_worked}h</strong></td>
                                                    <td>{log.work_done}</td>
                                                    <td>
                                                        <div className="equipment-badges">
                                                            {equipment.map((item, idx) => (
                                                                <span key={idx} className="equipment-badge">
                                                                    {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
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

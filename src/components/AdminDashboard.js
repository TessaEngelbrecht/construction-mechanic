import React, { useEffect, useState } from 'react';
import { query } from '../utils/neonClient';
import SummaryCharts from './SummaryCharts';
import Navbar from './Navbar';
import jsPDF from 'jspdf';
//import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import 'jspdf-autotable';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedJobCard, setSelectedJobCard] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | wearcheck | completed
    const [typeFilter, setTypeFilter] = useState('all');     // all | Breakdown | Maintenance | Service | Tyres | Other
    const [siteFilter, setSiteFilter] = useState('all');     // all | specific site
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
      SELECT 
        wl.*,
        wc.date_received,
        wc.date_submitted,
        wc.date_reported,
        wc.status as wearcheck_status,
        wc.completed as wearcheck_completed
      FROM work_logs wl
      LEFT JOIN wearcheck wc ON wl.id = wc.work_log_id
      ORDER BY wl.date DESC, wl.created_at DESC
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
    const computeStatusWord = (log) => {
        // Service must wait for WearCheck completion
        if (log.job_type === 'Service' && !log.wearcheck_completed) return 'wearcheck waiting';
        if (log.status === 'completed' && log.manager_approved && log.downloaded) return 'completed';
        if (log.manager_approved) return 'approved';
        return 'pending';
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';

        try {
            let date;

            // Convert to Date object
            if (dateValue instanceof Date) {
                date = dateValue;
            } else if (typeof dateValue === 'string') {
                date = new Date(dateValue);
            } else {
                date = new Date(dateValue);
            }

            // Check if valid date
            if (isNaN(date.getTime())) {
                return 'N/A';
            }

            // Format using local timezone (not UTC)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Date parsing error:', e, dateValue);
            return 'N/A';
        }
    };

    const formatKilosHours = (log) => {
        const value = log.kilos_hours_value ?? log.kilos_hours; // fallback for old rows
        if (!value && value !== 0) return 'N/A';
        const unit = log.kilos_hours_unit || 'hours';
        return unit === 'hours' ? `${value}h` : `${value} km`;
    };
    const getJobTypes = (log) => {
        if (!log) return [];
        if (Array.isArray(log.job_types)) return log.job_types;
        if (typeof log.job_types === 'string') {
            try {
                return JSON.parse(log.job_types);
            } catch {
                return log.job_type ? [log.job_type] : [];
            }
        }
        return log.job_type ? [log.job_type] : [];
    };


    const getFilteredLogs = () => {
        if (!Array.isArray(logs) || logs.length === 0) {
            return [];
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        console.log('Current filter:', filter);
        console.log('Today\'s date:', today);
        console.log('Total logs:', logs.length);

        switch (filter) {
            case 'daily': {
                const filtered = logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    const matches = logDate === today;
                    console.log(`Log date: ${logDate}, Today: ${today}, Matches: ${matches}`);
                    return matches;
                });
                console.log('Daily filtered results:', filtered.length);
                return filtered;
            }
            case 'weekly': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekYear = weekAgo.getFullYear();
                const weekMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
                const weekDay = String(weekAgo.getDate()).padStart(2, '0');
                const weekAgoStr = `${weekYear}-${weekMonth}-${weekDay}`;

                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= weekAgoStr && logDate <= today;
                });
            }
            case 'monthly': {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const monthYear = monthAgo.getFullYear();
                const monthMonth = String(monthAgo.getMonth() + 1).padStart(2, '0');
                const monthDay = String(monthAgo.getDate()).padStart(2, '0');
                const monthAgoStr = `${monthYear}-${monthMonth}-${monthDay}`;

                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= monthAgoStr && logDate <= today;
                });
            }
            case 'yearly': {
                const yearAgo = new Date(now);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                const yearYear = yearAgo.getFullYear();
                const yearMonth = String(yearAgo.getMonth() + 1).padStart(2, '0');
                const yearDay = String(yearAgo.getDate()).padStart(2, '0');
                const yearAgoStr = `${yearYear}-${yearMonth}-${yearDay}`;

                return logs.filter((log) => {
                    const logDate = formatDate(log.date);
                    return logDate >= yearAgoStr && logDate <= today;
                });
            }
            default:
                return logs;
        }
    };

    const getSearchFilteredLogs = () => {
        const base = getFilteredLogs(); // your existing time-range filter (daily/weekly/etc.)
        const search = searchTerm.trim().toLowerCase();

        return base.filter(log => {
            // status filter
            const wordStatus = computeStatusWord(log);
            if (statusFilter !== 'all' && wordStatus !== statusFilter) return false;

            // job type filter (supports multiple)
            if (typeFilter !== 'all') {
                const types = getJobTypes(log);
                if (!types.includes(typeFilter)) return false;
            }

            // site filter
            if (siteFilter !== 'all' && log.site_name !== siteFilter) return false;

            // search across fields
            if (!search) return true;
            const mechanic = users.find(u => u.id === log.user_id)?.name || '';
            const types = getJobTypes(log);

            const haystack = [
                log.jobcard_number,
                log.plant_number,
                log.site_name,
                mechanic,
                log.job_type,
                ...(types || []),
                log.sample_number
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(search);
        });
    };



    const parseArray = (data) => {
        try {
            if (typeof data === 'string') return JSON.parse(data);
            if (Array.isArray(data)) return data;
            return [];
        } catch {
            return [];
        }
    };

    const formatIssuesForDisplay = (log) => {
        const breakdown = parseArray(log.breakdown_issues_array);
        const maintenance = parseArray(log.maintenance_issues_array);
        const tyres = parseArray(log.tyres_array);

        const parts = [];

        if (breakdown.length > 0) {
            parts.push(breakdown.map(b => b.detail ? `${b.issue} (${b.detail})` : b.issue).join(', '));
        }
        if (maintenance.length > 0) {
            parts.push(maintenance.map(m => {
                if (m.detail) return `${m.issue} (${m.detail})`;
                if (m.battery_position) return `${m.issue} (${m.battery_position})`;
                return m.issue;
            }).join(', '));
        }
        if (tyres.length > 0) {
            parts.push(tyres.map(t => {
                let str = `Tyre ${t.tyre_number} (${t.action}`;
                if (t.brand) str += ` - ${t.brand}`;
                str += ')';
                return str;
            }).join(', '));
        }
        if (log.service_interval) {
            let serviceStr = log.service_interval;
            if (log.sample_number) serviceStr += ` [${log.sample_number}]`;
            parts.push(serviceStr);
        }
        if (log.other_description) {
            parts.push(log.other_description.substring(0, 50) + '...');
        }

        return parts.join(' | ') || 'N/A';
    };


    const approveJobCard = async (jobCardId) => {
        const { error } = await query`
    UPDATE work_logs SET manager_approved = ${true} WHERE id = ${jobCardId}
  `;
        if (error) {
            alert('Error approving job card');
            return;
        }
        // Update local state instead of fetchData()
        setLogs(prev =>
            prev.map(l => l.id === jobCardId ? { ...l, manager_approved: true } : l)
        );
    };


    const downloadIndividualJobCardPDF = async (log) => {
        const doc = new jsPDF();
        const worker = users.find((u) => u.id === log.user_id);
        const equipmentInfo = equipment.find((eq) => eq.plant_number === log.plant_number);
        const types = getJobTypes(log);

        // Header
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('JODAN CONSTRUCTION', 105, 20, { align: 'center' });

        doc.setFontSize(18);
        doc.text('JOB CARD', 105, 28, { align: 'center' });

        doc.setFontSize(12);
        doc.setFillColor(31, 78, 120);
        doc.rect(150, 35, 50, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(log.jobcard_number, 175, 42, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        let yPos = 55;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('BASIC INFORMATION', 14, yPos);
        yPos += 8;

        doc.setFont(undefined, 'normal');
        const basicInfo = [
            ['Date:', formatDate(log.date)],
            ['Site:', log.site_name],
            ['Plant:', `${log.plant_number} ${equipmentInfo ? `(${equipmentInfo.equipment_type})` : ''}`],
            ['Kilos/Hours:', formatKilosHours(log)],
            ['Job Types:', (types.length ? types.join(', ') : log.job_type || 'N/A')],
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

        const breakdown = parseArray(log.breakdown_issues_array);
        const maintenance = parseArray(log.maintenance_issues_array);
        const tyres = parseArray(log.tyres_array);

        if (breakdown.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Breakdown Issues:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            breakdown.forEach((b, idx) => {
                const text = b.detail ? `${idx + 1}. ${b.issue} - ${b.detail}` : `${idx + 1}. ${b.issue}`;
                doc.text(text, 20, yPos);
                yPos += 6;
            });
            yPos += 3;
        }

        if (maintenance.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Maintenance Issues:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            maintenance.forEach((m, idx) => {
                let text = `${idx + 1}. ${m.issue}`;
                if (m.detail) text += ` - ${m.detail}`;
                if (m.battery_position) text += ` (${m.battery_position})`;
                doc.text(text, 20, yPos);
                yPos += 6;
            });
            yPos += 3;
        }

        if (tyres.length > 0) {
            // Check if we need a new page
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFont(undefined, 'bold');
            doc.text('Tyres:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            tyres.forEach((t, idx) => {
                let text = `${idx + 1}. Tyre #${t.tyre_number} - ${t.action}`;
                if (t.brand) text += ` (${t.brand})`;
                if (t.serial_number) text += ` SN: ${t.serial_number}`;
                if (t.swap_from) text += ` from ${t.swap_from}`;

                // Handle long text wrapping
                const splitText = doc.splitTextToSize(text, 170);
                splitText.forEach(line => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
            });
            yPos += 3;
        }

        if (log.service_interval) {
            doc.setFont(undefined, 'bold');
            doc.text('Service:', 14, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(log.service_interval, 60, yPos);
            yPos += 7;
        }

        if (log.other_description) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFont(undefined, 'bold');
            doc.text('Other Work:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            const splitText = doc.splitTextToSize(log.other_description, 180);
            splitText.forEach(line => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, 20, yPos);
                yPos += 6;
            });
            yPos += 3;
        }

        // Time & Resources
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('TIME & RESOURCES', 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.text(`Time: ${log.time_started || 'N/A'} - ${log.time_ended || 'N/A'} (${log.duration || 'N/A'}h)`, 14, yPos);
        yPos += 7;

        if (log.delay_reason) {
            doc.setFont(undefined, 'bold');
            doc.text('Delay Reason:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            const splitDelay = doc.splitTextToSize(log.delay_reason, 180);
            splitDelay.forEach(line => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, 14, yPos);
                yPos += 6;
            });
            yPos += 3;
        }

        const fluids = parseArray(log.fluids_used);
        if (fluids.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            yPos += 3;
            doc.setFont(undefined, 'bold');
            doc.text('Fluids Used:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            fluids.forEach(f => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`• ${f.type}: ${f.quantity}L`, 20, yPos);
                yPos += 6;
            });
            yPos += 3;
        }

        // WearCheck Information (for Service jobs)
        if (types.includes('Service')) {
            if (yPos > 210) {
                doc.addPage();
                yPos = 20;
            }

            yPos += 5;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(31, 78, 120);
            doc.rect(14, yPos - 3, 180, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text('WEARCHECK INFORMATION', 16, yPos + 3);
            doc.setTextColor(0, 0, 0);
            yPos += 12;

            doc.setFont(undefined, 'normal');
            const wearcheckInfo = [
                ['Sample #:', log.sample_number || 'N/A'],
                ['Date Received:', formatDate(log.date_received) || 'Not set'],
                ['Date Submitted:', formatDate(log.date_submitted) || 'Not set'],
                ['Date Reported:', formatDate(log.date_reported) || 'Not set'],
                ['Status:', log.wearcheck_status || 'Not set'],
                ['Completed:', log.wearcheck_completed ? 'Yes' : 'No']
            ];

            wearcheckInfo.forEach(([label, value]) => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFont(undefined, 'bold');
                doc.text(label, 14, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(value, 70, yPos);
                yPos += 7;
            });
            yPos += 3;
        }

        if (log.work_to_plan) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            yPos += 5;
            doc.setFont(undefined, 'bold');
            doc.text('Work to Plan:', 14, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            const splitWork = doc.splitTextToSize(log.work_to_plan, 180);
            splitWork.forEach(line => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, 14, yPos);
                yPos += 6;
            });
        }

        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${totalPages}`, 105, 290, { align: 'center' });
            doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
        }

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
        const filteredLogs = getSearchFilteredLogs();


        const excelData = filteredLogs.map((log) => {
            const worker = users.find((u) => u.id === log.user_id);
            const breakdown = parseArray(log.breakdown_issues_array);
            const maintenance = parseArray(log.maintenance_issues_array);
            const tyres = parseArray(log.tyres_array);
            const fluids = parseArray(log.fluids_used);
            const types = getJobTypes(log);

            return {
                'Job Card #': log.jobcard_number,
                'Date': formatDate(log.date),
                'Site': log.site_name,
                'Plant': log.plant_number,
                'Kilos/Hours': log.kilos_hours_value ?? log.kilos_hours,
                'Kilos/Hours Unit': log.kilos_hours_unit || 'hours',
                'Job Types': types.join(', '),
                'Job Type (primary)': types[0] || log.job_type || '',
                'Breakdown Issues': breakdown.map(b => b.detail ? `${b.issue} (${b.detail})` : b.issue).join('; '),
                'Maintenance Issues': maintenance.map(m => {
                    if (m.detail) return `${m.issue} (${m.detail})`;
                    if (m.battery_position) return `${m.issue} (${m.battery_position})`;
                    return m.issue;
                }).join('; '),
                'Tyres': tyres.map(t => `#${t.tyre_number} ${t.action}`).join('; '),
                'Service': log.service_interval || '',
                'Other': log.other_description || '',
                'Mechanic': worker?.name || 'Unknown',
                'Time Started': log.time_started || '',
                'Time Ended': log.time_ended || '',
                'Duration (hrs)': log.duration || '',
                'Delay': log.delay_reason || '',
                'Fluids': fluids.map(f => `${f.type}: ${f.quantity}L`).join('; '),
                'Work to Plan': log.work_to_plan || '',
                'Status': log.status,
                'Approved': log.manager_approved ? 'Yes' : 'No',
                'Downloaded': log.downloaded ? 'Yes' : 'No'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const columnWidths = [
            { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 15 },
            { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 25 }, { wch: 40 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Cards');

        const fileName = `JODAN_JobCards_${filter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };
    const filteredLogs = getSearchFilteredLogs();
    const selectedTypes = selectedJobCard ? getJobTypes(selectedJobCard) : [];

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
                        <div className="header-content">
                            <div>
                                <h2>🏗️ JODAN Construction - Admin Dashboard</h2>
                                <p>Job Card Management & Fleet Monitoring</p>
                            </div>
                            <button
                                onClick={() => window.location.href = '/manage-dropdowns'}
                                className="btn-manage-dropdowns"
                            >
                                ⚙️ Manage Options
                            </button>
                        </div>
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
                                <p>Pending</p>
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

                    {/* Filters */}
                    <div className="filter-section">
                        <div className="filter-buttons">
                            {['all', 'daily', 'weekly', 'monthly', 'yearly'].map(f => (
                                <button
                                    key={f}
                                    className={filter === f ? 'active' : ''}
                                    onClick={() => setFilter(f)}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="search-export-group">
                            <button onClick={exportToExcel} className="btn-export-excel">
                                📊 Export Excel
                            </button>
                        </div>
                    </div>


                    {/* Charts */}
                    <SummaryCharts logs={filteredLogs} users={users} equipment={equipment} filter={filter} />
                    {/* Search & Filters */}
                    <div className="filter-section" style={{ marginTop: 16, marginBottom: 8 }}>
                        <div className="search-export-group" style={{ width: '100%' }}>
                            <div className="search-container">
                                <input
                                    type="text"
                                    placeholder="🔍 Search by job card, plant #, site, mechanic, sample #"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="btn-clear-search"
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="filter-select"
                                    aria-label="Status filter"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="wearcheck waiting">WearCheck waiting</option>
                                    <option value="completed">Completed</option>
                                </select>

                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="filter-select"
                                    aria-label="Type filter"
                                >
                                    <option value="all">All Types</option>
                                    <option value="Breakdown">Breakdown</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Service">Service</option>
                                    <option value="Tyres">Tyres</option>
                                    <option value="Other">Other</option>
                                </select>

                                <select
                                    value={siteFilter}
                                    onChange={(e) => setSiteFilter(e.target.value)}
                                    className="filter-select"
                                    aria-label="Site filter"
                                >
                                    <option value="all">All Sites</option>
                                    {[...new Set(logs.map(l => l.site_name).filter(Boolean))].map(site => (
                                        <option key={site} value={site}>{site}</option>
                                    ))}
                                </select>

                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('all');
                                        setTypeFilter('all');
                                        setSiteFilter('all');
                                    }}
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Job Cards Table */}
                    <div className="logs-section">
                        <h3>📋 Job Cards ({filteredLogs.length})</h3>
                        <div className="table-responsive">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Job Card #</th>
                                        <th>Date</th>
                                        <th className="hide-mobile">Site</th>
                                        <th>Plant</th>
                                        <th className="hide-mobile">Type</th>
                                        <th className="hide-tablet">Details</th>
                                        <th className="hide-mobile">Mechanic</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="no-data">No job cards found</td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const worker = users.find((u) => u.id === log.user_id);
                                            const types = getJobTypes(log);

                                            return (
                                                <tr key={log.id}>
                                                    <td>
                                                        <strong
                                                            className="jobcard-link"
                                                            onClick={() => setSelectedJobCard(log)}
                                                        >
                                                            {log.jobcard_number}
                                                        </strong>
                                                    </td>
                                                    <td>{formatDate(log.date)}</td>
                                                    <td className="hide-mobile">{log.site_name}</td>
                                                    <td><strong>{log.plant_number}</strong></td>
                                                    <td className="hide-mobile">
                                                        {types.length === 0 ? (
                                                            <span className={`type-badge ${log.job_type.toLowerCase()}`}>
                                                                {log.job_type}
                                                            </span>
                                                        ) : (
                                                            types.map(t => (
                                                                <span key={t} className={`type-badge ${t.toLowerCase()}`}>
                                                                    {t}
                                                                </span>
                                                            ))
                                                        )}
                                                    </td>
                                                    <td className="hide-tablet details-cell">
                                                        {formatIssuesForDisplay(log)}
                                                        {types.includes('Service') && (
                                                            <div className="wearcheck-indicator">
                                                                {log.wearcheck_completed ? (
                                                                    <span className="wearcheck-badge completed">✓ WearCheck Done</span>
                                                                ) : (
                                                                    <span className="wearcheck-badge pending">⏳ WearCheck Pending</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="hide-mobile">{worker?.name || 'Unknown'}</td>
                                                    <td><strong>{log.duration ? log.duration + 'h' : 'N/A'}</strong></td>
                                                    <td>
                                                        <span className={`status-badge ${computeStatusWord(log).replace(' ', '-')}`}>
                                                            {computeStatusWord(log)}
                                                        </span>
                                                    </td>
                                                    <td className="action-buttons">
                                                        {!log.manager_approved && (
                                                            <button
                                                                className="btn-action btn-approve"
                                                                onClick={() => approveJobCard(log.id)}
                                                                title="Approve"
                                                            >
                                                                ✓
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn-action btn-download"
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

                    {/* Fleet Overview */}
                    <div className="fleet-section">
                        <h3>🚜 Fleet Status</h3>
                        <div className="fleet-grid">
                            {equipment.map((plant) => {
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
                                                <span className="label">Hours:</span>
                                                <span className="value">{plant.current_kilos_hours}h</span>
                                            </div>
                                            <div className="fleet-stat">
                                                <span className="label">Jobs:</span>
                                                <span className="value">{recentJobs}</span>
                                            </div>
                                        </div>
                                        {lastJob && (
                                            <p className="fleet-last-service">
                                                Last: {formatDate(lastJob.date)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
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
                                <strong>Kilos/Hours:</strong> {formatKilosHours(selectedJobCard)}
                            </div>

                            <div className="detail-row">
                                <strong>Job Types:</strong> {selectedTypes.join(', ')}
                            </div>

                            <div className="detail-row">
                                <strong>Mechanic:</strong> {users.find(u => u.id === selectedJobCard.user_id)?.name}
                            </div>

                            {parseArray(selectedJobCard.breakdown_issues_array).length > 0 && (
                                <div className="detail-section">
                                    <strong>Breakdown Issues:</strong>
                                    <ul className="issues-list">
                                        {parseArray(selectedJobCard.breakdown_issues_array).map((b, idx) => (
                                            <li key={idx}>{b.detail ? `${b.issue} - ${b.detail}` : b.issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {parseArray(selectedJobCard.maintenance_issues_array).length > 0 && (
                                <div className="detail-section">
                                    <strong>Maintenance Issues:</strong>
                                    <ul className="issues-list">
                                        {parseArray(selectedJobCard.maintenance_issues_array).map((m, idx) => (
                                            <li key={idx}>
                                                {m.issue}
                                                {m.detail && ` - ${m.detail}`}
                                                {m.battery_position && ` (${m.battery_position})`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {parseArray(selectedJobCard.tyres_array).length > 0 && (
                                <div className="detail-section">
                                    <strong>Tyres:</strong>
                                    <ul className="issues-list">
                                        {parseArray(selectedJobCard.tyres_array).map((t, idx) => (
                                            <li key={idx}>
                                                Tyre #{t.tyre_number} - {t.action}
                                                {t.brand && <strong> ({t.brand})</strong>}
                                                {t.serial_number && ` (SN: ${t.serial_number})`}
                                                {t.swap_from && ` from ${t.swap_from}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedJobCard.service_interval && (
                                <div className="detail-row">
                                    <strong>Service:</strong> {selectedJobCard.service_interval}
                                </div>
                            )}

                            {selectedTypes.includes('Service') && (
                                <div className="detail-section wearcheck-section">
                                    <strong>🔬 WearCheck Information:</strong>
                                    <div className="wearcheck-details">
                                        <p><strong>Sample #:</strong> {selectedJobCard.sample_number || 'N/A'}</p>
                                        <p><strong>Date Received:</strong> {formatDate(selectedJobCard.date_received) || 'Not set'}</p>
                                        <p><strong>Date Submitted:</strong> {formatDate(selectedJobCard.date_submitted) || 'Not set'}</p>
                                        <p><strong>Date Reported:</strong> {formatDate(selectedJobCard.date_reported) || 'Not set'}</p>
                                        <p>
                                            <strong>Status:</strong> {selectedJobCard.wearcheck_status ? (
                                                <span className={`status-badge ${selectedJobCard.wearcheck_status.toLowerCase()}`}>
                                                    {selectedJobCard.wearcheck_status}
                                                </span>
                                            ) : 'Not set'}
                                        </p>
                                        <p><strong>Completed:</strong> {selectedJobCard.wearcheck_completed ? '✅ Yes' : '⏳ Pending'}</p>
                                    </div>
                                </div>
                            )}

                            {selectedJobCard.other_description && (
                                <div className="detail-section">
                                    <strong>Other Work:</strong>
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
                                <strong>Time:</strong> {selectedJobCard.time_started} - {selectedJobCard.time_ended} ({selectedJobCard.duration}h)
                            </div>

                            {selectedJobCard.delay_reason && (
                                <div className="detail-section alert">
                                    <strong>⚠️ Delay:</strong>
                                    <p>{selectedJobCard.delay_reason}</p>
                                </div>
                            )}

                            {parseArray(selectedJobCard.fluids_used).length > 0 && (
                                <div className="detail-section">
                                    <strong>Fluids Used:</strong>
                                    <ul className="issues-list">
                                        {parseArray(selectedJobCard.fluids_used).map((f, idx) => (
                                            <li key={idx}>{f.type}: {f.quantity} litres</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="detail-row">
                                <strong>Status:</strong>
                                <span className={`status-badge ${selectedJobCard.job_type === 'Service' && !selectedJobCard.wearcheck_completed
                                        ? 'pending'
                                        : selectedJobCard.status === 'completed' && selectedJobCard.manager_approved && selectedJobCard.downloaded
                                            ? 'completed'
                                            : selectedJobCard.manager_approved
                                                ? 'approved'
                                                : 'pending'
                                    }`}>
                                    {selectedJobCard.job_type === 'Service' && !selectedJobCard.wearcheck_completed
                                        ? '⏳ Awaiting WearCheck'
                                        : selectedJobCard.status === 'completed' && selectedJobCard.manager_approved && selectedJobCard.downloaded
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
                                    Approve
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

import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = ['#1F4E78', '#2C6A9F', '#4A90E2', '#5B7C99', '#3498DB', '#2ECC71', '#F39C12', '#E74C3C'];

export default function SummaryCharts({ logs, users, filter }) {

    // Helper function to parse equipment data
    const parseEquipment = (equipmentData) => {
        try {
            if (typeof equipmentData === 'string') {
                const parsed = JSON.parse(equipmentData);
                return Array.isArray(parsed) ? parsed : [equipmentData];
            }
            if (Array.isArray(equipmentData)) {
                return equipmentData;
            }
            return [String(equipmentData)];
        } catch {
            return [String(equipmentData)];
        }
    };

    // Group logs by date for time series
    const groupByDate = () => {
        const grouped = {};
        logs.forEach((log) => {
            const date = log.date;
            if (!grouped[date]) {
                grouped[date] = 0;
            }
            grouped[date] += Number(log.hours_worked);
        });
        return Object.entries(grouped)
            .map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(1)) }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-30); // Show last 30 days
    };

    // Group hours by worker
    const groupByWorker = () => {
        return users
            .filter((user) => !user.is_admin)
            .map((user) => ({
                name: user.name.split(' ')[0], // First name only for cleaner display
                hours: parseFloat(
                    logs
                        .filter((log) => log.user_id === user.id)
                        .reduce((sum, log) => sum + Number(log.hours_worked), 0)
                        .toFixed(1)
                )
            }))
            .filter((worker) => worker.hours > 0)
            .sort((a, b) => b.hours - a.hours);
    };

    // Count equipment usage
    const getEquipmentStats = () => {
        const equipmentMap = {};

        logs.forEach((log) => {
            const equipment = parseEquipment(log.equipment_used);
            equipment.forEach((item) => {
                if (item && item.trim()) {
                    const cleanItem = item.trim();
                    equipmentMap[cleanItem] = (equipmentMap[cleanItem] || 0) + 1;
                }
            });
        });

        return Object.entries(equipmentMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 equipment
    };

    // Get daily average hours
    const getDailyAverages = () => {
        const dailyData = {};

        logs.forEach((log) => {
            const date = log.date;
            if (!dailyData[date]) {
                dailyData[date] = { total: 0, count: 0 };
            }
            dailyData[date].total += Number(log.hours_worked);
            dailyData[date].count += 1;
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({
                date,
                average: parseFloat((data.total / data.count).toFixed(1)),
                total: parseFloat(data.total.toFixed(1))
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-14); // Last 14 days
    };

    const timeSeriesData = groupByDate();
    const workerData = groupByWorker();
    const equipmentData = getEquipmentStats();
    const dailyAverages = getDailyAverages();

    return (
        <div className="charts-container">
            {/* Hours Worked Over Time */}
            <div className="chart-card">
                <h3>📊 Hours Worked Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #E1E8ED',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="#1F4E78"
                            strokeWidth={3}
                            dot={{ fill: '#1F4E78', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Hours Worked"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Hours by Worker */}
            <div className="chart-card">
                <h3>👷 Total Hours by Worker</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workerData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #E1E8ED',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="hours"
                            fill="#2C6A9F"
                            name="Hours Worked"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Equipment Usage Distribution */}
            <div className="chart-card">
                <h3>🔧 Top 10 Equipment Usage</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={equipmentData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#7F8C8D" />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            width={120}
                            stroke="#7F8C8D"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #E1E8ED',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="count"
                            fill="#4A90E2"
                            name="Times Used"
                            radius={[0, 8, 8, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Worker Distribution Pie Chart */}
            <div className="chart-card">
                <h3>📈 Worker Hours Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={workerData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="hours"
                        >
                            {workerData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #E1E8ED',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => `${value}h`}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Daily Averages */}
            {dailyAverages.length > 0 && (
                <div className="chart-card chart-card-wide">
                    <h3>📅 Daily Average vs Total Hours (Last 14 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyAverages}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                stroke="#7F8C8D"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#7F8C8D"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #E1E8ED',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#1F4E78"
                                strokeWidth={2}
                                name="Total Hours"
                                dot={{ fill: '#1F4E78', r: 3 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="average"
                                stroke="#2ECC71"
                                strokeWidth={2}
                                name="Average Hours"
                                dot={{ fill: '#2ECC71', r: 3 }}
                                strokeDasharray="5 5"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Equipment Usage Pie Chart */}
            {equipmentData.length > 0 && (
                <div className="chart-card">
                    <h3>🛠️ Equipment Usage Share</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={equipmentData.slice(0, 8)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {equipmentData.slice(0, 8).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #E1E8ED',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => `${value} times`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

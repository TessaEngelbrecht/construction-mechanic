//import React from 'react';
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

//const COLORS = ['#1F4E78', '#2C6A9F', '#4A90E2', '#5B7C99', '#3498DB', '#2ECC71', '#F39C12', '#E74C3C'];

export default function SummaryCharts({ logs, users, equipment, filter }) {

    // Hours by Date
    const getHoursByDate = () => {
        const grouped = {};
        logs.forEach((log) => {
            const date = log.date;
            if (!grouped[date]) {
                grouped[date] = 0;
            }
            grouped[date] += Number(log.duration) || 0;
        });
        return Object.entries(grouped)
            .map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(1)) }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-30);
    };

    // Hours by Mechanic
    const getHoursByMechanic = () => {
        return users
            .filter((user) => !user.is_admin)
            .map((user) => ({
                name: user.name.split(' ')[0],
                hours: parseFloat(
                    logs
                        .filter((log) => log.user_id === user.id)
                        .reduce((sum, log) => sum + (Number(log.duration) || 0), 0)
                        .toFixed(1)
                )
            }))
            .filter((mechanic) => mechanic.hours > 0)
            .sort((a, b) => b.hours - a.hours);
    };

    // Job Type Distribution
    const getJobTypeDistribution = () => {
        const types = {};
        logs.forEach((log) => {
            const type = log.job_type || 'Unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    };

    // Plant Utilization
    const getPlantUtilization = () => {
        return equipment.map((plant) => {
            const jobCount = logs.filter(log => log.plant_number === plant.plant_number).length;
            const totalHours = logs
                .filter(log => log.plant_number === plant.plant_number)
                .reduce((sum, log) => sum + (Number(log.duration) || 0), 0);

            return {
                plant: plant.plant_number,
                jobs: jobCount,
                hours: parseFloat(totalHours.toFixed(1))
            };
        }).filter(p => p.jobs > 0).sort((a, b) => b.hours - a.hours);
    };

    // Breakdown vs Maintenance
    const getBreakdownVsMaintenance = () => {
        const breakdown = logs.filter(log => log.job_type === 'Breakdown').length;
        const maintenance = logs.filter(log => log.job_type === 'Maintenance').length;
        const service = logs.filter(log => log.job_type === 'Service').length;
        const repair = logs.filter(log => log.job_type === 'Repair').length;

        return [
            { name: 'Breakdowns', value: breakdown, color: '#E74C3C' },
            { name: 'Maintenance', value: maintenance, color: '#2ECC71' },
            { name: 'Service', value: service, color: '#3498DB' },
            { name: 'Repair', value: repair, color: '#F39C12' }
        ].filter(item => item.value > 0);
    };

    // Most Common Fluids Used
    const getFluidUsage = () => {
        const fluidsMap = {};

        logs.forEach((log) => {
            try {
                const fluids = typeof log.fluids_used === 'string'
                    ? JSON.parse(log.fluids_used)
                    : log.fluids_used || [];

                if (Array.isArray(fluids)) {
                    fluids.forEach((fluid) => {
                        if (fluid.type) {
                            const key = fluid.type;
                            if (!fluidsMap[key]) {
                                fluidsMap[key] = 0;
                            }
                            fluidsMap[key] += parseFloat(fluid.quantity) || 0;
                        }
                    });
                }
            } catch (e) {
                // Skip invalid data
            }
        });

        return Object.entries(fluidsMap)
            .map(([name, quantity]) => ({
                name: name.replace('Oil', '').trim(),
                quantity: parseFloat(quantity.toFixed(1))
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 6);
    };

    const hoursByDate = getHoursByDate();
    const hoursByMechanic = getHoursByMechanic();
    //const jobTypeDistribution = getJobTypeDistribution();
    const plantUtilization = getPlantUtilization();
    const breakdownVsMaintenance = getBreakdownVsMaintenance();
    const fluidUsage = getFluidUsage();

    return (
        <div className="charts-container">
            {/* Hours Over Time */}
            <div className="chart-card chart-card-wide">
                <h3>📊 Work Hours Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={hoursByDate}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                            label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
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

            {/* Hours by Mechanic */}
            <div className="chart-card">
                <h3>👷 Hours by Mechanic</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursByMechanic}>
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
                            name="Hours"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Job Type Distribution */}
            <div className="chart-card">
                <h3>📋 Job Type Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={breakdownVsMaintenance}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100}
                            dataKey="value"
                        >
                            {breakdownVsMaintenance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Plant Utilization */}
            <div className="chart-card">
                <h3>🚜 Plant Utilization (Hours)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={plantUtilization} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#7F8C8D" />
                        <YAxis
                            type="category"
                            dataKey="plant"
                            tick={{ fontSize: 11 }}
                            width={60}
                            stroke="#7F8C8D"
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                            dataKey="hours"
                            fill="#4A90E2"
                            name="Hours"
                            radius={[0, 8, 8, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Fluid Usage */}
            {fluidUsage.length > 0 && (
                <div className="chart-card">
                    <h3>🛢️ Fluid/Oil Usage (Litres)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={fluidUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                stroke="#7F8C8D"
                                angle={-15}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#7F8C8D"
                            />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="quantity"
                                fill="#F39C12"
                                name="Litres Used"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Plant Job Count */}
            <div className="chart-card">
                <h3>🔧 Jobs per Plant</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={plantUtilization}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E8ED" />
                        <XAxis
                            dataKey="plant"
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#7F8C8D"
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                            dataKey="jobs"
                            fill="#2ECC71"
                            name="Job Count"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

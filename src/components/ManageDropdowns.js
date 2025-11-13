import React, { useState, useEffect } from 'react';
import { query } from '../utils/neonClient';
import Navbar from './Navbar';
import './ManageDropdowns.css';

export default function ManageDropdowns() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('sites');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // State for each dropdown type
    const [sites, setSites] = useState([]);
    const [breakdownIssues, setBreakdownIssues] = useState([]);
    const [maintenanceIssues, setMaintenanceIssues] = useState([]);
    const [serviceIntervals, setServiceIntervals] = useState([]);
    const [brakeDetails, setBrakeDetails] = useState([]);
    const [batteryPositions, setBatteryPositions] = useState([]);
    const [tyreActions, setTyreActions] = useState([]);
    const [tyreBrands, setTyreBrands] = useState([]);
    const [fluidTypes, setFluidTypes] = useState([]);

    // Edit mode states
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    // Add new item states
    const [newItemName, setNewItemName] = useState('');
    const [newItemOrder, setNewItemOrder] = useState('');
    const [newItemRequiresFluids, setNewItemRequiresFluids] = useState(false);
    const [equipmentList, setEquipmentList] = useState([]);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        if (!userData || !userData.is_admin) {
            window.location.href = '/login';
            return;
        }
        setUser(userData);
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);

        const { data: sitesData } = await query`SELECT * FROM sites ORDER BY site_name`;
        setSites(sitesData || []);

        const { data: breakdownData } = await query`SELECT * FROM breakdown_issues ORDER BY issue_name`;
        setBreakdownIssues(breakdownData || []);

        const { data: maintenanceData } = await query`SELECT * FROM maintenance_issues ORDER BY issue_name`;
        setMaintenanceIssues(maintenanceData || []);

        const { data: serviceData } = await query`SELECT * FROM service_intervals ORDER BY interval_name`;
        setServiceIntervals(serviceData || []);

        const { data: brakeData } = await query`SELECT * FROM brake_details ORDER BY display_order`;
        setBrakeDetails(brakeData || []);

        const { data: batteryData } = await query`SELECT * FROM battery_positions ORDER BY position_name`;
        setBatteryPositions(batteryData || []);

        const { data: tyreData } = await query`SELECT * FROM tyre_actions ORDER BY action_name`;
        setTyreActions(tyreData || []);

        const { data: fluidData } = await query`SELECT * FROM fluid_types ORDER BY fluid_name`;
        setFluidTypes(fluidData || []);

        const { data: tyreBrandData } = await query`SELECT * FROM tyre_brands ORDER BY brand_name`;
        setTyreBrands(tyreBrandData || []);

        const { data: equipmentData } = await query`SELECT * FROM equipment ORDER BY plant_number`;
        setEquipmentList(equipmentData || []);


        setLoading(false);
    };

    const showMessage = (msg, isSuccess = true) => {
        setMessage(isSuccess ? `✅ ${msg}` : `❌ ${msg}`);
        setTimeout(() => setMessage(''), 3000);
    };

    // Generic add function
    const handleAdd = async (table, nameColumn, additionalData = {}) => {
        if (!newItemName.trim()) {
            showMessage('Please enter a name', false);
            return;
        }

        setLoading(true);

        try {
            if (table === 'brake_details') {
                const order = parseInt(newItemOrder) || 999;
                const { error } = await query`
        INSERT INTO brake_details (position_name, display_order, active)
        VALUES (${newItemName}, ${order}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'breakdown_issues') {
                const { error } = await query`
        INSERT INTO breakdown_issues (issue_name, requires_fluids, active)
        VALUES (${newItemName}, ${newItemRequiresFluids}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'maintenance_issues') {
                const { error } = await query`
        INSERT INTO maintenance_issues (issue_name, requires_fluids, active)
        VALUES (${newItemName}, ${newItemRequiresFluids}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'sites') {
                const { error } = await query`
        INSERT INTO sites (site_name, active)
        VALUES (${newItemName}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'service_intervals') {
                const { error } = await query`
        INSERT INTO service_intervals (interval_name, active)
        VALUES (${newItemName}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'battery_positions') {
                const { error } = await query`
        INSERT INTO battery_positions (position_name, active)
        VALUES (${newItemName}, ${true})
      `;
                if (error) throw error;
            } else if (table === 'tyre_actions') {
                const { error } = await query`
        INSERT INTO tyre_actions (action_name, active)
        VALUES (${newItemName}, ${true})
      `;
            } else if (table === 'tyre_brands') {
                const { error } = await query`
    INSERT INTO tyre_brands (brand_name, active)
    VALUES (${newItemName}, ${true})
  `;
                if (error) showMessage('Error adding brand', false);
                else showMessage('Tyre brand added!');

                if (error) throw error;
            } else if (table === 'fluid_types') {
                const { error } = await query`
        INSERT INTO fluid_types (fluid_name, active)
        VALUES (${newItemName}, ${true})
      `;
                if (error) throw error;
            }

            showMessage('Item added successfully!');
            setNewItemName('');
            setNewItemOrder('');
            setNewItemRequiresFluids(false);
            fetchAllData();
        } catch (error) {
            console.error('Add error:', error);
            showMessage('Error adding item', false);
        }

        setLoading(false);
    };

    // Generic update function
    const handleUpdate = async (table, id, nameColumn, newValue) => {
        if (!newValue.trim()) {
            showMessage('Name cannot be empty', false);
            return;
        }

        setLoading(true);

        try {
            if (table === 'sites') {
                const { error } = await query`UPDATE sites SET site_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'breakdown_issues') {
                const { error } = await query`UPDATE breakdown_issues SET issue_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'maintenance_issues') {
                const { error } = await query`UPDATE maintenance_issues SET issue_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'service_intervals') {
                const { error } = await query`UPDATE service_intervals SET interval_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'brake_details') {
                const { error } = await query`UPDATE brake_details SET position_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'battery_positions') {
                const { error } = await query`UPDATE battery_positions SET position_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'tyre_actions') {
                const { error } = await query`UPDATE tyre_actions SET action_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'fluid_types') {
                const { error } = await query`UPDATE fluid_types SET fluid_name = ${newValue} WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'tyre_brands') {
                const { error } = await query`UPDATE tyre_brands SET brand_name = ${newValue} WHERE id = ${id}
  `;
            if (error) showMessage('Error updating brand', false);
            else showMessage('Tyre brand updated!');
        }

            showMessage('Item updated successfully!');
            setEditingId(null);
            setEditingValue('');
            fetchAllData();
        } catch (error) {
            console.error('Update error:', error);
            showMessage('Error updating item', false);
        }

        setLoading(false);
    };


    // Generic delete function
    const handleDelete = async (table, id, itemName) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${itemName}"?`)) {
            return;
        }

        setLoading(true);

        try {
            if (table === 'sites') {
                const { error } = await query`DELETE FROM sites WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'breakdown_issues') {
                const { error } = await query`DELETE FROM breakdown_issues WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'maintenance_issues') {
                const { error } = await query`DELETE FROM maintenance_issues WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'service_intervals') {
                const { error } = await query`DELETE FROM service_intervals WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'brake_details') {
                const { error } = await query`DELETE FROM brake_details WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'battery_positions') {
                const { error } = await query`DELETE FROM battery_positions WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'tyre_actions') {
                const { error } = await query`DELETE FROM tyre_actions WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'fluid_types') {
                const { error } = await query`DELETE FROM fluid_types WHERE id = ${id}`;
                if (error) throw error;
            } else if (table === 'tyre_brands') {
                const { error } = await query`DELETE FROM tyre_brands WHERE id = ${id}`;
                if (error) showMessage('Error deleting brand (in use by logs?)', false);
                else showMessage('Tyre brand deleted!');
            }

            showMessage('Item deleted successfully!');
            fetchAllData();
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('Error deleting item. It may be in use by existing job cards.', false);
        }

        setLoading(false);
    };

    // Add these after the existing handleDelete function

    const handleAddEquipment = async () => {
        if (!newItemName.trim()) {
            showMessage('Please enter plant number', false);
            return;
        }

        setLoading(true);

        try {
            const equipmentType = prompt('Enter equipment type (e.g., Dump Truck):');
            const makeModel = prompt('Enter make/model (e.g., Volvo A40G):');
            const kilosHours = parseInt(prompt('Enter current kilos/hours:') || '0');

            if (!equipmentType || !makeModel) {
                showMessage('Equipment type and make/model are required', false);
                setLoading(false);
                return;
            }

            const { error } = await query`
      INSERT INTO equipment (plant_number, equipment_type, make_model, status, current_kilos_hours)
      VALUES (${newItemName}, ${equipmentType}, ${makeModel}, ${'operational'}, ${kilosHours})
    `;

            if (error) throw error;

            showMessage('Equipment added successfully!');
            setNewItemName('');
            fetchAllData();
        } catch (error) {
            console.error('Add equipment error:', error);
            showMessage('Error adding equipment', false);
        }

        setLoading(false);
    };

    const handleUpdateEquipment = async (id, field, value) => {
        setLoading(true);

        try {
            if (field === 'plant_number') {
                const { error } = await query`UPDATE equipment SET plant_number = ${value} WHERE id = ${id}`;
                if (error) throw error;
            } else if (field === 'equipment_type') {
                const { error } = await query`UPDATE equipment SET equipment_type = ${value} WHERE id = ${id}`;
                if (error) throw error;
            } else if (field === 'make_model') {
                const { error } = await query`UPDATE equipment SET make_model = ${value} WHERE id = ${id}`;
                if (error) throw error;
            } else if (field === 'status') {
                const { error } = await query`UPDATE equipment SET status = ${value} WHERE id = ${id}`;
                if (error) throw error;
            } else if (field === 'current_kilos_hours') {
                const { error } = await query`UPDATE equipment SET current_kilos_hours = ${parseInt(value)} WHERE id = ${id}`;
                if (error) throw error;
            }

            showMessage('Equipment updated!');
            fetchAllData();
        } catch (error) {
            console.error('Update equipment error:', error);
            showMessage('Error updating equipment', false);
        }

        setLoading(false);
    };

    const handleDeleteEquipment = async (id, plantNumber) => {
        if (!window.confirm(`Delete equipment ${plantNumber}? This cannot be undone!`)) {
            return;
        }

        setLoading(true);

        try {
            const { error } = await query`DELETE FROM equipment WHERE id = ${id}`;
            if (error) throw error;

            showMessage('Equipment deleted!');
            fetchAllData();
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('Error: Equipment may be in use by job cards', false);
        }

        setLoading(false);
    };


    const startEdit = (id, currentValue) => {
        setEditingId(id);
        setEditingValue(currentValue);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingValue('');
    };

    const handleUpdateField = async (table, id, field, value) => {
        try {
            if (table === 'sites') {
                if (field === 'active') {
                    const { error } = await query`UPDATE sites SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'breakdown_issues') {
                if (field === 'requires_fluids') {
                    const { error } = await query`UPDATE breakdown_issues SET requires_fluids = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                } else if (field === 'active') {
                    const { error } = await query`UPDATE breakdown_issues SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'maintenance_issues') {
                if (field === 'requires_fluids') {
                    const { error } = await query`UPDATE maintenance_issues SET requires_fluids = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                } else if (field === 'active') {
                    const { error } = await query`UPDATE maintenance_issues SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'brake_details') {
                if (field === 'display_order') {
                    const { error } = await query`UPDATE brake_details SET display_order = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                } else if (field === 'active') {
                    const { error } = await query`UPDATE brake_details SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'service_intervals') {
                if (field === 'active') {
                    const { error } = await query`UPDATE service_intervals SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'battery_positions') {
                if (field === 'active') {
                    const { error } = await query`UPDATE battery_positions SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'tyre_actions') {
                if (field === 'active') {
                    const { error } = await query`UPDATE tyre_actions SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'fluid_types') {
                if (field === 'active') {
                    const { error } = await query`UPDATE fluid_types SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            } else if (table === 'tyre_brands') {
                if (field === 'active') {
                    const { error } = await query`UPDATE tyre_brands SET active = ${value} WHERE id = ${id}`;
                    if (error) throw error;
                }
            }

            showMessage('Field updated successfully!');
            fetchAllData(); // Refresh to show changes
        } catch (error) {
            console.error('Update field error:', error);
            showMessage('Error updating field', false);
        }
    };



    const renderTable = (data, table, nameColumn, showOrder = false, showRequiresFluids = false) => {
        return (
            <div className="dropdown-table-container">
                <table className="dropdown-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            {showOrder && <th>Order</th>}
                            {showRequiresFluids && <th>Requires Fluids</th>}
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={showOrder || showRequiresFluids ? "5" : "3"} className="no-data">
                                    No items yet. Add one below!
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className={!item.active ? 'inactive-row' : ''}>
                                    <td>
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="edit-input"
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{item[nameColumn]}</span>
                                        )}
                                    </td>
                                    {showOrder && (
                                        <td>
                                            {editingId === item.id ? (
                                                <input
                                                    type="number"
                                                    value={item.display_order}
                                                    onChange={(e) => handleUpdateField(table, item.id, 'display_order', parseInt(e.target.value))}
                                                    className="edit-input-small"
                                                />
                                            ) : (
                                                <span>{item.display_order}</span>
                                            )}
                                        </td>
                                    )}
                                    {showRequiresFluids && (
                                        <td>
                                            {editingId === item.id ? (
                                                <label className="checkbox-inline">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.requires_fluids}
                                                        onChange={(e) => handleUpdateField(table, item.id, 'requires_fluids', e.target.checked)}
                                                    />
                                                    <span>{item.requires_fluids ? 'Yes' : 'No'}</span>
                                                </label>
                                            ) : (
                                                item.requires_fluids ? (
                                                    <span className="badge badge-yes">Yes</span>
                                                ) : (
                                                    <span className="badge badge-no">No</span>
                                                )
                                            )}
                                        </td>
                                    )}
                                    <td>
                                        {editingId === item.id ? (
                                            <label className="checkbox-inline">
                                                <input
                                                    type="checkbox"
                                                    checked={item.active}
                                                    onChange={(e) => handleUpdateField(table, item.id, 'active', e.target.checked)}
                                                />
                                                <span className={`status-badge ${item.active ? 'active' : 'inactive'}`}>
                                                    {item.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        ) : (
                                            <span className={`status-badge ${item.active ? 'active' : 'inactive'}`}>
                                                {item.active ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="action-buttons">
                                        {editingId === item.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdate(table, item.id, nameColumn, editingValue)}
                                                    className="btn-save"
                                                    title="Save"
                                                >
                                                    ✓ Save
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="btn-cancel"
                                                    title="Cancel"
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(item.id, item[nameColumn])}
                                                    className="btn-edit"
                                                    title="Edit"
                                                >
                                                    ✎ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(table, item.id, item[nameColumn])}
                                                    className="btn-delete"
                                                    title="Delete"
                                                >
                                                    🗑 Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        );
    };


    const renderAddForm = (table, nameColumn, showOrder = false, showRequiresFluids = false, placeholder = "Enter name") => {
        return (
            <div className="add-form">
                <h4>Add New Item</h4>
                <div className="add-form-inputs">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="add-input"
                    />
                    {showOrder && (
                        <input
                            type="number"
                            placeholder="Display order (optional)"
                            value={newItemOrder}
                            onChange={(e) => setNewItemOrder(e.target.value)}
                            className="add-input-small"
                        />
                    )}
                    {showRequiresFluids && (
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={newItemRequiresFluids}
                                onChange={(e) => setNewItemRequiresFluids(e.target.checked)}
                            />
                            Requires Fluids
                        </label>
                    )}
                    <button
                        onClick={() => handleAdd(table, nameColumn)}
                        className="btn-add"
                        disabled={loading}
                    >
                        + Add
                    </button>
                </div>
            </div>
        );
    };

    if (!user) return <div className="loading">Loading...</div>;

    return (
        <div>
            <Navbar user={user} />
            <div className="page-container">
                <div className="manage-dropdowns">
                    <div className="page-header">
                        <div className="header-with-back">
                            <button
                                onClick={() => window.location.href = '/admin'}
                                className="btn-back"
                                title="Back to Dashboard"
                            >
                                ← Back to Dashboard
                            </button>
                            <div>
                                <h2>⚙️ Manage Dropdown Options</h2>
                                <p>Add, edit, or remove options for job card dropdowns</p>
                            </div>
                        </div>
                        </div>

                    {message && (
                        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}

                    <div className="tabs">
                        <button className={activeTab === 'equipment' ? 'active' : ''} onClick={() => setActiveTab('equipment')}>
                            Equipment
                        </button>
                        <button className={activeTab === 'sites' ? 'active' : ''} onClick={() => setActiveTab('sites')}>
                            Sites
                        </button>
                        <button className={activeTab === 'breakdown' ? 'active' : ''} onClick={() => setActiveTab('breakdown')}>
                            Breakdown Issues
                        </button>
                        <button className={activeTab === 'maintenance' ? 'active' : ''} onClick={() => setActiveTab('maintenance')}>
                            Maintenance Issues
                        </button>
                        <button className={activeTab === 'service' ? 'active' : ''} onClick={() => setActiveTab('service')}>
                            Service Intervals
                        </button>
                        <button className={activeTab === 'brakes' ? 'active' : ''} onClick={() => setActiveTab('brakes')}>
                            Brake Details
                        </button>
                        <button className={activeTab === 'battery' ? 'active' : ''} onClick={() => setActiveTab('battery')}>
                            Battery Positions
                        </button>
                        <button className={activeTab === 'tyres' ? 'active' : ''} onClick={() => setActiveTab('tyres')}>
                            Tyre Actions
                        </button>
                        <button className={activeTab === 'fluids' ? 'active' : ''} onClick={() => setActiveTab('fluids')}>
                            Fluid Types
                        </button>
                        <button
                            className={activeTab === 'tyre_brands' ? 'active' : ''} onClick={() => setActiveTab('tyre_brands')}
                        >
                            Tyre Brands
                        </button>

                    </div>

                    <div className="tab-content">
                        {activeTab === 'equipment' && (
                            <div className="dropdown-section">
                                <h3>Equipment / Plant Management</h3>
                                <p className="description">Manage fleet equipment and plant numbers</p>

                                <div className="dropdown-table-container">
                                    <table className="dropdown-table">
                                        <thead>
                                            <tr>
                                                <th>Plant #</th>
                                                <th>Type</th>
                                                <th>Make/Model</th>
                                                <th>Status</th>
                                                <th>Hours</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {equipmentList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="no-data">No equipment yet. Add one below!</td>
                                                </tr>
                                            ) : (
                                                equipmentList.map((equip) => (
                                                    <tr key={equip.id}>
                                                        <td>
                                                            {editingId === equip.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    className="edit-input"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <strong>{equip.plant_number}</strong>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {editingId === equip.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={equip.equipment_type}
                                                                    onChange={(e) => handleUpdateEquipment(equip.id, 'equipment_type', e.target.value)}
                                                                    className="edit-input"
                                                                />
                                                            ) : (
                                                                equip.equipment_type
                                                            )}
                                                        </td>
                                                        <td>
                                                            {editingId === equip.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={equip.make_model}
                                                                    onChange={(e) => handleUpdateEquipment(equip.id, 'make_model', e.target.value)}
                                                                    className="edit-input"
                                                                />
                                                            ) : (
                                                                equip.make_model
                                                            )}
                                                        </td>
                                                        <td>
                                                            {editingId === equip.id ? (
                                                                <select
                                                                    value={equip.status}
                                                                    onChange={(e) => handleUpdateEquipment(equip.id, 'status', e.target.value)}
                                                                    className="edit-input"
                                                                >
                                                                    <option value="operational">Operational</option>
                                                                    <option value="maintenance">Maintenance</option>
                                                                    <option value="broken">Broken</option>
                                                                    <option value="retired">Retired</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`status-badge ${equip.status}`}>
                                                                    {equip.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {editingId === equip.id ? (
                                                                <input
                                                                    type="number"
                                                                    value={equip.current_kilos_hours}
                                                                    onChange={(e) => handleUpdateEquipment(equip.id, 'current_kilos_hours', e.target.value)}
                                                                    className="edit-input-small"
                                                                />
                                                            ) : (
                                                                <strong>{equip.current_kilos_hours}h</strong>
                                                            )}
                                                        </td>
                                                        <td className="action-buttons">
                                                            {editingId === equip.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleUpdateEquipment(equip.id, 'plant_number', editingValue);
                                                                            setEditingId(null);
                                                                        }}
                                                                        className="btn-save"
                                                                    >
                                                                        ✓ Save
                                                                    </button>
                                                                    <button onClick={cancelEdit} className="btn-cancel">
                                                                        ✕ Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => startEdit(equip.id, equip.plant_number)}
                                                                        className="btn-edit"
                                                                    >
                                                                        ✎ Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteEquipment(equip.id, equip.plant_number)}
                                                                        className="btn-delete"
                                                                    >
                                                                        🗑
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="add-form">
                                    <h4>Add New Equipment</h4>
                                    <div className="add-form-inputs">
                                        <input
                                            type="text"
                                            placeholder="Plant Number (e.g., P009)"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            className="add-input"
                                        />
                                        <button
                                            onClick={handleAddEquipment}
                                            className="btn-add"
                                            disabled={loading}
                                        >
                                            + Add Equipment
                                        </button>
                                    </div>
                                    <small style={{ marginTop: '8px', display: 'block', color: 'var(--text-light)' }}>
                                        You'll be prompted for equipment type, make/model, and hours after clicking Add
                                    </small>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sites' && (
                            <div className="dropdown-section">
                                <h3>Site Locations</h3>
                                <p className="description">Manage the sites where equipment is located (e.g., Centurion, Hatfield)</p>
                                {renderTable(sites, 'sites', 'site_name')}
                                {renderAddForm('sites', 'site_name', false, false, 'e.g., Centurion')}
                            </div>
                        )}

                        {activeTab === 'breakdown' && (
                            <div className="dropdown-section">
                                <h3>Breakdown Issues</h3>
                                <p className="description">Issues that appear when "Breakdown" job type is selected</p>
                                {renderTable(breakdownIssues, 'breakdown_issues', 'issue_name', false, true)}
                                {renderAddForm('breakdown_issues', 'issue_name', false, true, 'e.g., Hydraulic Pipe')}
                            </div>
                        )}

                        {activeTab === 'maintenance' && (
                            <div className="dropdown-section">
                                <h3>Maintenance Issues</h3>
                                <p className="description">Issues that appear when "Maintenance" job type is selected</p>
                                {renderTable(maintenanceIssues, 'maintenance_issues', 'issue_name', false, true)}
                                {renderAddForm('maintenance_issues', 'issue_name', false, true, 'e.g., Brakes')}
                            </div>
                        )}

                        {activeTab === 'service' && (
                            <div className="dropdown-section">
                                <h3>Service Intervals</h3>
                                <p className="description">Service intervals that appear when "Service" job type is selected</p>
                                {renderTable(serviceIntervals, 'service_intervals', 'interval_name')}
                                {renderAddForm('service_intervals', 'interval_name', false, false, 'e.g., 500hr')}
                            </div>
                        )}

                        {activeTab === 'brakes' && (
                            <div className="dropdown-section">
                                <h3>Brake Detail Positions</h3>
                                <p className="description">Brake positions for detailed breakdown/maintenance</p>
                                {renderTable(brakeDetails, 'brake_details', 'position_name', true)}
                                {renderAddForm('brake_details', 'position_name', true, false, 'e.g., Left Front')}
                            </div>
                        )}

                        {activeTab === 'battery' && (
                            <div className="dropdown-section">
                                <h3>Battery Positions</h3>
                                <p className="description">Battery positions when "Battery" maintenance is selected</p>
                                {renderTable(batteryPositions, 'battery_positions', 'position_name')}
                                {renderAddForm('battery_positions', 'position_name', false, false, 'e.g., Position 1')}
                            </div>
                        )}

                        {activeTab === 'tyres' && (
                            <div className="dropdown-section">
                                <h3>Tyre Actions</h3>
                                <p className="description">Actions that can be performed on tyres</p>
                                {renderTable(tyreActions, 'tyre_actions', 'action_name')}
                                {renderAddForm('tyre_actions', 'action_name', false, false, 'e.g., Puncture')}
                            </div>
                        )}
                        {activeTab === 'tyre_brands' && (
                            <div className="dropdown-section">
                                <h3>Tyre Brands</h3>
                                <p className="description">Manage tyre brands used for New/Swap actions</p>

                                {renderTable(tyreBrands, 'tyre_brands', 'brand_name')}
                                {renderAddForm('tyre_brands', 'brand_name', false, false, 'e.g., Michelin')}
                            </div>
                        )}
                        {activeTab === 'fluids' && (
                            <div className="dropdown-section">
                                <h3>Fluid & Oil Types</h3>
                                <p className="description">Types of fluids and oils used in maintenance</p>
                                {renderTable(fluidTypes, 'fluid_types', 'fluid_name')}
                                {renderAddForm('fluid_types', 'fluid_name', false, false, 'e.g., Engine Oil 15W40')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

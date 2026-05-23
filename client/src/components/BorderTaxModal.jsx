import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { X, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateIST } from '../utils/istUtils';

const BorderTaxModal = ({ isOpen, onClose, selectedCompany }) => {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        borderName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: ''
    });
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && selectedCompany) {
            fetchData();
            fetchEntries();
        }
    }, [isOpen, selectedCompany]);

    const fetchData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const vehRes = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dvrRes = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVehicles(vehRes.data.vehicles || []);
            setDrivers(dvrRes.data.drivers || []);
        } catch (err) {
            console.error('Error fetching vehicles/drivers', err);
        }
    };

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const { data } = await axios.get(`/api/admin/border-tax/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEntries(data);
        } catch (err) {
            console.error('Error fetching border tax entries', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append('companyId', selectedCompany._id);
            if (receiptPhoto) data.append('receiptPhoto', receiptPhoto);

            await axios.post('/api/admin/border-tax', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage({ type: 'success', text: 'Border Tax recorded successfully!' });
            setFormData({
                vehicleId: '',
                driverId: '',
                borderName: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                remarks: ''
            });
            setReceiptPhoto(null);
            setPreview(null);
            fetchEntries();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record entry' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            await axios.delete(`/api/admin/border-tax/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Entry deleted successfully' });
            fetchEntries();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete entry' });
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: '#0f172a', width: '100%', maxWidth: '1000px', maxHeight: '90vh',
                    borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
                    display: 'grid', gridTemplateColumns: '1fr 1fr'
                }}
            >
                {/* Right Side: Entry List */}
                <div style={{ padding: '30px', borderRight: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto' }}>
                    <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>Recent Border Tax Entries</h2>

                    {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading entries...</p> : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {entries.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No entries found.</p> : entries.map(entry => (
                                <div key={entry._id} className="glass-card" style={{ padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹ {entry.amount}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{entry.date}</span>
                                    </div>
                                    <p style={{ color: 'white', fontWeight: '600', fontSize: '14px', margin: 0 }}>{entry.borderName}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>
                                        {entry.vehicle?.carNumber}
                                    </p>
                                    {entry.receiptPhoto && (
                                        <a href={entry.receiptPhoto} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'underline' }}>View Receipt</a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(entry._id)}
                                        style={{ float: 'right', color: '#f43f5e', opacity: 0.6 }}
                                        onMouseEnter={(e) => e.target.style.opacity = 1}
                                        onMouseLeave={(e) => e.target.style.opacity = 0.6}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Left Side: Form */}
                <div style={{ padding: '30px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700' }}>Record Border Tax</h2>
                        <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X /></button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Select Vehicle</label>
                                <select
                                    className="input-field"
                                    required
                                    value={formData.vehicleId}
                                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                >
                                    <option value="">Select Car</option>
                                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.carNumber}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Select Driver (Optional)</label>
                                <select
                                    className="input-field"
                                    value={formData.driverId}
                                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                >
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Border Crossed</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Delhi-UP Border"
                                required
                                value={formData.borderName}
                                onChange={(e) => setFormData({ ...formData, borderName: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="Enter amount"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Date</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        readOnly
                                        className="input-field"
                                        value={formData.date ? formatDateIST(formData.date) : ''}
                                        onClick={(e) => e.currentTarget.nextElementSibling.showPicker()}
                                        style={{ width: '100%', cursor: 'pointer' }}
                                    />
                                    <input
                                        type="date"
                                        className="input-field"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Remarks / Notes (Optional)</label>
                            <textarea
                                className="input-field"
                                style={{ height: '70px', paddingTop: '10px' }}
                                placeholder="Any additional details..."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>

                        <div>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Receipt Photo (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                />
                                <div style={{
                                    border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px',
                                    textAlign: 'center', background: 'rgba(255,255,255,0.02)'
                                }}>
                                    {preview ? (
                                        <img src={preview} style={{ height: '80px', borderRadius: '8px', margin: '0 auto' }} />
                                    ) : (
                                        <>
                                            <Upload size={24} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                                            <p style={{ color: 'white', fontSize: '13px' }}>Click to upload receipt</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {message.text && (
                            <div style={{
                                padding: '12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                color: message.type === 'success' ? '#10b981' : '#f43f5e'
                            }}>
                                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary"
                            style={{ width: '100%', padding: '15px' }}
                        >
                            {submitting ? 'Recording...' : 'Record Border Tax Entry'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default BorderTaxModal;

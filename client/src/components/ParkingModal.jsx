import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { X, Upload, CheckCircle, AlertCircle, Trash2, Camera, Car, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateIST } from '../utils/istUtils';

const ParkingModal = ({ isOpen, onClose, selectedCompany, onRefresh }) => {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        driver: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        remarks: ''
    });
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && selectedCompany) {
            fetchInitialData();
        }
    }, [isOpen, selectedCompany]);

    const fetchInitialData = async () => {
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
            
            // First upload the image if present
            let imageUrl = '';
            if (receiptPhoto) {
                const uploadData = new FormData();
                uploadData.append('file', receiptPhoto);
                const uploadRes = await axios.post('/api/admin/upload', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                });
                imageUrl = uploadRes.data.url;
            }

            const submissionData = {
                ...formData,
                companyId: selectedCompany._id,
                receiptPhoto: imageUrl
            };

            await axios.post('/api/admin/parking', submissionData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Parking recorded successfully!' });
            setFormData({
                vehicleId: '',
                driverId: '',
                driver: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                remarks: ''
            });
            setReceiptPhoto(null);
            setPreview(null);
            if (onRefresh) onRefresh();
            
            // Short delay then close
            setTimeout(() => {
                onClose();
                setMessage({ type: '', text: '' });
            }, 1500);

        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record entry' });
        } finally {
            setSubmitting(false);
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
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                    background: '#0f172a', width: '100%', maxWidth: '500px', maxHeight: '90vh',
                    borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto',
                    padding: '30px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <MapPin size={20} color="#fbbf24" />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>Record Parking</h2>
                    </div>
                    <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Select Vehicle</label>
                        <div style={{ position: 'relative' }}>
                            <Car size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <select
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                required
                                value={formData.vehicleId}
                                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                            >
                                <option value="">Choose Car</option>
                                {vehicles.map(v => <option key={v._id} value={v._id}>{v.carNumber}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Driver (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                <select
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    value={formData.driverId}
                                    onChange={(e) => {
                                        const d = drivers.find(drv => drv._id === e.target.value);
                                        setFormData({ ...formData, driverId: e.target.value, driver: d ? d.name : '' });
                                    }}
                                >
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Amount (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="₹ 0.00"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Location / Purpose</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Airport Parking, Hotel Entry"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
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

                    <div>
                        <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Receipt Photo (Optional)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 1 }}
                            />
                            <div style={{
                                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px',
                                textAlign: 'center', background: 'rgba(255,255,255,0.02)', position: 'relative'
                            }}>
                                {preview ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={preview} style={{ height: '80px', borderRadius: '8px', display: 'block' }} />
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setReceiptPhoto(null); setPreview(null); }}
                                            style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f43f5e', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', zIndex: 2 }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={20} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0 }}>Click or drag receipt photo</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: message.type === 'success' ? '#10b981' : '#f43f5e',
                            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                        }}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{ 
                                flex: 2, padding: '14px', borderRadius: '12px', 
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                                border: 'none', color: 'black', fontWeight: '800', cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(245,158,11,0.2)',
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            {submitting ? 'Recording...' : 'Save Parking'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ParkingModal;

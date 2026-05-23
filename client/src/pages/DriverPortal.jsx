import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Camera,
    MapPin,
    CheckCircle,
    LogOut,
    Car,
    AlertTriangle,
    User as UserIcon,
    RefreshCw,
    X,
    Plus,
    Trash2,
    Droplets,
    Clock,
    Wrench,
    ChevronLeft,
    Wallet,
    LayoutDashboard,
    Download,
    ClipboardList,
    ArrowRight,
    Lock,
    ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../context/LanguageContext';
import SEO from '../components/SEO';
import {
    todayIST,
    toISTDateString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';


const CameraModal = ({ side, onCapture, onClose }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: side === 'selfie' ? 'user' : 'environment',
                    width: { ideal: 800 },
                    height: { ideal: 600 }
                }
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError(t('cameraError'));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log("Track stopped:", track.label);
            });
            streamRef.current = null;
        }
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const file = new File([blob], `${side}.jpg`, { type: 'image/jpeg' });
                onCapture(file, canvas.toDataURL('image/jpeg', 0.6));
                stopCamera();
                onClose();
            }, 'image/jpeg', 0.6);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <div className="modal-header">
                    <h3 className="modal-title">
                        {side === 'selfie' ? t('modalTakeSelfie') :
                            side === 'km' ? t('modalCaptureKm') :
                                side === 'car' ? t('modalTakeCarSelfie') :
                                    side === 'fuel' ? t('modalFuelSlip') :
                                        side === 'parking' ? t('modalParkingSlip') :
                                            side === 'other' ? t('modalOtherSlip') : t('modalCapturePhoto')}
                    </h3>
                    <button
                        onClick={() => {
                            stopCamera();
                            onClose();
                        }}
                        className="modal-close-btn"
                    >
                        <X size={20} />
                    </button>
                </div>
                {error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#f43f5e' }}>{error}</div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!error && (
                    <button onClick={capture} className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '16px' }}>
                        <Camera size={20} style={{ display: 'inline', marginRight: '8px' }} />
                        {t('capture')}
                    </button>
                )}
            </div>
        </div>
    );
};

const DriverPortal = () => {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [km, setKm] = useState('');

    // Photo states
    const [selfie, setSelfie] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [kmPhoto, setKmPhoto] = useState(null);
    const [kmPreview, setKmPreview] = useState(null);
    const [carSelfie, setCarSelfie] = useState(null);
    const [carPreview, setCarPreview] = useState(null);

    // Question states (for Punch-Out)
    const [fuelFilled, setFuelFilled] = useState(false);
    const [fuelEntries, setFuelEntries] = useState([{ amount: '', km: '', fuelType: 'Diesel', slip: null, preview: null }]);
    // Use quantity in expenseEntries for fuel
    const [expenseEntries, setExpenseEntries] = useState([{ type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null }]);
    const [parkingPaid, setParkingPaid] = useState(false);
    const [parkingEntries, setParkingEntries] = useState([{ amount: '', slip: null, preview: null }]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [outsideTripOccurred, setOutsideTripOccurred] = useState(false);
    const [outsideTripTypes, setOutsideTripTypes] = useState([]);

    // New Fields for Report
    const [tollParkingAmount, setTollParkingAmount] = useState('');
    const [allowanceTA, setAllowanceTA] = useState(false);
    const [nightStay, setNightStay] = useState(false);
    const [otherRemarks, setOtherRemarks] = useState('');
    const [remarks, setRemarks] = useState('');
    const [specialPay, setSpecialPay] = useState('');
    const [specialPayRemark, setSpecialPayRemark] = useState('');

    // Camera Modal states
    const [activeCamera, setActiveCamera] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPunchOutForm, setShowPunchOutForm] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });

    // Mid-Trip Expense states
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseModalType, setExpenseModalType] = useState(null); // 'fuel', 'parking', 'other'

    // Ledger Tab
    const [activeTab, setActiveTab] = useState('home'); // 'home' or 'ledger'
    const [ledgerData, setLedgerData] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerMonth, setLedgerMonth] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1); // 1-12
    const [ledgerYear, setLedgerYear] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear());

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (activeTab === 'ledger') {
            fetchLedger(ledgerMonth, ledgerYear);
        }
    }, [activeTab, ledgerMonth, ledgerYear]);

    const fetchLedger = async (m, y) => {
        setLedgerLoading(true);
        try {
            const { data } = await axios.get(`/api/driver/ledger?month=${m}&year=${y}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setLedgerData(data);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLedgerLoading(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            const { data } = await axios.get('/api/driver/dashboard', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setDashboardData(data);
        } catch (err) {
            console.error('Error fetching dashboard', err);
        } finally {
            setLoading(false);
        }
    };


    const handlePasswordUpdate = async () => {
        if (!passwordData.oldPassword || !passwordData.newPassword) {
            setMessage({ type: 'error', text: 'All password fields are required' });
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.put('/api/driver/update-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswordData({ oldPassword: '', newPassword: '' });
            setShowPasswordSection(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePunch = async (type) => {
        if (!km || !selfie || !kmPhoto || !carSelfie) {
            setMessage({ type: 'error', text: t('mandatoryFields') });
            return;
        }

        if (type === 'punch-in' && !selectedVehicleId) {
            setMessage({ type: 'error', text: t('selectCar') });
            return;
        }

        if (type === 'punch-out') {
            if (fuelFilled) {
                const invalid = fuelEntries.some(e => !e.amount || !e.slip || !e.km);
                if (invalid) {
                    setMessage({ type: 'error', text: t('fuelValidation') });
                    return;
                }
            }
            if (parkingPaid) {
                const invalid = parkingEntries.some(e => !e.amount || !e.slip);
                if (invalid) {
                    setMessage({ type: 'error', text: t('parkingValidation') });
                    return;
                }
            }
        }

        let longitude = 0;
        let latitude = 0;
        let address = 'Location Disabled (Permission Denied)';

        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000
                });
            });
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            // Removed slow nominatim reverse geocoding API to speed up punch in/out
            address = `Tracked: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        } catch (err) {
            console.warn('Location acquisition failed or timed out:', err);
            // Don't block punch-in if location fails, just use 0,0
        }

        const formData = new FormData();
        formData.append('km', km);
        formData.append('selfie', selfie);
        formData.append('kmPhoto', kmPhoto);
        formData.append('carSelfie', carSelfie);
        formData.append('dutyCount', '1');
        formData.append('specialPay', '0');
        formData.append('specialPayRemark', '');
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('address', address);

        if (type === 'punch-in') {
            formData.append('vehicleId', selectedVehicleId);
        }

        if (type === 'punch-out') {
            formData.append('remarks', remarks);
            formData.append('otherRemarks', otherRemarks);
            formData.append('fuelFilled', fuelFilled);
            if (fuelFilled) {
                fuelEntries.forEach(entry => {
                    formData.append('fuelAmounts', entry.amount);
                    formData.append('fuelKMs', entry.km);
                    formData.append('fuelTypes', entry.fuelType);
                    formData.append('fuelSlips', entry.slip);
                });
            }
            formData.append('parkingPaid', parkingPaid);
            if (parkingPaid) {
                parkingEntries.forEach((entry) => {
                    formData.append('parkingAmounts', entry.amount);
                    formData.append('parkingSlips', entry.slip);
                });
            }
            formData.append('outsideTripOccurred', outsideTripOccurred);
            if (outsideTripOccurred) {
                formData.append('outsideTripType', outsideTripTypes.join(','));
            }
        }

        try {
            await axios.post(`/api/driver/${type}`, formData, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage({ type: 'success', text: t(type === 'punch-in' ? 'punchInSuccess' : 'punchOutSuccess') });

            // Reset all states
            setKm('');
            setSelfie(null);
            setSelfiePreview(null);
            setKmPhoto(null);
            setKmPreview(null);
            setCarSelfie(null);
            setCarPreview(null);
            setFuelFilled(false);
            setFuelEntries([{ amount: '', km: '', slip: null, preview: null }]);
            setParkingPaid(false);
            setParkingEntries([{ amount: '', slip: null, preview: null }]);
            setActiveIndex(0);
            setOutsideTripOccurred(false);
            setRemarks('');
            setOtherRemarks('');
            setShowPunchOutForm(false);
            setSelectedVehicleId('');
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestNewTrip = async () => {
        setIsSubmitting(true);
        try {
            await axios.post('/api/driver/request-trip', {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: t('requestSent') });
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: t('requestFailed') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExpense = async () => {
        // Filter out entries that don't have an amount
        const activeEntries = expenseEntries.filter(e => e.amount && e.amount > 0);

        if (activeEntries.length === 0) {
            setMessage({ type: 'error', text: t('mandatoryFields') });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();

        activeEntries.forEach((entry, index) => {
            formData.append('types', entry.type);
            formData.append('amounts', entry.amount);
            formData.append('kms', entry.km || 0);
            formData.append('fuelTypes', entry.fuelType || '');
            formData.append('fuelQuantities', entry.quantity || 0);
            formData.append('fuelRates', entry.rate || 0);
            formData.append('paymentSources', entry.paymentSource || 'Office');
            if (entry.slip) {
                // Important: Use the index from the activeEntries array
                formData.append(`slip_${index}`, entry.slip);
            }
        });

        try {
            await axios.post('/api/driver/add-expense', formData, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ type: 'success', text: t('expenseSubmitted') });
            setShowExpenseModal(false);
            setExpenseEntries([]);
            setActiveIndex(0);
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
        } finally {
            setIsSubmitting(false);
        }
    };
    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) return resolve(null);
            let finalUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                finalUrl = `https://superadmin.yatreedestination.com/uploads/${url}`;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (finalUrl.startsWith('http')) {
                img.src = `/api/admin/proxy-image?url=${encodeURIComponent(finalUrl)}`;
            } else {
                img.src = finalUrl;
            }
        });
    };

    const handleExportPDF = async () => {
        try {
            if (!ledgerData) {
                alert("No ledger data available to download.");
                return;
            }

            // Load assets
            const logo = await loadImage(user.company?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(user.company?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const monthName = new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'long' });
            const periodLabel = `${monthName} ${ledgerYear}`;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER (LUXURY STYLE)
            doc.setFillColor(15, 23, 42); // Navy Dark
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 10, 30, 30);
            } else {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'D');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('LOGO', 24, 26, { align: 'center' });
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text((user.company?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(14, 165, 233); // Blue accent
            doc.text(user.company?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('SALARY SLIP', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(`STATEMENT PERIOD`, pageWidth - 15, 30, { align: 'right' });
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text(periodLabel.toUpperCase(), pageWidth - 15, 36, { align: 'right' });

            // 2. INFORMATION SECTION
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EMPLOYEE INFORMATION', 15, 65);
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('NAME', 15, 76);
            doc.text('MOBILE', 15, 84);
            doc.text('DESIGNATION', 15, 92);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(user.name?.toUpperCase() || 'N/A', 45, 76);
            doc.text(user.mobile || 'N/A', 45, 84);
            doc.text('PROFESSIONAL DRIVER', 45, 92);

            // Summary Box (Right Side)
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 40, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT OVERVIEW', pageWidth / 2 + 5, 68);

            const totalEarned = ledgerData.summary?.totalEarned || 0;
            const totalEMI = Number(ledgerData.summary?.totalEMI) || 0;
            const netPayable = ledgerData.summary?.netPayable || (totalEarned - (ledgerData.summary?.pendingAdvance || 0) - totalEMI);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Gross Earnings:', pageWidth / 2 + 5, 74);
            doc.text('Advances Deducted:', pageWidth / 2 + 5, 78);
            doc.text('EMI Deduction (Loan):', pageWidth / 2 + 5, 82);

            doc.setTextColor(15, 23, 42);
            doc.text(`Rs. ${totalEarned.toLocaleString('en-IN')}`, pageWidth - 20, 74, { align: 'right' });
            doc.setTextColor(244, 63, 94);
            doc.text(`- Rs. ${(ledgerData.summary?.pendingAdvance || 0).toLocaleString('en-IN')}`, pageWidth - 20, 78, { align: 'right' });
            doc.text(`- Rs. ${totalEMI.toLocaleString('en-IN')}`, pageWidth - 20, 82, { align: 'right' });

            doc.setDrawColor(203, 213, 225);
            doc.line(pageWidth / 2 + 5, 86, pageWidth - 20, 86);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129); // Green for net payable
            doc.text('NET PAYABLE:', pageWidth / 2 + 5, 95);
            doc.text(`Rs. ${netPayable.toLocaleString('en-IN')}`, pageWidth - 20, 95, { align: 'right' });

            // 3. DUTY LOGS TABLE
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('DUTY & TRIP DETAILS', 15, 115);

            const dutyRows = (ledgerData.history || []).map(att => [
                toISTDateString(att.date),
                att.vehicle || 'N/A',
                `Rs. ${att.dailyWage || 0}`,
                `Rs. ${att.sameDayReturn || 0}`,
                `Rs. ${att.nightStay || 0}`,
                `Rs. ${att.parking || 0}`,
                `Rs. ${(att.dailyWage || 0) + (att.sameDayReturn || 0) + (att.nightStay || 0) + (att.parking || 0)}`
            ]);

            autoTable(doc, {
                head: [['DATE', 'VEHICLE NO.', 'WAGE', 'SAME DAY', 'NIGHT STAY', 'PARKING', 'TOTAL']],
                body: dutyRows,
                startY: 120,
                theme: 'grid',
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle'
                },
                bodyStyles: {
                    fontSize: 8,
                    halign: 'center',
                    textColor: [51, 65, 85]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 4. ADVANCES TABLE
            let nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 15;
            if (nextY > pageHeight - 80) { doc.addPage(); nextY = 20; }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('ADVANCES', 15, nextY);

            const advRows = (ledgerData.advances || []).map(adv => {
                const status = (adv.status || '').toLowerCase();
                const displayStatus = status === 'pending' ? 'PAID' : (status === 'recovered' ? 'SETTLED' : (adv.status || '').toUpperCase());
                return [
                    formatDateIST(adv.date),
                    (adv.remark || '').toUpperCase(),
                    `Rs. ${adv.amount}`,
                    displayStatus
                ];
            });

            autoTable(doc, {
                head: [['DATE', 'PARTICULARS', 'AMOUNT (Rs.)', 'STATUS']],
                body: advRows,
                startY: nextY + 5,
                theme: 'striped',
                headStyles: {
                    fillColor: [244, 63, 94],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 8,
                    halign: 'center',
                    textColor: [51, 65, 85]
                },
                margin: { left: 15, right: 15 }
            });

            // 5. SPECIAL PAYOUTS (ALLOWANCES) TABLE 
            let allowanceY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : nextY) + 15;
            if (allowanceY > pageHeight - 80) { doc.addPage(); allowanceY = 20; }

            const specialPayouts = (ledgerData.allowances || []);
            if (specialPayouts.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('SPECIAL PAYOUTS (BONUS)', 15, allowanceY);

                const allowanceRows = specialPayouts.map(a => [
                    formatDateIST(a.date),
                    (a.remark || 'SPECIAL ALLOWANCE').toUpperCase(),
                    `Rs. ${a.amount}`,
                    (a.type || 'Other').toUpperCase()
                ]);

                autoTable(doc, {
                    head: [['DATE', 'REMARK', 'AMOUNT (Rs.)', 'TYPE']],
                    body: allowanceRows,
                    startY: allowanceY + 5,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
            }

            // 6. LOANS TABLE
            let loanY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : allowanceY) + 15;
            if (loanY > pageHeight - 80) { doc.addPage(); loanY = 20; }
            doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('LOANS & EMI PROGRESS', 15, loanY);

            const loanRows = (ledgerData.loans || []).map(loan => {
                const sDate = new Date(loan.startDate);
                const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                const selVal = (parseInt(ledgerYear) * 12) + parseInt(ledgerMonth);
                const monthIdx = (selVal - sVal) + 1;

                const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);
                const isCompleted = loan.status === 'Completed';

                let progress = '';
                if (isCompleted) {
                    progress = 'Completed';
                } else if (monthIdx <= 0) {
                    progress = 'Upcoming';
                } else if (monthIdx > tenure) {
                    progress = `Extended (Month ${monthIdx} of ${tenure})`;
                } else {
                    progress = `Month ${monthIdx} of ${tenure}`;
                }

                return [
                    formatDateIST(loan.startDate),
                    `Rs. ${loan.totalAmount?.toLocaleString()}`,
                    `Rs. ${loan.monthlyEMI?.toLocaleString()}`,
                    `Rs. ${loan.remainingAmount?.toLocaleString()}`,
                    progress,
                    loan.status?.toUpperCase()
                ];
            });

            if (loanRows.length > 0) {
                autoTable(doc, {
                    head: [['LOAN DATE', 'TOTAL AMOUNT', 'EMI AMOUNT', 'REMAINING', 'EMI PROGRESS', 'STATUS']],
                    body: loanRows,
                    startY: loanY + 5,
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241], fontSize: 8, halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                doc.text('No active or historical loans recorded for this driver.', 15, loanY + 10);
            }

            // 6. FOOTER & SIGNATURE SECTION
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : loanY) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            // Disclaimer & Note
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('Note: This is an electronically generated statement. Any discrepancies must be reported to the accounts department within 48 hours for rectification.', 15, footerY, { maxWidth: pageWidth - 100 });

            // Signature Placement
            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }

            // Signature Line
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);

            // Signatory Details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((user.company?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Founder & Director', sigX - 2, footerY + 17);
            doc.text(`${user.company?.name || 'LogKaro'}`, sigX - 2, footerY + 21);


            // Generated at bottom
            doc.setFontSize(7);
            doc.setTextColor(203, 213, 225);
            doc.text(`Generated on: ${formatDateTimeIST(new Date())}`, 15, pageHeight - 10);

            const fileName = `Salary_Slip_${user.name?.replace(/\s+/g, '_')}_${monthName}_${ledgerYear}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to generate PDF: " + error.message);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;

    const todayAttendance = dashboardData?.todayAttendance;
    const isPunchedIn = !!todayAttendance?.punchIn?.time;
    const isPunchedOut = !!todayAttendance?.punchOut?.time;
    const tripStatus = dashboardData?.driver?.tripStatus;
    const showPunchIn = tripStatus === 'approved';
    const showPunchOut = tripStatus === 'active';

    return (
        <div className="admin-layout-wrapper">
            <SEO title="Driver Portal" />
            <div className="main-content">
                <div className="container-fluid">
                    <header className="dashboard-header" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="header-logo-section">
                            <img
                                src={user.company?.logo || "/logos/logo.png"}
                                alt={user.company?.name || "LogKaro"}
                                style={{
                                    width: '100px',
                                    height: 'auto',
                                    marginRight: '15px'
                                }}
                            />
                            <div>
                                <h1 className="header-title" style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: '900', letterSpacing: '-0.5px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
                                    {user.company?.name || "LogKaro"}
                                </h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                                    <p className="header-subtitle" style={{ fontSize: 'clamp(13px, 3.2vw, 15px)', fontWeight: '700', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{user.name}</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {showPunchOut && (
                                <>
                                    {todayAttendance?.pendingExpenses?.length > 0 && (
                                        <div style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            padding: '6px 10px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: 'var(--primary)',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            border: '1px solid rgba(245, 158, 11, 0.2)'
                                        }}>
                                            <Clock size={14} /> {todayAttendance.pendingExpenses.length}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            const newFuelEntry = { type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null };
                                            setExpenseEntries([newFuelEntry]);
                                            setExpenseModalType('fuel');
                                            setShowExpenseModal(true);
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
                                            color: 'white',
                                            height: '42px',
                                            padding: '0 14px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            border: 'none',
                                            boxShadow: '0 6px 16px rgba(14, 165, 233, 0.25)',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <Droplets size={18} /> {t('logFuel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setExpenseEntries([{ type: 'parking', amount: '', quantity: '', km: '', fuelType: '', slip: null, preview: null }]);
                                            setExpenseModalType('parking');
                                            setShowExpenseModal(true);
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)',
                                            color: 'white',
                                            height: '42px',
                                            padding: '0 14px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            border: 'none',
                                            boxShadow: '0 6px 16px rgba(245, 158, 11, 0.25)',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <Car size={18} /> {t('parking')}
                                    </button>
                                    {showPunchOut && !showPunchOutForm && (
                                        <button
                                            onClick={() => setShowPunchOutForm(true)}
                                            style={{
                                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                                color: 'white',
                                                height: '42px',
                                                padding: '0 14px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                border: 'none',
                                                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.3)',
                                                cursor: 'pointer',
                                                fontWeight: '800',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <LogOut size={16} /> {t('punchOut')}
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => setShowPasswordSection(true)}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                                    color: 'white',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                <Lock size={14} color="var(--primary)" /> {t('security') || 'Security'}
                            </button>
                            <div className="language-switcher" style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                                borderRadius: '12px',
                                padding: '5px',
                                display: 'flex',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                <button
                                    onClick={() => setLanguage('en')}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '9px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        background: language === 'en' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' : 'transparent',
                                        color: 'white',
                                        transition: 'all 0.3s ease',
                                        boxShadow: language === 'en' ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none'
                                    }}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLanguage('hi')}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '9px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        background: language === 'hi' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' : 'transparent',
                                        color: 'white',
                                        transition: 'all 0.3s ease',
                                        boxShadow: language === 'hi' ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none'
                                    }}
                                >
                                    हिन्दी
                                </button>
                            </div>
                            <button onClick={logout} style={{
                                background: 'linear-gradient(135deg, rgba(244,63,94,0.15) 0%, rgba(244,63,94,0.08) 100%)',
                                color: '#f43f5e',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                fontWeight: '800',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: '1px solid rgba(244,63,94,0.2)',
                                boxShadow: '0 4px 12px rgba(244,63,94,0.15)',
                                transition: 'all 0.3s ease'
                            }}>
                                <LogOut size={16} /> {t('logout')}
                            </button>
                        </div>
                    </header>

                    {/* Status Tracker Global - Moved above tabs per user request */}
                    <div className="glass-card" style={{
                        padding: 'clamp(20px, 4vw, 24px)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        marginBottom: '24px'
                    }}>
                        <div className="modal-grid-2" style={{ gap: 'clamp(12px, 3vw, 20px)' }}>
                            <div style={{
                                background: isPunchedIn ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'rgba(255,255,255,0.02)',
                                padding: 'clamp(14px, 3vw, 18px)',
                                borderRadius: '16px',
                                border: isPunchedIn ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {isPunchedIn && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 12px #10b981',
                                        animation: 'pulse 2s infinite'
                                    }}></div>
                                )}
                                <p className="section-subtitle" style={{ fontSize: 'clamp(9px, 2vw, 10px)', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '6px' }}>{t('punchIn')}</p>
                                <p style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: isPunchedIn ? '#10b981' : 'rgba(255,255,255,0.2)', letterSpacing: '-1px' }}>
                                    {isPunchedIn ? formatTimeIST(todayAttendance.punchIn.time) : '--:--'}
                                </p>
                            </div>
                            <div
                                onClick={() => {
                                    if (showPunchOut && !showPunchOutForm) {
                                        setActiveTab('home');
                                        setShowPunchOutForm(true);
                                    }
                                }}
                                style={{
                                    background: isPunchedOut ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)' : 'rgba(255,255,255,0.02)',
                                    padding: 'clamp(14px, 3vw, 18px)',
                                    borderRadius: '16px',
                                    border: isPunchedOut ? '1px solid rgba(244, 63, 94, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: (showPunchOut && !showPunchOutForm) ? 'pointer' : 'default'
                                }}
                            >
                                {isPunchedOut && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#f43f5e',
                                        boxShadow: '0 0 12px #f43f5e'
                                    }}></div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <p className="section-subtitle" style={{ fontSize: 'clamp(9px, 2vw, 10px)', fontWeight: '800', letterSpacing: '0.5px', margin: 0 }}>{t('punchOut')}</p>
                                    {showPunchOut && !showPunchOutForm && <ArrowRight size={14} color="#f43f5e" />}
                                </div>
                                <p style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: isPunchedOut ? '#f43f5e' : 'rgba(255,255,255,0.2)', letterSpacing: '-1px' }}>
                                    {isPunchedOut ? formatTimeIST(todayAttendance.punchOut.time) : '--:--'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="tab-navigation" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => setActiveTab('home')}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', background: activeTab === 'home' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' : 'transparent', color: 'white', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'all 0.3s' }}
                        >
                            <LayoutDashboard size={18} /> {t('today')}
                        </button>
                        <button
                            onClick={() => setActiveTab('ledger')}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', background: activeTab === 'ledger' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' : 'transparent', color: 'white', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'all 0.3s' }}
                        >
                            <Wallet size={18} /> {t('ledger')}
                        </button>
                    </div>

                    {activeTab === 'home' && (
                        <>
                            {(!dashboardData?.vehicle && !showPunchIn && tripStatus !== 'completed' && tripStatus !== 'pending_approval') ? (
                                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                                    <AlertTriangle size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
                                    <h2 style={{ color: 'white', marginBottom: '8px' }}>{t('noVehicle')}</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>{t('startDutyMessage')}</p>
                                </div>
                            ) : (
                                <div className="form-section-wrapper">
                                    {/* Vehicle Info removed as per user request */}

                                    {/* Security Modal */}
                                    {showPasswordSection && (
                                        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div className="modal-content glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '10px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '12px' }}>
                                                            <Lock size={20} color="var(--primary)" />
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white' }}>{t('security') || 'Security Settings'}</h3>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setShowPasswordSection(false);
                                                            setMessage({ type: '', text: '' });
                                                        }}
                                                        className="modal-close-btn"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div style={{ display: 'grid', gap: '16px' }}>
                                                    <div className="input-wrapper-full">
                                                        <label className="input-label" style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, letterSpacing: '0.5px' }}>CURRENT PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            className="input-field"
                                                            placeholder="Enter current password"
                                                            value={passwordData.oldPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                            style={{ background: 'rgba(0,0,0,0.2)' }}
                                                        />
                                                    </div>
                                                    <div className="input-wrapper-full">
                                                        <label className="input-label" style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, letterSpacing: '0.5px' }}>NEW PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            className="input-field"
                                                            placeholder="Enter new password"
                                                            value={passwordData.newPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                            style={{ background: 'rgba(0,0,0,0.2)' }}
                                                        />
                                                    </div>

                                                    {message.text && (
                                                        <div style={{
                                                            padding: '12px',
                                                            borderRadius: '12px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                            color: message.type === 'success' ? '#10b981' : '#f43f5e',
                                                            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 129, 0.2)'}`
                                                        }}>
                                                            {message.text}
                                                        </div>
                                                    )}

                                                    <button
                                                        className="btn-primary"
                                                        disabled={isSubmitting}
                                                        onClick={handlePasswordUpdate}
                                                        style={{ height: '52px', borderRadius: '14px', fontSize: '14px', fontWeight: '1000', letterSpacing: '1px', marginTop: '10px' }}
                                                    >
                                                        {isSubmitting ? 'UPDATING...' : 'CONFIRM CHANGE'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                    {tripStatus === 'completed' && (
                                        <div className="glass-card" style={{
                                            padding: 'clamp(32px, 8vw, 48px)',
                                            textAlign: 'center',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.15)',
                                            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(16, 185, 129, 0.2)',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <CheckCircle size={40} color="#10b981" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t('dutyCompleted')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '28px', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: '600' }}>{t('offDutyMessage')}</p>
                                            <button onClick={handleRequestNewTrip} disabled={isSubmitting} className="btn-primary" style={{
                                                width: '100%',
                                                maxWidth: '320px',
                                                margin: '0 auto',
                                                display: 'block',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                padding: '16px 24px',
                                                fontSize: '15px',
                                                fontWeight: '800',
                                                borderRadius: '14px',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                                                border: 'none'
                                            }}>
                                                {isSubmitting ? t('processing') : t('startNewDuty')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Waiting for Approval Screen */}
                                    {tripStatus === 'pending_approval' && (
                                        <div className="glass-card" style={{
                                            padding: 'clamp(32px, 8vw, 48px)',
                                            textAlign: 'center',
                                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.03) 100%)',
                                            border: '1px solid rgba(14, 165, 233, 0.15)',
                                            boxShadow: '0 8px 32px rgba(14, 165, 233, 0.15)'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(14, 165, 233, 0.2)',
                                                boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)'
                                            }}>
                                                <RefreshCw size={40} color="var(--primary)" className="spinner" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t('waitingAdmin')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: '600' }}>{t('reviewMessage')}</p>
                                        </div>
                                    )}

                                    {/* On Duty Screen */}
                                    {showPunchOut && !showPunchOutForm && (
                                        <div className="glass-card" style={{
                                            padding: 'clamp(32px, 8vw, 48px)',
                                            textAlign: 'center',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.15)',
                                            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '-50px',
                                                right: '-50px',
                                                width: '150px',
                                                height: '150px',
                                                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                                                pointerEvents: 'none'
                                            }}></div>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(16, 185, 129, 0.2)',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
                                                position: 'relative'
                                            }}>
                                                <Car size={40} color="#10b981" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px', position: 'relative' }}>{t('onDuty')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '28px', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: '600', position: 'relative' }}>{t('driveSafely')}</p>
                                            <button
                                                onClick={() => setShowPunchOutForm(true)}
                                                className="btn-primary"
                                                style={{
                                                    width: '100%',
                                                    background: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
                                                    padding: '16px 24px',
                                                    boxShadow: '0 8px 24px rgba(244, 63, 94, 0.3)',
                                                    fontSize: '15px',
                                                    fontWeight: '800',
                                                    borderRadius: '14px',
                                                    border: 'none',
                                                    position: 'relative'
                                                }}
                                            >
                                                {t('submitReports')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Main Form */}
                                    {(showPunchIn || (showPunchOut && showPunchOutForm)) && (
                                        <div className="glass-card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                                            <div className="modal-header" style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
                                                {showPunchOut && (
                                                    <button onClick={() => setShowPunchOutForm(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', padding: '6px', borderRadius: '8px' }}>
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                )}
                                                <div>
                                                    <h2 className="modal-title">{showPunchIn ? t('dutyPunchIn') : t('dutyPunchOut')}</h2>
                                                    <p className="section-subtitle">{showPunchIn ? t('start') : t('end')}</p>
                                                </div>
                                            </div>


                                            {/* Vehicle Selection (Punch-In only) */}
                                            {showPunchIn && (
                                                <div className="input-wrapper-full" style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                    <label className="input-label">{t('selectVehicle')}</label>
                                                    <select
                                                        className="input-field"
                                                        value={selectedVehicleId}
                                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: '12px' }}
                                                    >
                                                        <option value="" style={{ background: '#0f172a', color: 'white' }}>{t('selectCar')}</option>
                                                        {dashboardData?.availableVehicles?.map(v => (
                                                            <option key={v._id} value={v._id} style={{ background: '#0f172a', color: 'white' }}>
                                                                {v.carNumber} ({v.model})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="input-wrapper-full" style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                <label className="input-label">{t('currentKm')}</label>
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    placeholder={t('enterKm')}
                                                    value={km}
                                                    onChange={(e) => setKm(e.target.value)}
                                                />
                                            </div>

                                            {/* Photo Captures */}
                                            <div className="photo-capture-grid" style={{ marginBottom: 'clamp(20px, 5vw, 28px)' }}>
                                                {/* Selfie */}
                                                <div>
                                                    <p className="input-label" style={{ marginBottom: '8px' }}>{t('driverSelfie')}</p>
                                                    {!selfiePreview ? (
                                                        <div
                                                            onClick={() => setActiveCamera('selfie')}
                                                            className="photo-capture-button"
                                                        >
                                                            <Camera size={24} color="var(--primary)" />
                                                            <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeSelfie')}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="photo-preview-container">
                                                            <img src={selfiePreview} alt="Selfie" className="photo-preview-image" />
                                                            <button
                                                                onClick={() => {
                                                                    setSelfie(null);
                                                                    setSelfiePreview(null);
                                                                }}
                                                                className="photo-delete-button"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* KM Photo */}
                                                <div>
                                                    <p className="input-label" style={{ marginBottom: '8px' }}>{t('kmPhoto')}</p>
                                                    {!kmPreview ? (
                                                        <div
                                                            onClick={() => setActiveCamera('km')}
                                                            className="photo-capture-button"
                                                        >
                                                            <Camera size={24} color="var(--primary)" />
                                                            <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeKmPhoto')}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="photo-preview-container">
                                                            <img src={kmPreview} alt="KM" className="photo-preview-image" />
                                                            <button
                                                                onClick={() => {
                                                                    setKmPhoto(null);
                                                                    setKmPreview(null);
                                                                }}
                                                                className="photo-delete-button"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Car Selfie */}
                                                <div>
                                                    <p className="input-label" style={{ marginBottom: '8px' }}>{t('carSelfie')}</p>
                                                    {!carPreview ? (
                                                        <div
                                                            onClick={() => setActiveCamera('car')}
                                                            className="photo-capture-button"
                                                        >
                                                            <Camera size={24} color="var(--primary)" />
                                                            <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeCarPhoto')}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="photo-preview-container">
                                                            <img src={carPreview} alt="Car" className="photo-preview-image" />
                                                            <button
                                                                onClick={() => {
                                                                    setCarSelfie(null);
                                                                    setCarPreview(null);
                                                                }}
                                                                className="photo-delete-button"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Punch-Out Specific Questions */}
                                            {showPunchOut && (
                                                <div style={{ marginBottom: 'clamp(20px, 5vw, 28px)' }}>
                                                    <h3 className="section-title">{t('expenditureDetails')}</h3>





                                                    {/* Outside Trip Question */}
                                                    <div style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                        <p className="input-label" style={{ marginBottom: '10px' }}>{t('outsideCityQuestion')}</p>
                                                        <div className="yes-no-button-group">
                                                            <button
                                                                onClick={() => setOutsideTripOccurred(true)}
                                                                className="yes-no-button"
                                                                style={{ background: outsideTripOccurred ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white' }}
                                                            >
                                                                {t('yes')}
                                                            </button>
                                                            <button
                                                                onClick={() => setOutsideTripOccurred(false)}
                                                                className="yes-no-button"
                                                                style={{ background: !outsideTripOccurred ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white' }}
                                                            >
                                                                {t('no')}
                                                            </button>
                                                        </div>

                                                        {outsideTripOccurred && (
                                                            <div className="checkbox-group" style={{ marginTop: '12px' }}>
                                                                {(dashboardData?.driver?.sameDayReturnBonus > 0) && (
                                                                    <div className="checkbox-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="checkbox-input"
                                                                            checked={outsideTripTypes.includes('Same Day')}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setOutsideTripTypes([...outsideTripTypes.filter(t => t !== 'Night Stay'), 'Same Day']);
                                                                                else setOutsideTripTypes(outsideTripTypes.filter(t => t !== 'Same Day'));
                                                                            }}
                                                                        />
                                                                        <label className="checkbox-label">{t('sameDay')} (+₹{dashboardData?.driver?.sameDayReturnBonus})</label>
                                                                    </div>
                                                                )}

                                                                {(dashboardData?.driver?.nightStayBonus > 0) && (
                                                                    <div className="checkbox-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="checkbox-input"
                                                                            checked={outsideTripTypes.includes('Night Stay')}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setOutsideTripTypes([...outsideTripTypes.filter(t => t !== 'Same Day'), 'Night Stay']);
                                                                                else setOutsideTripTypes(outsideTripTypes.filter(t => t !== 'Night Stay'));
                                                                            }}
                                                                        />
                                                                        <label className="checkbox-label">{t('nightStay')} (+₹{dashboardData?.driver?.nightStayBonus})</label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Remarks (Punch-Out only) */}
                                            {showPunchOut && (
                                                <div style={{ marginBottom: 'clamp(20px, 5vw, 28px)' }}>
                                                    <div className="input-wrapper-full" style={{ marginTop: '4px' }}>
                                                        <label className="input-label">Duty Details</label>
                                                        <textarea
                                                            className="input-field"
                                                            placeholder="Enter duty details..."
                                                            value={otherRemarks}
                                                            onChange={(e) => setOtherRemarks(e.target.value)}
                                                            style={{ fontSize: '14px', resize: 'vertical', minHeight: '60px' }}
                                                        />
                                                    </div>

                                                </div>
                                            )}


                                            {/* Message */}
                                            {message.text && (
                                                <div style={{ padding: '12px', background: message.type === 'error' ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: '10px', marginBottom: '16px' }}>
                                                    <p style={{ color: message.type === 'error' ? '#f43f5e' : '#10b981', fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '600', margin: 0 }}>{message.text}</p>
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <button
                                                onClick={() => {
                                                    if (showPunchIn && !selectedVehicleId) return setMessage({ type: 'error', text: 'Please select a vehicle' });
                                                    handlePunch(showPunchOut ? 'punch-out' : 'punch-in');
                                                }}
                                                disabled={isSubmitting}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '16px', fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '800' }}
                                            >
                                                {isSubmitting ? t('processing').toUpperCase() : (showPunchOut ? t('submitPunchOut').toUpperCase() : t('submitPunchIn').toUpperCase())}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mid-Trip Expense Modal */}
                            {showExpenseModal && (
                                <div className="modal-overlay">
                                    <div className="modal-content glass-card" style={{ maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div>
                                                <h3 className="modal-title">
                                                    {expenseModalType === 'fuel' ? t('logFuel') :
                                                        expenseModalType === 'parking' ? t('logParking') :
                                                            expenseModalType === 'special_pay' ? t('specialPay') :
                                                                t('driverSeva')}
                                                </h3>
                                                <p className="section-subtitle">{t('logExpense').toUpperCase()}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowExpenseModal(false);
                                                    setExpenseEntries([]);
                                                    setExpenseModalType(null);
                                                    setActiveIndex(0);
                                                }}
                                                className="modal-close-btn"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                                            {expenseEntries.length === 0 ? (
                                                <div style={{ padding: '30px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{t('noExpensesYet') || 'No expenses added yet'}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {expenseModalType === 'fuel' && (
                                                            <button
                                                                onClick={() => setExpenseEntries([{ type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null }])}
                                                                className="btn-primary"
                                                                style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <Droplets size={20} /> {t('logFuel')}
                                                            </button>
                                                        )}
                                                        {expenseModalType === 'parking' && (
                                                            <button
                                                                onClick={() => setExpenseEntries([{ type: 'parking', amount: '', quantity: '', km: '', fuelType: '', slip: null, preview: null }])}
                                                                className="btn-primary"
                                                                style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <Car size={20} /> {t('logParking')}
                                                            </button>
                                                        )}
                                                        {expenseModalType === 'other' && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'wash', amount: '', quantity: '', km: '', fuelType: 'Wash', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <Droplets size={16} /> {t('carWash')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'puncture', amount: '', quantity: '', km: '', fuelType: 'Puncture', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <AlertTriangle size={16} /> {t('puncture')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'tissue', amount: '', quantity: '', km: '', fuelType: 'Tissue', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <ClipboardList size={16} /> {t('tissue')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'water', amount: '', quantity: '', km: '', fuelType: 'Water', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <Droplets size={16} /> {t('waterBottle')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'other', amount: '', quantity: '', km: '', fuelType: 'Other', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ gridColumn: 'span 2', padding: '12px 24px', fontSize: '14px', borderRadius: '12px', background: '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                                                                >
                                                                    <Wrench size={20} /> {t('other')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {expenseEntries.map((entry, index) => (
                                                        <div key={index} className="entry-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: entry.type === 'fuel' ? 'rgba(14, 165, 233, 0.15)' : (entry.type === 'parking' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {entry.type === 'fuel' ? <Droplets size={16} color="var(--primary)" /> : (entry.type === 'parking' ? <Car size={16} color="var(--primary)" /> : <Wrench size={16} color="#f43f5e" />)}
                                                                    </div>
                                                                    <span style={{ fontWeight: '800', fontSize: '12px', color: 'white', textTransform: 'uppercase' }}>
                                                                        {entry.type === 'fuel' ? t('logFuel') : (entry.type === 'parking' ? t('logParking') : (t(entry.type) || t('driverSeva')))}
                                                                    </span>
                                                                </div>
                                                                <button onClick={() => setExpenseEntries(expenseEntries.filter((_, i) => i !== index))} style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '6px', borderRadius: '6px' }}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="input-grid-2" style={{ marginBottom: '16px' }}>
                                                                <div className="input-wrapper-full">
                                                                    <label className="input-label" style={{ fontSize: '10px' }}>{t('amount')}</label>
                                                                    <input
                                                                        type="number"
                                                                        className="input-field"
                                                                        placeholder="0.00"
                                                                        value={entry.amount}
                                                                        onChange={(e) => {
                                                                            const newEntries = [...expenseEntries];
                                                                            newEntries[index].amount = e.target.value;
                                                                            setExpenseEntries(newEntries);
                                                                        }}
                                                                        style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                    />
                                                                </div>
                                                                {entry.type === 'fuel' && (
                                                                    <>
                                                                        <div className="input-wrapper-full">
                                                                            <label className="input-label" style={{ fontSize: '10px' }}>{t('volume_optional')}</label>
                                                                            <input
                                                                                type="number"
                                                                                className="input-field"
                                                                                placeholder="L"
                                                                                value={entry.quantity || ''}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...expenseEntries];
                                                                                    newEntries[index].quantity = e.target.value;

                                                                                    // Auto-calculate Rate if Amount and Liters are available
                                                                                    if (newEntries[index].amount && e.target.value) {
                                                                                        newEntries[index].rate = (Number(newEntries[index].amount) / Number(e.target.value)).toFixed(2);
                                                                                    }
                                                                                    setExpenseEntries(newEntries);
                                                                                }}
                                                                                style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                            />
                                                                        </div>
                                                                        <div className="input-wrapper-full">
                                                                            <label className="input-label" style={{ fontSize: '10px' }}>{t('rate_per_l')} *</label>
                                                                            <input
                                                                                type="number"
                                                                                className="input-field"
                                                                                placeholder="₹/L"
                                                                                value={entry.rate || ''}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...expenseEntries];
                                                                                    newEntries[index].rate = e.target.value;

                                                                                    // Auto-calculate Liters if Amount and Rate are available
                                                                                    if (newEntries[index].amount && e.target.value) {
                                                                                        newEntries[index].quantity = (Number(newEntries[index].amount) / Number(e.target.value)).toFixed(2);
                                                                                    }
                                                                                    setExpenseEntries(newEntries);
                                                                                }}
                                                                                style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                            />
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {entry.type === 'fuel' && (
                                                                    <div className="input-wrapper-full">
                                                                        <label className="input-label" style={{ fontSize: '10px' }}>{t('meterKm')} (Opt)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="input-field"
                                                                            placeholder="KM"
                                                                            value={entry.km}
                                                                            onChange={(e) => {
                                                                                const newEntries = [...expenseEntries];
                                                                                newEntries[index].km = e.target.value;
                                                                                setExpenseEntries(newEntries);
                                                                            }}
                                                                            style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {entry.type === 'fuel' && (
                                                                <>
                                                                    <div className="input-wrapper-full" style={{ marginTop: '4px', marginBottom: '16px' }}>
                                                                        <label className="input-label" style={{ fontSize: '10px', marginBottom: '6px' }}>{t('fuelType')}</label>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                                            {['Diesel', 'Petrol', 'CNG'].map((type) => (
                                                                                <button
                                                                                    key={type}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        newEntries[index].fuelType = type;
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '8px 4px',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '800',
                                                                                        border: '1px solid',
                                                                                        borderColor: entry.fuelType === type ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                                                        background: entry.fuelType === type ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                        color: entry.fuelType === type ? 'var(--primary)' : 'var(--text-muted)',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    {t(type.toLowerCase())}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="input-wrapper-full" style={{ marginTop: '4px', marginBottom: '16px' }}>
                                                                        <label className="input-label" style={{ fontSize: '10px', marginBottom: '6px' }}>{t('payment_source')}</label>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                            {['Office', 'Guest'].map((source) => (
                                                                                <button
                                                                                    key={source}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        newEntries[index].paymentSource = source;
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '8px 4px',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '800',
                                                                                        border: '1px solid',
                                                                                        borderColor: (entry.paymentSource || 'Office') === source ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                                                        background: (entry.paymentSource || 'Office') === source ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                        color: (entry.paymentSource || 'Office') === source ? 'var(--primary)' : 'var(--text-muted)',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    {t(source.toLowerCase())}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}

                                                            {entry.type === 'other' && (
                                                                <div className="input-wrapper-full" style={{ marginTop: '4px', marginBottom: '16px' }}>
                                                                    <label className="input-label" style={{ fontSize: '10px', marginBottom: '6px' }}>Service Type</label>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                                        {['Puncture', 'Car Wash', 'Tissue', 'Water', 'Other'].map((type) => {
                                                                            const isSelected = (entry.fuelType || '').split(',').includes(type);
                                                                            return (
                                                                                <button
                                                                                    key={type}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        let currentTypes = (entry.fuelType || '').split(',').filter(t => t !== '');
                                                                                        if (currentTypes.includes(type)) {
                                                                                            currentTypes = currentTypes.filter(t => t !== type);
                                                                                        } else {
                                                                                            currentTypes.push(type);
                                                                                        }
                                                                                        newEntries[index].fuelType = currentTypes.join(',');
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '8px 4px',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '800',
                                                                                        border: '1px solid',
                                                                                        borderColor: isSelected ? '#f43f5e' : 'rgba(255,255,255,0.1)',
                                                                                        background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                        color: isSelected ? '#f43f5e' : 'var(--text-muted)',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    {type}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}


                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                                <label className="input-label" style={{ fontSize: '10px' }}>{t('receipt')} ({t('optional')})</label>
                                                                {!entry.preview ? (
                                                                    <div
                                                                        onClick={() => {
                                                                            setActiveIndex(index);
                                                                            setActiveCamera('expense_slip');
                                                                        }}
                                                                        className="photo-capture-button"
                                                                        style={{ height: '80px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
                                                                    >
                                                                        <Camera size={24} color="var(--primary)" />
                                                                        <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>{t('captureSlip')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="photo-preview-container" style={{ height: '80px', borderRadius: '10px' }}>
                                                                        <img src={entry.preview} alt="Receipt" className="photo-preview-image" />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newEntries = [...expenseEntries];
                                                                                newEntries[index].slip = null;
                                                                                newEntries[index].preview = null;
                                                                                setExpenseEntries(newEntries);
                                                                            }}
                                                                            className="photo-delete-button"
                                                                            style={{ width: '24px', height: '24px', top: '5px', right: '5px' }}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}


                                                    <button
                                                        onClick={handleSubmitExpense}
                                                        disabled={isSubmitting}
                                                        className="btn-primary"
                                                        style={{ width: '100%', padding: '16px', fontWeight: '900', fontSize: '15px', borderRadius: '12px', marginTop: '10px', boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)' }}
                                                    >
                                                        {isSubmitting ? t('processing').toUpperCase() : t('submit').toUpperCase()}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Camera Modal - Moved to end to ensure it's always on top */}
                            {activeCamera && (
                                <CameraModal
                                    side={activeCamera === 'expense_slip' ? (expenseEntries[activeIndex]?.type === 'fuel' ? 'fuel' : (expenseEntries[activeIndex]?.type === 'parking' ? 'parking' : 'other')) : activeCamera}
                                    onCapture={(file, preview) => {
                                        if (activeCamera === 'selfie') {
                                            setSelfie(file);
                                            setSelfiePreview(preview);
                                        } else if (activeCamera === 'km') {
                                            setKmPhoto(file);
                                            setKmPreview(preview);
                                        } else if (activeCamera === 'car') {
                                            setCarSelfie(file);
                                            setCarPreview(preview);
                                        } else if (activeCamera === 'fuel') {
                                            const newEntries = [...fuelEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setFuelEntries(newEntries);
                                        } else if (activeCamera === 'parking') {
                                            const newEntries = [...parkingEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setParkingEntries(newEntries);
                                        } else if (activeCamera === 'expense_slip') {
                                            const newEntries = [...expenseEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setExpenseEntries(newEntries);
                                        }
                                    }}
                                    onClose={() => setActiveCamera(null)}
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'ledger' && (
                        <div className="ledger-section">
                            {/* ── Month / Year Selector ── */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                                border: '1px solid rgba(14,165,233,0.25)',
                                borderRadius: '18px',
                                padding: '16px 20px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                {/* Prev Month */}
                                <button
                                    onClick={() => {
                                        if (ledgerMonth === 1) { setLedgerMonth(12); setLedgerYear(y => y - 1); }
                                        else setLedgerMonth(m => m - 1);
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: '700', flexShrink: 0 }}
                                >‹</button>

                                {/* Month + Year display */}
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(14,165,233,0.8)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>📅 Select Month</p>
                                    <p style={{ fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                                        {new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'long' })} {ledgerYear}
                                    </p>
                                </div>

                                {/* Next Month */}
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        if (ledgerYear > now.getFullYear() || (ledgerYear === now.getFullYear() && ledgerMonth >= now.getMonth() + 1)) return;
                                        if (ledgerMonth === 12) { setLedgerMonth(1); setLedgerYear(y => y + 1); }
                                        else setLedgerMonth(m => m + 1);
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: '700', flexShrink: 0, opacity: (ledgerYear === new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear() && ledgerMonth >= new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1) ? 0.3 : 1 }}
                                >›</button>
                            </div>

                            {ledgerLoading ? (
                                <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                                    <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '13px', fontWeight: '600' }}>Loading data...</p>
                                </div>
                            ) : (
                                <div className="ledger-content">
                                    {/* Summary Cards */}
                                    <div className="ledger-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(16, 185, 129, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('totalEarned') || 'Earnings'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.totalEarned || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(245, 158, 11, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('workingDays') || 'Working Days'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{ledgerData?.summary?.workingDays || 0}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(244, 63, 94, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('pendingAdvance') || 'Advances'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.pendingAdvance || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(99, 102, 241, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>EMI (Loan)</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.totalEMI || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ gridColumn: 'span 2', padding: '16px', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(14, 165, 233, 0.9)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('netPayable') || 'Net Salary (In-Hand)'}</p>
                                            <h3 style={{ fontSize: '26px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.netPayable || 0).toLocaleString()}</h3>
                                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Calculated after advances and loan deductions</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleExportPDF}
                                        className="btn-primary"
                                        style={{ width: '100%', marginBottom: '24px', padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                    >
                                        <Download size={20} /> {t('downloadPDF') || 'Download PDF Report'} — {new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'short' })} {ledgerYear}
                                    </button>

                                    {/* Duty History */}
                                    <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('dutyHistory')}</h4>
                                    {(!ledgerData?.history || ledgerData.history.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No duty records for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {ledgerData?.history?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{toISTDateString(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.vehicle}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#10b981', fontWeight: '900', fontSize: '15px' }}>Rs. {(item.dailyWage || 0) + (item.bonuses || 0) + (item.parking || 0)}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            Wage: {item.dailyWage || 0}
                                                            {item.sameDayReturn > 0 ? ` + SD: ${item.sameDayReturn}` : ''}
                                                            {item.nightStay > 0 ? ` + NS: ${item.nightStay}` : ''}
                                                            {item.specialPay > 0 ? ` + SP: ${item.specialPay}` : ''}
                                                            {item.parking > 0 ? ` + Parking: ${item.parking}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Advance History */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('advanceHistory')}</h4>
                                    {(!ledgerData?.advances || ledgerData.advances.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No advances for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.advances?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f43f5e' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.remark}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#f43f5e', fontWeight: '900', fontSize: '15px' }}>Rs. {item.amount}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            {(item.status || '').toLowerCase() === 'recovered' ? 'SETTLED' : 'PAID'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Special Payout History (Allowance) */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('specialPayoutHistory')}</h4>
                                    {(!ledgerData?.allowances || ledgerData.allowances.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No special payouts for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.allowances?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #10b981' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.remark || item.type}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#10b981', fontWeight: '900', fontSize: '15px' }}>+ Rs. {item.amount}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            {(item.type || 'BONUS').toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Loan History */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('loanHistory') || 'Loan History'}</h4>
                                    {(!ledgerData?.loans || ledgerData.loans.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No active loans records</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.loans?.map(item => {
                                                const sDate = new Date(item.startDate);
                                                const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                                                const selVal = (parseInt(ledgerYear) * 12) + parseInt(ledgerMonth);
                                                const monthIdx = (selVal - sVal) + 1;
                                                const tenure = parseInt(item.tenureMonths, 10) || (item.monthlyEMI > 0 ? Math.round(item.totalAmount / item.monthlyEMI) : 1);
                                                const isCompleted = item.status === 'Completed' || monthIdx > tenure;

                                                return (
                                                    <div key={item._id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <div>
                                                                <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.startDate)}</p>
                                                                <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                                                                    {monthIdx > 0 && monthIdx <= tenure ? `Month ${monthIdx} of ${tenure}` : (isCompleted ? 'Loan Completed' : 'Loan Schedule')}
                                                                </p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '15px' }}>EMI: Rs. {item.monthlyEMI?.toLocaleString()}</p>
                                                                <span style={{
                                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900',
                                                                    background: item.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                                                                    color: item.status === 'Active' ? '#10b981' : 'rgba(255,255,255,0.4)'
                                                                }}>
                                                                    {item.status?.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', pt: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div>
                                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase' }}>Total Loan</p>
                                                                <p style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>Rs. {item.totalAmount?.toLocaleString()}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase' }}>Remaining</p>
                                                                <p style={{ color: '#f43f5e', fontSize: '13px', fontWeight: '900' }}>Rs. {item.remainingAmount?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverPortal;

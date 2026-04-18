import React from 'react';
import { 
    View, Text, StyleSheet, Modal, TouchableOpacity, 
    ScrollView, Dimensions, Platform
} from 'react-native';
import { 
    X, Calculator, Coins, TrendingUp, 
    CheckCircle2, Clock, Calendar, Star,
    Zap, Award, AlertCircle, ChevronRight,
    Search, Target, FileText, BadgeIndianRupee
} from 'lucide-react-native';
import Animated, { 
    FadeIn, FadeInDown, SlideInRight, 
    useAnimatedStyle, withSpring 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const OperationalBreakdown = ({ visible, onClose, data, type = 'staff' }) => {
    if (!data) return null;

    const isStaff = type === 'staff';

    const renderCoin = (icon, label, value, color) => (
        <View style={styles.coinCard}>
            <View style={[styles.coinCircle, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                {icon}
            </View>
            <View style={styles.coinInfo}>
                <Text style={styles.coinLabel}>{label}</Text>
                <Text style={[styles.coinValue, { color }]}>{value}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View 
                    entering={FadeInDown.springify()}
                    style={styles.modalContainer}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>{data.name?.charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={styles.nameLarge}>{data.name}</Text>
                                <Text style={styles.roleSmall}>{isStaff ? (data.designation || 'Staff Member') : 'Vendor Partner'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.mainGrid}>
                            {/* Left Side: Financial Intelligence */}
                            <View style={styles.sidebar}>
                                {/* Net Payable Card - Gold Styled */}
                                <View style={styles.goldCard}>
                                    <View style={styles.goldCardGlow} />
                                    <Text style={styles.goldCardLabel}>NET PAYABLE THIS CYCLE</Text>
                                    <View style={styles.goldCardAmountRow}>
                                        <Text style={styles.goldCardCurrency}>₹</Text>
                                        <Text style={styles.goldCardAmount}>
                                            {(isStaff ? (data.finalSalary || 0) : Math.abs(data.balance || 0)).toLocaleString()}
                                        </Text>
                                    </View>
                                    <Text style={styles.goldCardDate}>
                                        📅 {data.cycleStart || 'Current Billing Cycle'}
                                    </Text>
                                    <TouchableOpacity style={styles.downloadBtn}>
                                        <FileText size={16} color="#fbbf24" />
                                        <Text style={styles.downloadText}>DOWNLOAD SALARY SLIP</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Formula Banner */}
                                <View style={styles.formulaBanner}>
                                    <Text style={styles.formulaTitle}>📐 HOW IS SALARY CALCULATED?</Text>
                                    <Text style={styles.formulaText}>
                                        (Present + Paid Leaves + Sundays + Extras) × ₹{data.perDaySalary || Math.round((data.salary || 25000) / 30)}/day
                                    </Text>
                                </View>

                                {/* Detail List */}
                                <View style={styles.detailList}>
                                    <View style={styles.detailRow}>
                                        <View>
                                            <Text style={styles.detailRowLabel}>BASE SALARY</Text>
                                            <Text style={styles.detailRowSub}>÷30 = ₹{data.perDaySalary || Math.round((data.salary || 25000) / 30)}/day</Text>
                                        </View>
                                        <Text style={styles.detailRowValue}>₹{(data.salary || 0).toLocaleString()}</Text>
                                    </View>

                                    <View style={[styles.detailRow, { backgroundColor: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.14)' }]}>
                                        <View>
                                            <Text style={[styles.detailRowLabel, { color: '#10b981' }]}>✅ DAYS PRESENT</Text>
                                            <Text style={styles.detailRowSub}>Of {data.workingDaysPassed || 26} working days</Text>
                                        </View>
                                        <Text style={[styles.detailRowValue, { color: '#10b981' }]}>{data.presentDays || 0} days</Text>
                                    </View>

                                    <View style={[styles.detailRow, { backgroundColor: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.14)' }]}>
                                        <View>
                                            <Text style={[styles.detailRowLabel, { color: '#3b82f6' }]}>🎫 FREE LEAVE USED</Text>
                                            <Text style={styles.detailRowSub}>Allowance: {data.allowance || 4}/cycle</Text>
                                        </View>
                                        <Text style={[styles.detailRowValue, { color: '#3b82f6' }]}>{data.paidLeavesUsed || 0} days</Text>
                                    </View>
                                </View>

                                {/* Step-By-Step Panel - The Gold One the user wants */}
                                <View style={styles.stepByStepCard}>
                                    <Text style={styles.stepTitle}>🧮 STEP-BY-STEP</Text>
                                    <Text style={styles.stepFormula}>
                                        ({data.presentDays || 0} presents 
                                        {data.paidLeavesUsed > 0 ? ` + ${data.paidLeavesUsed} leaves` : ''}
                                        {(data.sundaysPassed || 0) > 0 ? ` + ${data.sundaysPassed} sundays` : ''}
                                        {(data.sundaysWorked || 0) > 0 ? ` + ${data.sundaysWorked} extras` : ''})
                                        × ₹{data.perDaySalary || Math.round((data.salary || 25000) / 30)}
                                    </Text>
                                    <Text style={styles.stepResult}>= ₹{(data.finalSalary || 0).toLocaleString()}</Text>
                                </View>
                            </View>

                            {/* Right Side: Operational Intelligence */}
                            <View style={styles.mainContent}>
                                {/* Operational Coins Panel */}
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>OPERATIONAL REWARDS</Text>
                                    <View style={styles.coinsBadge}>
                                        <Coins size={12} color="#fbbf24" />
                                        <Text style={styles.coinsBadgeText}>COINS EARNED: 1,420</Text>
                                    </View>
                                </View>

                                <View style={styles.coinGrid}>
                                    {renderCoin(<Zap size={18} color="#fbbf24" />, "Efficiency", "98.5%", "#fbbf24")}
                                    {renderCoin(<Star size={18} color="#10b981" />, "Punctuality", "26/26", "#10b981")}
                                    {renderCoin(<Award size={18} color="#3b82f6" />, "Safety Score", "4.9/5", "#3b82f6")}
                                </View>

                                {/* Calendar Mockup - Key UI element */}
                                <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 15 }]}>SALARY CYCLE CALENDAR</Text>
                                <View style={styles.calendarContainer}>
                                    <View style={styles.calendarHeader}>
                                        <Text style={styles.calendarMonth}>APRIL 2026</Text>
                                        <View style={styles.calendarLegend}>
                                            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>PRS</Text></View>
                                            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f43f5e' }]} /><Text style={styles.legendText}>ABS</Text></View>
                                            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#fbbf24' }]} /><Text style={styles.legendText}>SUN</Text></View>
                                        </View>
                                    </View>
                                    <View style={styles.daysGrid}>
                                        {[...Array(26)].map((_, i) => (
                                            <View key={i} style={styles.dayCell}>
                                                <Text style={styles.dayNum}>{i + 1}</Text>
                                                <View style={[styles.statusIndicator, { backgroundColor: i === 16 ? '#f43f5e' : (i % 6 === 0 ? '#fbbf24' : '#10b981') }]} />
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Accrual Stats */}
                                <View style={styles.accrualRow}>
                                    <View style={styles.accrualBox}>
                                        <Text style={styles.accrualLabel}>PAYROLL ACCRUAL</Text>
                                        <View style={styles.accrualBar}>
                                            <View style={[styles.accrualFill, { width: '85%', backgroundColor: '#fbbf24' }]} />
                                        </View>
                                        <Text style={styles.accrualVal}>85% Complete</Text>
                                    </View>
                                    <View style={styles.accrualBox}>
                                        <Text style={styles.accrualLabel}>ATTENDANCE RATE</Text>
                                        <View style={styles.accrualBar}>
                                            <View style={[styles.accrualFill, { width: '96%', backgroundColor: '#10b981' }]} />
                                        </View>
                                        <Text style={styles.accrualVal}>96.2% High</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15
    },
    modalContainer: {
        width: '100%',
        maxWidth: 900,
        height: height * 0.85,
        backgroundColor: '#080c14',
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 },
            android: { elevation: 20 },
            web: { boxShadow: '0px 20px 30px rgba(0,0,0,0.5)' }
        })
    },
    header: {
        padding: 25,
        paddingBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    avatarLarge: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarLargeText: {
        color: '#fbbf24',
        fontSize: 22,
        fontWeight: '800'
    },
    nameLarge: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    roleSmall: {
        color: '#fbbf24',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    scrollContent: {
        paddingBottom: 40
    },
    mainGrid: {
        flexDirection: Platform.select({ ios: 'column', android: 'column', default: 'row' }),
        padding: 20,
        gap: 20
    },
    sidebar: {
        flex: 1.2,
        gap: 15
    },
    mainContent: {
        flex: 2,
        gap: 15
    },
    goldCard: {
        backgroundColor: 'rgba(251, 191, 36, 0.05)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        padding: 20,
        alignItems: 'center',
        overflow: 'hidden'
    },
    goldCardGlow: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: '200%',
        height: '200%',
        backgroundColor: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 50%)',
        opacity: 0.5
    },
    goldCardLabel: {
        color: '#fbbf24',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 2
    },
    goldCardAmountRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 10
    },
    goldCardCurrency: {
        color: '#fbbf24',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 5,
        marginRight: 4
    },
    goldCardAmount: {
        color: 'white',
        fontSize: 44,
        fontWeight: '950',
        letterSpacing: -2,
        textShadow: '0 0 30px rgba(251, 191, 36, 0.4)',
    },
    goldCardDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 8
    },
    downloadBtn: {
        marginTop: 20,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    downloadText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800'
    },
    formulaBanner: {
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.18)',
        borderRadius: 14,
        padding: 12
    },
    formulaTitle: {
        color: '#818cf8',
        fontSize: 9,
        fontWeight: '800'
    },
    formulaText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 5,
        lineHeight: 16
    },
    detailList: {
        gap: 8
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    detailRowLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '800'
    },
    detailRowSub: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 8,
        fontWeight: '600',
        marginTop: 2
    },
    detailRowValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: '800'
    },
    stepByStepCard: {
        backgroundColor: 'rgba(251, 191, 36, 0.05)',
        borderWidth: 1,
        borderColor: '#fbbf24',
        borderRadius: 20,
        padding: 15,
        borderStyle: 'solid'
    },
    stepTitle: {
        color: '#fbbf24',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1
    },
    stepFormula: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 8,
        lineHeight: 18
    },
    stepResult: {
        color: '#fbbf24',
        fontSize: 20,
        fontWeight: '950',
        marginTop: 5
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    sectionTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    coinsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)'
    },
    coinsBadgeText: {
        color: '#fbbf24',
        fontSize: 9,
        fontWeight: '900'
    },
    coinGrid: {
        flexDirection: 'row',
        gap: 12
    },
    coinCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    coinCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    coinInfo: {
        alignItems: 'center'
    },
    coinLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    coinValue: {
        fontSize: 15,
        fontWeight: '900',
        marginTop: 2
    },
    calendarContainer: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 20
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    calendarMonth: {
        color: 'white',
        fontSize: 15,
        fontWeight: '900'
    },
    calendarLegend: {
        flexDirection: 'row',
        gap: 12
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    legendText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '800'
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between'
    },
    dayCell: {
        width: '12%',
        aspectRatio: 0.8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6
    },
    dayNum: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 10,
        fontWeight: '700'
    },
    statusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    accrualRow: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 10
    },
    accrualBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    accrualLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    accrualBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        marginTop: 10,
        overflow: 'hidden'
    },
    accrualFill: {
        height: '100%',
        borderRadius: 2
    },
    accrualVal: {
        color: 'white',
        fontSize: 10,
        fontWeight: '800',
        marginTop: 8
    }
});

export default OperationalBreakdown;

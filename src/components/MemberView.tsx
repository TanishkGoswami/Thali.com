import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RefreshCw,
  UtensilsCrossed,
  History,
  Clock,
  X,
  PhoneCall,
  Camera,
  CheckCircle2,
  AlertCircle,
  Printer,
  QrCode,
  User,
  Lock,
  Zap
} from 'lucide-react';
import type { Profile, DailyMenu, MealTransaction, CheckInResult, MealPeriod, MealPlanType, MealSkip } from '../types';
import { MEAL_PLAN_CONFIG } from '../types';
import { api, COUNTER_STANDEE_QR } from '../services/api';
import { sound } from '../lib/audio';
import { settingsService } from '../services/settings';
import { PaymentActivationModal } from './PaymentActivationModal';
import { CameraScannerModal } from './CameraScannerModal';
import { CounterQrModal } from './CounterQrModal';
import { MealSkipCard } from './MealSkipCard';

interface MemberViewProps {
  member: Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string; payment_method?: 'cash' | 'upi_direct' };
  menus: DailyMenu[];
  activeMealPeriod: MealPeriod;
  onRefresh: () => void;
  onOpenProfile?: () => void;
  onSwitchToAdmin?: () => void;
}

export const MemberView: React.FC<MemberViewProps> = ({
  member,
  menus,
  activeMealPeriod,
  onRefresh,
  onOpenProfile,
  onSwitchToAdmin
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPaymentActivationModal, setShowPaymentActivationModal] = useState(false);

  // Card Flip / View Personal QR toggle
  const [showPersonalQr, setShowPersonalQr] = useState(false);

  // Self Check-in Camera Scanner
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [selfCheckInLoading, setSelfCheckInLoading] = useState(false);
  const [selfCheckInReceipt, setSelfCheckInReceipt] = useState<CheckInResult | null>(null);
  const [showAdminCounterStandee, setShowAdminCounterStandee] = useState(false);
  const [selectedMenuTab, setSelectedMenuTab] = useState<MealPeriod>(activeMealPeriod);
  const [otpEnabled, setOtpEnabled] = useState<boolean>(settingsService.getInstantOtpEnabled());

  useEffect(() => {
    settingsService.isOtpEnabled().then(setOtpEnabled);
    const unsubscribe = settingsService.subscribeToOtpSetting(setOtpEnabled);
    return unsubscribe;
  }, []);

  // Derive member's 2-meal plan config & slot permission
  const planType: MealPlanType = member.meal_plan_type || 'lunch_dinner';
  const planConfig = MEAL_PLAN_CONFIG[planType];
  const isSlotPermitted = planType === 'any_two' || (Array.isArray(planConfig.allowedPeriods) && planConfig.allowedPeriods.includes(activeMealPeriod));

  // Member meal passbook state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<MealTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Member Meal Skip ('Not Coming') state
  const [memberSkips, setMemberSkips] = useState<MealSkip[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  const loadMemberSkips = async () => {
    if (!member?.id) return;
    try {
      const data = await api.getMemberMealSkips(member.id);
      setMemberSkips(data);
    } catch (err) {
      console.error('Error fetching member skips:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        onRefresh(),
        loadMemberSkips()
      ]);
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 2500);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMemberSkips();
  }, [member?.id]);


  useEffect(() => {
    if (showPersonalQr && canvasRef.current && member?.qr_token) {
      QRCode.toCanvas(canvasRef.current, member.qr_token, {
        width: 170,
        margin: 1,
        color: {
          dark: '#0d253d',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Render error:', error);
      });
    }
  }, [showPersonalQr, member?.qr_token]);

  // Handle Self Check-in when student scans Counter QR
  const handleSelfCheckInScan = async (scannedText: string) => {
    setShowCameraScanner(false);
    setSelfCheckInLoading(true);

    try {
      // Check if scanned QR is the official counter QR or staff token
      const isOfficialCounter = scannedText.includes('THALI_OFFICIAL_COUNTER_QR') || scannedText === COUNTER_STANDEE_QR;
      
      if (!isOfficialCounter) {
        sound.playError();
        setSelfCheckInReceipt({
          success: false,
          code: 'INVALID_QR',
          message: 'Invalid Counter QR. Please point your camera at the official Thali.com Mess Desk Standee QR.'
        });
        return;
      }

      if (member.subscription_status !== 'active') {
        sound.playError();
        setSelfCheckInReceipt({
          success: false,
          code: 'PAYMENT_PENDING',
          message: 'Payment Pending: Please pay ₹2,800 at the mess counter. Admin must activate your pass before dining.'
        });
        return;
      }

      if (!member.phone_verified) {
        sound.playError();
        setSelfCheckInReceipt({
          success: false,
          code: 'PHONE_NOT_VERIFIED',
          message: otpEnabled
            ? 'Phone Verification Required: Please verify your mobile number via OTP before dining.'
            : 'Phone Number Required: Please link your mobile number before dining.'
        });
        return;
      }

      // Perform check in for the current member
      const result = await api.checkInMeal(member.qr_token, activeMealPeriod);
      setSelfCheckInReceipt(result);

      if (result.success && result.code === 'ACCEPTED') {
        sound.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (result.code === 'DUPLICATE_CHECKIN' || result.code === 'PLAN_NOT_PERMITTED' || result.code === 'DAILY_LIMIT_EXCEEDED' || result.code === 'MEAL_SKIPPED') {
        sound.playWarning();
      } else {
        sound.playError();
      }

      onRefresh();
      loadMemberSkips();
    } catch (err: any) {
      sound.playError();
      setSelfCheckInReceipt({
        success: false,
        code: 'ERROR',
        message: err?.message || 'Check-in failed due to network error.'
      });
    } finally {
      setSelfCheckInLoading(false);
    }
  };

  const loadMemberHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const records = await api.getMemberHistory(member.id);
      setHistoryList(records);
    } catch (e) {
      console.error('Error fetching member history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const totalMeals = 54;
  const remainingMeals = member.remaining_meals ?? 0;
  const consumedMeals = totalMeals - remainingMeals;
  const percentage = totalMeals > 0 ? Math.round((remainingMeals / totalMeals) * 100) : 0;

  const formattedExpiry = member.expires_at
    ? new Date(member.expires_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '30 Days from activation';

  const todayMenu = menus.find(m => m.meal_period === selectedMenuTab) || menus.find(m => m.meal_period === activeMealPeriod) || menus[0];

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* If logged in user is Owner Admin, show Admin Banner with Print QR Standee action */}
      {member.role === 'owner_admin' && (
        <div style={{
          backgroundColor: '#0d253d',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-level-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#93c5fd',
              flexShrink: 0
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                Owner Admin Mode Active
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
                You are viewing student pass preview. Need the counter QR standee to print?
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowAdminCounterStandee(true)}
              className="btn btn-pill"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                fontSize: '12px',
                gap: '6px'
              }}
            >
              <Printer size={13} /> Print Counter Standee QR
            </button>
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="btn btn-pill"
                style={{
                  backgroundColor: '#ffffff',
                  color: 'var(--color-ink)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Go to Admin Dashboard →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner / Welcome */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '16px'
      }}>
        <div>
          <span className="eyebrow">Student & Member Portal</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px' }}>
            Namaste, {member.full_name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px' }}>
            Current Slot: <strong style={{ textTransform: 'capitalize', color: 'var(--color-ink)' }}>{activeMealPeriod} Service</strong>
            {!isSlotPermitted && (
              <span style={{ color: '#b45309', fontWeight: 600, marginLeft: '8px', fontSize: '12px' }}>
                (⚠️ Outside your {planConfig.name} pass)
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="btn btn-secondary btn-pill"
              title="View & Edit Account Profile"
            >
              <User size={13} /> Profile
            </button>
          )}
          <button
            type="button"
            onClick={loadMemberHistory}
            className="btn btn-secondary btn-pill"
            title="View Meal Passbook"
          >
            <History size={13} /> Passbook
          </button>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '12px', padding: '5px 12px', gap: '5px' }}
            title="Refresh Member Data & Skips"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : refreshToast ? '✓ Updated!' : 'Refresh'}
          </button>

          <span className={`badge badge-${member.subscription_status === 'active' ? 'active' : 'pending'}`}>
            {member.subscription_status === 'active' ? '● Active Plan' : 'Pending Verification'}
          </span>
        </div>
      </div>

      {/* Pending Activation & Phone Verification Notice */}
      {(!member.phone_verified || member.subscription_status !== 'active') && (
        member.subscription_status !== 'active' ? (
          // State 1: Member has not paid yet / Admin has not confirmed payment
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px 18px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-pending" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Step 1: Payment Pending
                </span>
                <span className="tnum" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)' }}>
                  Monthly Fee: ₹2,800 (54 Meals)
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                Mess counter par jakar <strong>Cash ya UPI (Online)</strong> se payment karein. Admin dwara payment confirm karne ke baad hi aapka OTP verification unlock hoga.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#b45309' }}>
                <Lock size={12} />
                <span>Phone & OTP verification locked until payment is verified by Mess Admin.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                disabled
                className="btn btn-secondary btn-pill"
                style={{
                  cursor: 'not-allowed',
                  opacity: 0.7,
                  backgroundColor: '#f3f4f6',
                  borderColor: '#e5e7eb',
                  color: '#6b7280',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '8px 14px'
                }}
                title="Payment must be confirmed by Admin before phone verification"
              >
                <Lock size={13} /> OTP Locked (Pay at Counter)
              </button>
              <span style={{ fontSize: '10px', color: 'var(--color-ink-mute)', textAlign: 'center' }}>
                Visit counter to pay
              </span>
            </div>
          </div>
        ) : (
          // State 2: Admin has confirmed payment (Cash or Online), but Phone not yet verified via OTP
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px 18px',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-active" style={{ fontSize: '11px', fontWeight: 600 }}>
                  ✅ Step 2: Payment Received ({member.payment_method === 'cash' ? '💵 Cash' : '📱 Online / UPI'})
                </span>
                <span className="tnum" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)' }}>
                  Pass Approved • ₹2,800 Paid
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                {otpEnabled
                  ? 'Admin ne aapka payment confirm kar diya hai! Ab apna 10-digit mobile number 1-time OTP se verify karke dining pass start karein.'
                  : 'Admin ne aapka payment confirm kar diya hai! Apna 10-digit mobile number link karke bina OTP ke turant dining pass start karein.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentActivationModal(true)}
              className="btn btn-primary btn-pill btn-mobile-full"
              style={{
                gap: '6px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: !otpEnabled ? '#16a34a' : undefined,
                borderColor: !otpEnabled ? '#15803d' : undefined,
                boxShadow: !otpEnabled ? '0 2px 8px rgba(22, 163, 74, 0.25)' : '0 2px 8px rgba(83, 58, 253, 0.25)'
              }}
            >
              {!otpEnabled ? (
                <>
                  <Zap size={14} /> Link Phone & Activate Pass
                </>
              ) : (
                <>
                  <PhoneCall size={14} /> Verify Phone via OTP
                </>
              )}
            </button>
          </div>
        )
      )}

      {/* Self Check-In CTA Bar (Model 2: Student scans mess counter QR) */}
      <div style={{
        background: 'linear-gradient(135deg, #533afd 0%, #4434d4 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 4px 18px rgba(83, 58, 253, 0.28)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Camera size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600 }}>
              At the Mess Counter? Self Check-In Now
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', marginTop: '2px' }}>
              Scan the counter standee QR to deduct 1 meal & get instant food plate approval
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={selfCheckInLoading}
          onClick={() => setShowCameraScanner(true)}
          className="btn"
          style={{
            backgroundColor: '#ffffff',
            color: 'var(--color-primary)',
            fontWeight: 600,
            padding: '10px 20px',
            fontSize: '13px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
          }}
        >
          <Camera size={15} /> {selfCheckInLoading ? 'Checking...' : 'Scan Counter QR'}
        </button>
      </div>

      {/* Grid: Digital Mess ID Card & Quota Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Clean Digital Mess Membership Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1f38 0%, #102a4c 55%, #0a1829 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 36px -10px rgba(7, 21, 38, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '230px'
        }}>
          {/* Subtle Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Top Row: Brand & Pass Type */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/logo.png"
                alt="Thali.com"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  objectFit: 'contain',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.14)'
                }}
              />
              <div>
                <div style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.15 }}>
                  Thali<span style={{ color: '#60a5fa' }}>.com</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '3px', fontWeight: 500 }}>
                  {planConfig.name} Pass
                </div>
              </div>
            </div>

            {/* Clean Monospace Card Identifier (No badge) */}
            <div className="tnum" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              MESS • {member.member_number}
            </div>
          </div>

          {/* Bottom Section: Cardholder & Validity */}
          <div style={{ position: 'relative', zIndex: 1, marginTop: '28px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              gap: '12px'
            }}>
              <div>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '2px'
                }}>
                  CARD HOLDER
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', letterSpacing: '0.01em' }}>
                  {member.full_name}
                </div>
                <div className="tnum" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  {member.phone ? `+91 ${member.phone}` : 'No phone linked'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '2px'
                }}>
                  VALID THRU
                </div>
                <div className="tnum" style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fef08a'
                }}>
                  {formattedExpiry}
                </div>
              </div>
            </div>

            {/* Card Footer: Meals Left & Show Personal QR */}
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span className="tnum" style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6ee7b7'
              }}>
                {remainingMeals} / {totalMeals} Meals Left
              </span>

              <button
                type="button"
                onClick={() => setShowPersonalQr(!showPersonalQr)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease'
                }}
              >
                {showPersonalQr ? 'Hide Personal QR' : 'Show Personal QR'}
              </button>
            </div>
          </div>

          {/* Expandable Personal QR Canvas (Fallback for counter staff scanner) */}
          {showPersonalQr && (
            <div style={{
              position: 'relative',
              zIndex: 2,
              marginTop: '16px',
              padding: '14px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <canvas ref={canvasRef} />
              <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '6px', fontWeight: 500 }}>
                Show this if staff uses counter barcode scanner
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Quota Breakdown & Validity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow">Quota Details</span>
                <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Meal Balance</h2>
              </div>
              <span className="badge badge-active tnum">₹2,800 Plan</span>
            </div>

            {/* Circular Progress & Tabular Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '16px 0',
              padding: '14px',
              backgroundColor: 'var(--color-canvas-soft)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-hairline)',
              flexWrap: 'wrap'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: `conic-gradient(var(--color-primary) ${percentage * 3.6}deg, #e3e8ee 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="tnum" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{percentage}%</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="tnum" style={{
                    fontSize: '32px',
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: '-1px',
                    color: remainingMeals <= 5 ? 'var(--color-error)' : 'var(--color-ink)'
                  }}>
                    {remainingMeals}
                  </span>
                  <span className="tnum" style={{ fontSize: '14px', color: 'var(--color-ink-mute)', fontWeight: 400 }}>
                    / {totalMeals} Meals
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                  1 Lunch + 1 Dinner allowed per day
                </p>
              </div>
            </div>

            {/* Validity Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Validity Period</span>
                <span className="tnum" style={{ fontWeight: 500 }}>{formattedExpiry}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Consumed Quota</span>
                <span className="tnum" style={{ fontWeight: 500 }}>{consumedMeals} meals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Rollover Policy</span>
                <span style={{ color: 'var(--color-ink-secondary)', fontWeight: 400 }}>Unused meals expire after 30d</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setShowPaymentActivationModal(true)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
          >
            <Sparkles size={14} /> {member.subscription_status === 'active' ? 'Renew Subscription (₹2,800)' : (otpEnabled ? 'Verify Phone & Activate (₹2,800)' : 'Link Phone & Activate Pass (₹2,800)')}
          </button>
        </div>
      </div>

      {/* Meal Skip / Not Coming Feature Card */}
      <MealSkipCard
        memberId={member.id}
        mealPlanType={planType}
        skips={memberSkips}
        onRefreshSkips={loadMemberSkips}
      />

      {/* Today's Menu Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span className="eyebrow">Dining Menu</span>
            <h2 style={{ fontSize: '20px', marginTop: '2px' }}>
              Today's {selectedMenuTab === 'breakfast' ? 'Breakfast Specials' : selectedMenuTab === 'lunch' ? 'Lunch Specials' : 'Dinner Specials'}
            </h2>
          </div>

          {/* Meal Period View Switcher for Menu */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '2px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-hairline)',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setSelectedMenuTab('breakfast')}
              className="btn btn-pill"
              style={{
                backgroundColor: selectedMenuTab === 'breakfast' ? '#ffffff' : 'transparent',
                color: selectedMenuTab === 'breakfast' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: selectedMenuTab === 'breakfast' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '11px',
                fontWeight: selectedMenuTab === 'breakfast' ? 600 : 400,
                padding: '3px 8px'
              }}
            >
              Breakfast
            </button>
            <button
              type="button"
              onClick={() => setSelectedMenuTab('lunch')}
              className="btn btn-pill"
              style={{
                backgroundColor: selectedMenuTab === 'lunch' ? '#ffffff' : 'transparent',
                color: selectedMenuTab === 'lunch' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: selectedMenuTab === 'lunch' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '11px',
                fontWeight: selectedMenuTab === 'lunch' ? 600 : 400,
                padding: '3px 8px'
              }}
            >
              Lunch
            </button>
            <button
              type="button"
              onClick={() => setSelectedMenuTab('dinner')}
              className="btn btn-pill"
              style={{
                backgroundColor: selectedMenuTab === 'dinner' ? '#ffffff' : 'transparent',
                color: selectedMenuTab === 'dinner' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: selectedMenuTab === 'dinner' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '11px',
                fontWeight: selectedMenuTab === 'dinner' ? 600 : 400,
                padding: '3px 8px'
              }}
            >
              Dinner
            </button>
          </div>
        </div>

        {todayMenu?.items && todayMenu.items.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '10px'
          }}>
            {todayMenu.items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-hairline)',
                  flexShrink: 0
                }}>
                  <UtensilsCrossed size={13} />
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h4>
                  <span style={{ fontSize: '10px', color: 'var(--color-ink-mute)' }}>
                    {item.category || 'Special'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px' }}>Menu is being updated by the kitchen.</p>
        )}
      </div>

      {/* Self Check-in Success / Result Receipt Modal */}
      {selfCheckInReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(13, 37, 61, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 160,
          padding: '16px'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '24px 20px',
            boxShadow: 'var(--shadow-modal)',
            textAlign: 'center',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: selfCheckInReceipt.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
              color: selfCheckInReceipt.success ? 'var(--color-success)' : 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              {selfCheckInReceipt.success ? (
                <CheckCircle2 size={36} />
              ) : (
                <AlertCircle size={36} />
              )}
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)' }}>
              {selfCheckInReceipt.success ? 'Check-in Approved!' : 'Check-in Issue'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
              {selfCheckInReceipt.message}
            </p>

            {/* Approved Digital Receipt Box */}
            {selfCheckInReceipt.success && (
              <div style={{
                backgroundColor: 'var(--color-canvas-soft)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                border: '1px solid var(--color-hairline)',
                margin: '18px 0',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-ink-mute)' }}>Member:</span>
                  <strong>{member.full_name} ({member.member_number})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-ink-mute)' }}>Session:</span>
                  <strong style={{ textTransform: 'capitalize' }}>{activeMealPeriod} Service</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-ink-mute)' }}>Deduction:</span>
                  <span className="tnum" style={{ color: 'var(--color-error)', fontWeight: 600 }}>-1 Meal</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink-mute)' }}>Remaining Quota:</span>
                  <span className="tnum" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    {selfCheckInReceipt.remaining_meals} Meals Left
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelfCheckInReceipt(null)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              Done & Show to Mess Counter
            </button>
          </div>
        </div>
      )}

      {/* Optical Camera Scanner for Scanning Counter QR */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleSelfCheckInScan}
        mealPeriod={activeMealPeriod}
      />

      {/* Passbook Ledger Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(13, 37, 61, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '20px 16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="eyebrow">Audit Ledger</span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>Meal Passbook</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-outline btn-pill"
                style={{ padding: '6px', border: 'none', color: 'var(--color-ink-mute)' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: '13px' }}>
                Loading records...
              </div>
            ) : historyList.length > 0 ? (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {historyList.map(tx => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-canvas-soft)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-hairline)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
                          {tx.meal_period === 'breakfast' ? 'Breakfast' : tx.meal_period === 'lunch' ? 'Lunch' : tx.meal_period === 'dinner' ? 'Dinner' : 'Adjustment'}
                        </span>
                        <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <span className="tnum" style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: tx.meal_delta < 0 ? 'var(--color-error)' : 'var(--color-success)'
                    }}>
                      {tx.meal_delta < 0 ? `${tx.meal_delta}` : `+${tx.meal_delta}`} Meal
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-mute)', backgroundColor: 'var(--color-canvas-soft)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                No meal transactions recorded yet.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="btn btn-secondary btn-pill"
              style={{ width: '100%' }}
            >
              Close Passbook
            </button>
          </div>
        </div>
      )}

      {/* Payment & Phone Verification Modal */}
      <PaymentActivationModal
        isOpen={showPaymentActivationModal}
        onClose={() => setShowPaymentActivationModal(false)}
        member={member}
        onSuccess={onRefresh}
      />

      {/* Official Mess Counter Standee QR Modal for Admin */}
      <CounterQrModal
        isOpen={showAdminCounterStandee}
        onClose={() => setShowAdminCounterStandee(false)}
        activeMealPeriod={activeMealPeriod}
      />
    </div>
  );
};

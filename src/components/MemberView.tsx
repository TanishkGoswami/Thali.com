import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Sparkles, RefreshCw, UtensilsCrossed, ShieldCheck, History, Clock, X, PhoneCall } from 'lucide-react';
import type { Profile, DailyMenu, MealTransaction } from '../types';
import { api } from '../services/api';
import { PaymentActivationModal } from './PaymentActivationModal';

interface MemberViewProps {
  member: Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string };
  menus: DailyMenu[];
  activeMealPeriod: 'lunch' | 'dinner';
  onRefresh: () => void;
}

export const MemberView: React.FC<MemberViewProps> = ({
  member,
  menus,
  activeMealPeriod,
  onRefresh
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPaymentActivationModal, setShowPaymentActivationModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi_direct' | 'cash' | 'gateway'>('upi_direct');
  const [renewing, setRenewing] = useState(false);
  
  // Member meal passbook state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<MealTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (canvasRef.current && member?.qr_token) {
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
  }, [member?.qr_token]);

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
  const remainingMeals = member.remaining_meals ?? 41;
  const consumedMeals = totalMeals - remainingMeals;
  const percentage = Math.round((remainingMeals / totalMeals) * 100);

  const todayMenu = menus.find(m => m.meal_period === activeMealPeriod) || menus[0];

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
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
          <span className="eyebrow">Member Portal</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px' }}>
            Namaste, {member.full_name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px' }}>
            Pass ID: <strong className="tnum" style={{ color: 'var(--color-ink)' }}>{member.member_number}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
            onClick={onRefresh}
            className="btn btn-secondary btn-pill"
            title="Refresh Data"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <span className={`badge badge-${member.subscription_status === 'active' ? 'active' : 'pending'}`}>
            {member.subscription_status === 'active' ? '● Active' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Pending Activation & Phone Verification Notice */}
      {(!member.phone_verified || member.subscription_status !== 'active') && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div>
            <div className="tnum" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)' }}>
              ⚡ Plan Activation Pending — ₹2,800 / 54 Meals
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', marginTop: '2px' }}>
              Verify mobile number via SMS to activate digital pass & start dining.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPaymentActivationModal(true)}
            className="btn btn-primary btn-pill btn-mobile-full"
          >
            <PhoneCall size={13} /> Verify & Activate Pass
          </button>
        </div>
      )}

      {/* Grid: QR Pass & Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Digital QR Meal Pass */}
        <div className="card" style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div className="tnum" style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            backgroundColor: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-ink-mute)'
          }}>
            #{member.member_number}
          </div>

          <span className="eyebrow" style={{ marginTop: '2px' }}>
            Venue QR Pass
          </span>

          <div style={{
            padding: '10px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-level-1)',
            margin: '14px 0',
            border: '1px solid var(--color-hairline)',
            maxWidth: '100%'
          }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
          </div>

          <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {member.full_name}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px', maxWidth: '240px' }}>
            Show this QR at the reception scanner during meal service.
          </p>

          <div className="badge badge-indigo" style={{ marginTop: '14px', gap: '5px' }}>
            <ShieldCheck size={12} /> Server Verified Token
          </div>
        </div>

        {/* Card 2: Meal Balance & Validity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow">Monthly Quota</span>
                <h2 style={{ fontSize: '22px', marginTop: '2px' }}>Meal Balance</h2>
              </div>
              <span className="badge badge-active tnum">₹2,800 Plan</span>
            </div>

            {/* Circular Progress & Tabular Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '18px 0',
              padding: '16px',
              backgroundColor: 'var(--color-canvas-soft)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-hairline)',
              flexWrap: 'wrap'
            }}>
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: `conic-gradient(var(--color-primary) ${percentage * 3.6}deg, #e3e8ee 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="tnum" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>{percentage}%</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="tnum" style={{
                    fontSize: '36px',
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: '-1px',
                    color: remainingMeals <= 5 ? 'var(--color-error)' : 'var(--color-ink)'
                  }}>
                    {remainingMeals}
                  </span>
                  <span className="tnum" style={{ fontSize: '15px', color: 'var(--color-ink-mute)', fontWeight: 400 }}>
                    / {totalMeals} Meals
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                  Shared across Lunch & Dinner
                </p>
              </div>
            </div>

            {/* Expiry Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Validity Window</span>
                <span className="tnum" style={{ fontWeight: 500 }}>30 Days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Meals Consumed</span>
                <span className="tnum" style={{ fontWeight: 500 }}>{consumedMeals} meals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Renewal Policy</span>
                <span style={{ color: 'var(--color-ink-secondary)', fontWeight: 400 }}>30d auto rollover</span>
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
            <Sparkles size={14} /> {member.subscription_status === 'active' ? 'Renew Subscription (₹2,800)' : 'Verify Phone & Activate (₹2,800)'}
          </button>
        </div>
      </div>

      {/* Today's Menu Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span className="eyebrow">Dining Menu</span>
            <h2 style={{ fontSize: '20px', marginTop: '2px' }}>
              Today's {activeMealPeriod === 'lunch' ? 'Lunch Specials' : 'Dinner Specials'}
            </h2>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)', backgroundColor: 'var(--color-canvas-soft)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-hairline)' }}>
            Pure Desi Ghee
          </span>
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
                          {tx.meal_period === 'lunch' ? 'Lunch' : tx.meal_period === 'dinner' ? 'Dinner' : 'Adjustment'}
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
    </div>
  );
};

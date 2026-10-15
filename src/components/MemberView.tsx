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
        width: 180,
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
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner / Welcome */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '20px'
      }}>
        <div>
          <span className="eyebrow">Member Portal</span>
          <h1 style={{ fontSize: '32px', marginTop: '4px' }}>
            Namaste, {member.full_name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '14px', marginTop: '2px' }}>
            Member Pass ID: <strong className="tnum" style={{ color: 'var(--color-ink)' }}>{member.member_number}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadMemberHistory}
            className="btn btn-secondary btn-pill"
            title="View Meal Passbook Ledger"
          >
            <History size={13} /> Meal Passbook
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-secondary btn-pill"
            title="Refresh Live Data"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <span className={`badge badge-${member.subscription_status === 'active' ? 'active' : 'pending'}`}>
            {member.subscription_status === 'active' ? '● Active Subscription' : 'Pending Payment'}
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
          gap: '14px',
          padding: '16px 20px',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div>
            <div className="tnum" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)' }}>
              ⚡ Plan Activation Pending — ₹2,800 / 54 Meals
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', marginTop: '2px' }}>
              Verify your mobile number via SMS to confirm your contact and activate your digital QR meal pass.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPaymentActivationModal(true)}
            className="btn btn-primary btn-pill"
          >
            <PhoneCall size={13} /> Verify Phone & Activate Pass
          </button>
        </div>
      )}

      {/* Grid: QR Pass & Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
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
            top: '16px',
            right: '16px',
            backgroundColor: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-ink-mute)'
          }}>
            PASS #{member.member_number}
          </div>

          <span className="eyebrow" style={{ marginTop: '4px' }}>
            Digital Venue Pass
          </span>

          <div style={{
            padding: '12px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-level-1)',
            margin: '18px 0',
            border: '1px solid var(--color-hairline)'
          }}>
            <canvas ref={canvasRef} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {member.full_name}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '3px', maxWidth: '260px' }}>
            Show this QR code at reception scanner during meal service.
          </p>

          <div className="badge badge-indigo" style={{ marginTop: '16px', gap: '5px' }}>
            <ShieldCheck size={13} /> Server Verified Token
          </div>
        </div>

        {/* Card 2: Meal Balance & Validity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow">Subscription Status</span>
                <h2 style={{ fontSize: '24px', marginTop: '2px' }}>Meal Balance</h2>
              </div>
              <span className="badge badge-active tnum">₹2,800 Plan</span>
            </div>

            {/* Circular Progress & Tabular Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              margin: '24px 0',
              padding: '18px',
              backgroundColor: 'var(--color-canvas-soft)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-hairline)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `conic-gradient(var(--color-primary) ${percentage * 3.6}deg, #e3e8ee 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="tnum" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>{percentage}%</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="tnum" style={{
                    fontSize: '42px',
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: '-1px',
                    color: remainingMeals <= 5 ? 'var(--color-error)' : 'var(--color-ink)'
                  }}>
                    {remainingMeals}
                  </span>
                  <span className="tnum" style={{ fontSize: '16px', color: 'var(--color-ink-mute)', fontWeight: 400 }}>
                    / {totalMeals} Meals
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '4px' }}>
                  Shared across Lunch & Dinner services
                </p>
              </div>
            </div>

            {/* Expiry Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Validity Window</span>
                <span className="tnum" style={{ fontWeight: 500 }}>30 Days from Activation</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Meals Consumed</span>
                <span className="tnum" style={{ fontWeight: 500 }}>{consumedMeals} meals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-mute)' }}>Renewal Policy</span>
                <span style={{ color: 'var(--color-ink-secondary)', fontWeight: 400 }}>Unused meals expire after 30d</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setShowPaymentActivationModal(true)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px' }}
          >
            <Sparkles size={15} /> {member.subscription_status === 'active' ? 'Renew Subscription (₹2,800)' : 'Verify Phone & Activate (₹2,800)'}
          </button>
        </div>
      </div>

      {/* Today's Menu Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="eyebrow">Dining Menu</span>
            <h2 style={{ fontSize: '22px', marginTop: '2px' }}>
              Today's {activeMealPeriod === 'lunch' ? 'Lunch Specials' : 'Dinner Specials'}
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-mute)', backgroundColor: 'var(--color-canvas-soft)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-hairline)' }}>
            Freshly prepared with pure Desi Ghee
          </span>
        </div>

        {todayMenu?.items && todayMenu.items.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {todayMenu.items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-hairline)',
                  flexShrink: 0
                }}>
                  <UtensilsCrossed size={14} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>
                    {item.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                    {item.category || 'Special Dish'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px' }}>Menu is being updated by the kitchen.</p>
        )}
      </div>

      {/* Renewal Modal */}
      {showRenewModal && (
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
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-modal)' }}>
            <span className="eyebrow">Early Renewal</span>
            <h2 style={{ fontSize: '22px', marginTop: '2px' }}>Renew Subscription</h2>
            <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '4px' }}>
              Renewing now queues 54 meals to start when current quota finishes.
            </p>

            <div style={{
              margin: '18px 0',
              padding: '14px',
              backgroundColor: 'var(--color-canvas-soft)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-hairline)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span>Monthly Mess Thali</span>
                <span className="tnum">54 Meals / 30 Days</span>
              </div>
              <div className="tnum" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
                <span>Amount:</span>
                <span>₹2,800</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '8px' }}>
                Payment Method:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'upi_direct' ? 'var(--color-primary-subdued)' : '#ffffff' }}>
                  <input type="radio" checked={paymentMethod === 'upi_direct'} onChange={() => setPaymentMethod('upi_direct')} />
                  <span>Direct UPI / QR (Instant Activation)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'cash' ? 'var(--color-primary-subdued)' : '#ffffff' }}>
                  <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                  <span>Cash at Counter (Requires Approval)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'gateway' ? 'var(--color-primary-subdued)' : '#ffffff' }}>
                  <input type="radio" checked={paymentMethod === 'gateway'} onChange={() => setPaymentMethod('gateway')} />
                  <span>Online Cards / Netbanking</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="btn btn-secondary btn-pill"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renewing}
                onClick={async () => {
                  setRenewing(true);
                  setTimeout(() => {
                    setRenewing(false);
                    setShowRenewModal(false);
                    alert('Renewal request submitted! Once verified by admin, your queued plan will be ready.');
                    onRefresh();
                  }, 1000);
                }}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {renewing ? 'Processing...' : 'Confirm Renewal (₹2,800)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Passbook Modal */}
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
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="eyebrow">Audit Ledger</span>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)' }}>Meal Passbook</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                  Auditable record of all meals consumed and balance updates.
                </p>
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
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: '13px' }}>
                Loading meal passbook records...
              </div>
            ) : historyList.length > 0 ? (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
                {historyList.map(tx => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-canvas-soft)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-hairline)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>
                          {tx.meal_period === 'lunch' ? 'Lunch Session' : tx.meal_period === 'dinner' ? 'Dinner Session' : 'Balance Adjustment'}
                        </span>
                        <span className="badge badge-active" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={11} />
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {tx.reason && <span>• {tx.reason}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="tnum" style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: tx.meal_delta < 0 ? 'var(--color-error)' : 'var(--color-success)'
                      }}>
                        {tx.meal_delta < 0 ? `${tx.meal_delta} Meal` : `+${tx.meal_delta} Meals`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-mute)', backgroundColor: 'var(--color-canvas-soft)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                No meal transactions recorded yet on your current subscription.
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

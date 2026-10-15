import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Sparkles, RefreshCw, UtensilsCrossed, ShieldCheck, History, Clock, X } from 'lucide-react';
import type { Profile, DailyMenu, MealTransaction } from '../types';
import { api } from '../services/api';

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
        width: 190,
        margin: 1,
        color: {
          dark: '#1c1b1a',
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
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
          <span className="eyebrow" style={{ color: 'var(--color-stone)' }}>Member Portal</span>
          <h1 style={{ fontSize: '36px', marginTop: '4px' }}>
            Namaste, {member.full_name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-ash)', fontSize: '15px' }}>
            Unique Member ID: <strong style={{ color: 'var(--color-ink)' }}>{member.member_number}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={loadMemberHistory} className="btn btn-outline btn-pill" title="View Meal Passbook">
            <History size={14} /> Meal Passbook
          </button>
          <button onClick={onRefresh} className="btn btn-outline btn-pill" title="Refresh Live Data">
            <RefreshCw size={14} /> Refresh
          </button>
          <span className={`badge badge-${member.subscription_status === 'active' ? 'active' : 'pending'}`}>
            {member.subscription_status === 'active' ? '● Active Subscription' : 'Pending Payment'}
          </span>
        </div>
      </div>


      {/* Grid: QR Pass & Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Digital QR Meal Pass */}
        <div className="card" style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, var(--color-canvas) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-hairline)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-stone)'
          }}>
            PASS #{member.member_number}
          </div>

          <span className="eyebrow" style={{ color: 'var(--color-stone)', marginTop: '8px' }}>
            Official Mess Check-in Pass
          </span>

          <div style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            margin: '20px 0',
            border: '1px solid var(--color-hairline)'
          }}>
            <canvas ref={canvasRef} />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {member.full_name}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '4px', maxWidth: '260px' }}>
            Show this QR code to the receptionist or scan venue QR at meal time.
          </p>

          <div style={{
            marginTop: '20px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#eef4fc',
            border: '1px solid #bfd9f8',
            fontSize: '12px',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={14} /> Server Verified Token
          </div>
        </div>

        {/* Card 2: Meal Balance & Validity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Subscription & Meals</span>
                <h2 style={{ fontSize: '28px', marginTop: '4px' }}>Meal Balance</h2>
              </div>
              <span className="badge badge-active">₹2,800 Plan</span>
            </div>

            {/* Circular Progress & Large Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              margin: '28px 0',
              padding: '20px',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-hairline)'
            }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: `conic-gradient(var(--color-primary) ${percentage * 3.6}deg, #e1dcd3 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)' }}>{percentage}%</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '48px',
                    fontWeight: 300,
                    lineHeight: 1,
                    color: remainingMeals <= 5 ? 'var(--color-error)' : 'var(--color-ink)'
                  }}>
                    {remainingMeals}
                  </span>
                  <span style={{ fontSize: '18px', color: 'var(--color-ash)', fontWeight: 500 }}>
                    / {totalMeals} Meals
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-stone)', marginTop: '6px' }}>
                  Shared seamlessly across Lunch & Dinner
                </p>
              </div>
            </div>

            {/* Expiry Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed var(--color-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-ash)' }}>Validity Period</span>
                <span style={{ fontWeight: 600 }}>30 Days from Activation</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed var(--color-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-ash)' }}>Total Meals Consumed</span>
                <span style={{ fontWeight: 600 }}>{consumedMeals} meals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-ash)' }}>Expiry Policy</span>
                <span style={{ color: 'var(--color-clay)', fontWeight: 500 }}>Unused meals expire after 30d</span>
              </div>
            </div>
          </div>

          {/* Action Blue CTA */}
          <button
            onClick={() => setShowRenewModal(true)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
          >
            <Sparkles size={16} /> Renew Subscription (₹2,800)
          </button>
        </div>
      </div>

      {/* Today's Menu Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Daily Mess Specials</span>
            <h2 style={{ fontSize: '26px', marginTop: '2px' }}>
              Today's {activeMealPeriod === 'lunch' ? '🌞 Lunch Menu' : '🌙 Dinner Menu'}
            </h2>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-stone)', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-hairline)' }}>
            Freshly prepared with pure Desi Ghee
          </span>
        </div>

        {todayMenu?.items && todayMenu.items.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            {todayMenu.items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold)',
                  border: '1px solid var(--color-hairline)'
                }}>
                  <UtensilsCrossed size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {item.name}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
                    {item.category || 'Special Dish'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-ash)', fontSize: '14px' }}>Menu is being updated by the kitchen.</p>
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
          backgroundColor: 'rgba(28, 27, 26, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '32px', boxShadow: 'var(--shadow-floating)' }}>
            <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Early Renewal</span>
            <h2 style={{ fontSize: '26px', marginTop: '4px' }}>Renew Subscription</h2>
            <p style={{ color: 'var(--color-ash)', fontSize: '14px', marginTop: '6px' }}>
              Renewing now will automatically <strong>queue</strong> your 54 meals to start seamlessly when your current plan ends.
            </p>

            <div style={{
              margin: '20px 0',
              padding: '16px',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-hairline)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Plan: <strong>Monthly Mess Thali</strong></span>
                <span>54 Meals / 30 Days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
                <span>Amount:</span>
                <span>₹2,800</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '8px' }}>
                Select Payment Method:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'upi_direct' ? '#eef4fc' : '#fff' }}>
                  <input type="radio" checked={paymentMethod === 'upi_direct'} onChange={() => setPaymentMethod('upi_direct')} />
                  <span>Direct UPI / QR (Instant Verification)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'cash' ? '#eef4fc' : '#fff' }}>
                  <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                  <span>Cash at Counter (Requires Receptionist Approval)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-hairline)', cursor: 'pointer', backgroundColor: paymentMethod === 'gateway' ? '#eef4fc' : '#fff' }}>
                  <input type="radio" checked={paymentMethod === 'gateway'} onChange={() => setPaymentMethod('gateway')} />
                  <span>Online Payment Gateway (Cards / Netbanking)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRenewModal(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                disabled={renewing}
                onClick={async () => {
                  setRenewing(true);
                  // Simulate queued renewal
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
          backgroundColor: 'rgba(28, 27, 26, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '32px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Member Audit Ledger</span>
                <h2 style={{ fontSize: '24px', marginTop: '2px' }}>Meal Passbook & Attendance</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-ash)', marginTop: '2px' }}>
                  Auditable record of all meals consumed and balance adjustments.
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-outline btn-pill" style={{ padding: '8px' }}>
                <X size={18} />
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ash)' }}>
                Loading meal passbook records...
              </div>
            ) : historyList.length > 0 ? (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {historyList.map(tx => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-canvas)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-hairline)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                          {tx.meal_period === 'lunch' ? '🌞 Lunch Session' : tx.meal_period === 'dinner' ? '🌙 Dinner Session' : '⚙️ Balance Adjustment'}
                        </span>
                        <span className="badge badge-active" style={{ fontSize: '10px' }}>
                          {tx.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {tx.reason && <span>• Reason: {tx.reason}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '15px',
                        color: tx.meal_delta < 0 ? 'var(--color-error)' : 'var(--color-forest)'
                      }}>
                        {tx.meal_delta < 0 ? `${tx.meal_delta} Meal` : `+${tx.meal_delta} Meals`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ash)', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)' }}>
                No meal transactions recorded yet on your current subscription.
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(false)}
              className="btn btn-secondary btn-pill"
              style={{ width: '100%' }}
            >
              Close Passbook
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


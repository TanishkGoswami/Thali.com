import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Search, CheckCircle, XCircle, Camera } from 'lucide-react';
import type { Profile, CheckInResult, MealTransaction } from '../types';
import { api } from '../services/api';
import { sound } from '../lib/audio';
import { CameraScannerModal } from './CameraScannerModal';

interface ReceptionistViewProps {
  members: (Profile & { remaining_meals?: number; subscription_status?: string })[];
  activeMealPeriod: 'lunch' | 'dinner';
  recentTransactions: (MealTransaction & { member_name?: string; member_number?: string })[];
  onRefresh: () => void;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({
  members,
  activeMealPeriod,
  recentTransactions,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Handle Check-in logic
  const handleCheckIn = async (qrToken: string) => {
    setCheckingIn(true);
    setLastResult(null);

    try {
      const result = await api.checkInMeal(qrToken, activeMealPeriod);
      setLastResult(result);

      if (result.success && result.code === 'ACCEPTED') {
        sound.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (result.code === 'DUPLICATE_CHECKIN') {
        sound.playWarning();
      } else {
        sound.playError();
      }

      onRefresh();
    } catch (err) {
      sound.playError();
      setLastResult({
        success: false,
        code: 'ERROR',
        message: 'Network or database error during check-in.'
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.member_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery)
  );

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner */}
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
          <span className="eyebrow">Frontdesk Operations</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px' }}>
            Meal Check-In Operator
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px' }}>
            Active Slot: <strong style={{ color: 'var(--color-ink)', textTransform: 'capitalize' }}>{activeMealPeriod} Service</strong> • Fast pass validation & deduplication
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-active">
            ● Terminal Online
          </span>
        </div>
      </div>

      {/* Result Alert Feedback Banner */}
      {lastResult && (
        <div className="animate-fade-in" style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${lastResult.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
          backgroundColor: lastResult.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-level-1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {lastResult.success ? (
              <CheckCircle size={24} color="var(--color-success)" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={24} color="var(--color-error)" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: lastResult.success ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                  {lastResult.message}
                </h3>
                <span className="badge" style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid currentColor',
                  color: lastResult.success ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: '9px',
                  padding: '1px 6px'
                }}>
                  {lastResult.code}
                </span>
              </div>
              {lastResult.member_name && (
                <p className="tnum" style={{ fontSize: '12px', color: 'var(--color-ink)', marginTop: '2px' }}>
                  Member: <strong>{lastResult.member_name}</strong> ({lastResult.member_number}) • Balance Remaining: <strong>{lastResult.remaining_meals} meals</strong>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLastResult(null)}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '11px', padding: '3px 10px', marginLeft: 'auto' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Scanner / Fast Search & Recent Checkins */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Left Column: Fast Scanner & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card: Instant QR Scanner Input */}
          <div className="card">
            <span className="eyebrow">Instant Scan</span>
            <h2 style={{ fontSize: '18px', marginTop: '2px' }}>Scan Member Pass</h2>
            <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', marginTop: '2px', marginBottom: '12px' }}>
              Aim handheld USB scanner or enter token to deduct 1 meal.
            </p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Scan or paste QR token..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualToken.trim()) {
                    handleCheckIn(manualToken.trim());
                    setManualToken('');
                  }
                }}
                className="form-input"
                style={{ flex: 1, minWidth: '180px' }}
              />
              <button
                type="button"
                disabled={checkingIn || !manualToken.trim()}
                onClick={() => {
                  handleCheckIn(manualToken.trim());
                  setManualToken('');
                }}
                className="btn btn-primary"
                style={{ flexShrink: 0 }}
              >
                {checkingIn ? 'Checking...' : 'Check-in'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '12px 0 8px',
              gap: '10px',
              color: 'var(--color-ink-mute)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)' }} />
              <span>OR OPTICAL CAMERA</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)' }} />
            </div>

            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="btn btn-secondary btn-pill"
              style={{ width: '100%', gap: '6px' }}
            >
              <Camera size={14} /> Open Device Camera Scanner
            </button>
          </div>

          {/* Card: Member Lookup & Instant Fallback Check-in */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span className="eyebrow">Directory Register</span>
                <h2 style={{ fontSize: '18px', marginTop: '2px' }}>Member Search</h2>
              </div>
              <span className="badge tnum" style={{ backgroundColor: 'var(--color-canvas-soft)', color: 'var(--color-ink-mute)', border: '1px solid var(--color-hairline)' }}>
                {filteredMembers.length} Members
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
              <input
                type="text"
                placeholder="Search member #, name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-canvas-soft)'
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="tnum" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-hairline)',
                        color: 'var(--color-ink)'
                      }}>
                        {m.member_number}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</strong>
                    </div>
                    <div className="tnum" style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                      <span>Bal: <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>{m.remaining_meals ?? 0}</strong></span>
                      <span>• <span style={{ textTransform: 'capitalize' }}>{m.subscription_status}</span></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={checkingIn}
                    onClick={() => handleCheckIn(m.qr_token)}
                    className="btn btn-secondary btn-pill"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      flexShrink: 0
                    }}
                  >
                    Check-in
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Meal Check-in Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span className="eyebrow">Real-Time Audit</span>
              <h2 style={{ fontSize: '18px', marginTop: '2px' }}>Today's Check-ins</h2>
            </div>
            <span className="badge badge-active tnum">
              {recentTransactions.length} Logged
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '480px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-success-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success)',
                      flexShrink: 0
                    }}>
                      <CheckCircle size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.member_name || 'Member'}
                        </span>
                        <span className="tnum" style={{ fontSize: '10px', color: 'var(--color-ink-mute)' }}>
                          ({tx.member_number})
                        </span>
                      </div>
                      <span className="tnum" style={{ fontSize: '10px', color: 'var(--color-ink-mute)' }}>
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.meal_period}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-error tnum" style={{ fontSize: '10px', padding: '1px 6px', flexShrink: 0 }}>
                    -1 Meal
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-ink-mute)', fontSize: '12px', textAlign: 'center', padding: '28px 0' }}>
                No check-ins recorded yet for today's session.
              </p>
            )}
          </div>
        </div>

      </div>
      
      {/* Optical Camera QR Scanner Modal */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={(token) => {
          handleCheckIn(token);
          setShowCameraScanner(false);
        }}
        mealPeriod={activeMealPeriod}
      />

    </div>
  );
};

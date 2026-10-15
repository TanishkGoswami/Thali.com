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
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner */}
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
          <span className="eyebrow">Frontdesk Operations</span>
          <h1 style={{ fontSize: '32px', marginTop: '4px' }}>
            Meal Check-In Operator
          </h1>
          <p style={{ color: 'var(--color-ink-mute)', fontSize: '14px', marginTop: '2px' }}>
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
          padding: '18px 22px',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${lastResult.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
          backgroundColor: lastResult.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: 'var(--shadow-level-1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {lastResult.success ? (
              <CheckCircle size={28} color="var(--color-success)" />
            ) : (
              <XCircle size={28} color="var(--color-error)" />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: lastResult.success ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                  {lastResult.message}
                </h3>
                <span className="badge" style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid currentColor',
                  color: lastResult.success ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: '10px'
                }}>
                  {lastResult.code}
                </span>
              </div>
              {lastResult.member_name && (
                <p className="tnum" style={{ fontSize: '13px', color: 'var(--color-ink)', marginTop: '2px' }}>
                  Member: <strong>{lastResult.member_name}</strong> ({lastResult.member_number}) • Balance Remaining: <strong>{lastResult.remaining_meals} meals</strong>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLastResult(null)}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '12px', padding: '4px 12px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Scanner / Fast Search & Recent Checkins */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Fast Scanner & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Instant QR Scanner Input */}
          <div className="card">
            <span className="eyebrow">Instant Scan</span>
            <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Scan Member Pass</h2>
            <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', marginTop: '2px', marginBottom: '14px' }}>
              Aim handheld USB scanner or enter token to deduct 1 meal.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
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
              />
              <button
                type="button"
                disabled={checkingIn || !manualToken.trim()}
                onClick={() => {
                  handleCheckIn(manualToken.trim());
                  setManualToken('');
                }}
                className="btn btn-primary"
              >
                {checkingIn ? 'Checking...' : 'Check-in'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '14px 0 10px',
              gap: '12px',
              color: 'var(--color-ink-mute)',
              fontSize: '11px',
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
              style={{ width: '100%', gap: '8px' }}
            >
              <Camera size={15} /> Open Device Camera Scanner
            </button>
          </div>

          {/* Card: Member Lookup & Instant Fallback Check-in */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Directory Register</span>
                <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Member Search</h2>
              </div>
              <span className="badge tnum" style={{ backgroundColor: 'var(--color-canvas-soft)', color: 'var(--color-ink-mute)', border: '1px solid var(--color-hairline)' }}>
                {filteredMembers.length} Members
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
              <input
                type="text"
                placeholder="Search member # (e.g. M-101), name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '34px' }}
              />
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-canvas-soft)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tnum" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-hairline)',
                        color: 'var(--color-ink)'
                      }}>
                        {m.member_number}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--color-ink)', fontWeight: 500 }}>{m.full_name}</strong>
                    </div>
                    <div className="tnum" style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
                      <span>Remaining: <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>{m.remaining_meals ?? 0}</strong> meals</span>
                      <span>Status: <span style={{ textTransform: 'capitalize' }}>{m.subscription_status}</span></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={checkingIn}
                    onClick={() => handleCheckIn(m.qr_token)}
                    className="btn btn-secondary btn-pill"
                    style={{
                      fontSize: '12px',
                      padding: '5px 12px'
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <span className="eyebrow">Real-Time Audit</span>
              <h2 style={{ fontSize: '20px', marginTop: '2px' }}>Today's Check-ins</h2>
            </div>
            <span className="badge badge-active tnum">
              {recentTransactions.length} Logged
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '520px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-success-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success)'
                    }}>
                      <CheckCircle size={15} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)' }}>
                          {tx.member_name || 'Member'}
                        </span>
                        <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                          ({tx.member_number})
                        </span>
                      </div>
                      <span className="tnum" style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.meal_period}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-error tnum" style={{ fontSize: '11px' }}>
                    -1 Meal
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-ink-mute)', fontSize: '13px', textAlign: 'center', padding: '36px 0' }}>
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

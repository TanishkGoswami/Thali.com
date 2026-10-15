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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
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
          <span className="eyebrow" style={{ color: 'var(--color-stone)' }}>Reception Terminal</span>
          <h1 style={{ fontSize: '36px', marginTop: '4px' }}>
            Meal Check-In Operator
          </h1>
          <p style={{ color: 'var(--color-ash)', fontSize: '15px' }}>
            Current Meal Slot: <strong style={{ color: 'var(--color-ink)', textTransform: 'capitalize' }}>{activeMealPeriod}</strong> • Preserves legacy paper-book numbers
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge" style={{ backgroundColor: '#224228', color: '#fff' }}>
            ● Service Online
          </span>
        </div>
      </div>

      {/* Result Alert Feedback Banner */}
      {lastResult && (
        <div className="animate-fade-in" style={{
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${lastResult.success ? '#c2e2c8' : '#f1cfc4'}`,
          backgroundColor: lastResult.success ? '#e9f5ec' : '#fdf2f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {lastResult.success ? (
              <CheckCircle size={36} color="var(--color-forest)" />
            ) : (
              <XCircle size={36} color="var(--color-error)" />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: lastResult.success ? 'var(--color-forest)' : 'var(--color-error)'
                }}>
                  {lastResult.message}
                </h3>
                <span className="badge" style={{
                  backgroundColor: lastResult.success ? '#224228' : '#e33a22',
                  color: '#fff',
                  fontSize: '11px'
                }}>
                  {lastResult.code}
                </span>
              </div>
              {lastResult.member_name && (
                <p style={{ fontSize: '14px', color: 'var(--color-ink)', marginTop: '4px' }}>
                  Member: <strong>{lastResult.member_name}</strong> ({lastResult.member_number}) • Balance Remaining: <strong>{lastResult.remaining_meals} meals</strong>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setLastResult(null)}
            className="btn btn-outline btn-pill"
            style={{ fontSize: '12px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Scanner / Fast Search & Recent Checkins */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Fast Scanner & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card: Instant QR Scanner Simulation / Input */}
          <div className="card">
            <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Fast Barcode / QR Scan</span>
            <h2 style={{ fontSize: '24px', marginTop: '4px' }}>Scan Member Pass</h2>
            <p style={{ color: 'var(--color-ash)', fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>
              Aim handheld USB/Bluetooth scanner or enter token to immediately deduct 1 meal.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
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
                disabled={checkingIn || !manualToken.trim()}
                onClick={() => {
                  handleCheckIn(manualToken.trim());
                  setManualToken('');
                }}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {checkingIn ? 'Checking...' : 'Check-in'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '14px 0 10px',
              gap: '12px',
              color: 'var(--color-ash)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)' }} />
              <span>OR USE OPTICAL CAMERA</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)' }} />
            </div>

            <button
              onClick={() => setShowCameraScanner(true)}
              className="btn btn-secondary btn-pill"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Camera size={16} /> Open Device Camera Scanner
            </button>
          </div>


          {/* Card: Member Lookup & Instant Fallback Check-in */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-stone)' }}>Member Register</span>
                <h2 style={{ fontSize: '24px', marginTop: '4px' }}>Quick Member Search</h2>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--color-canvas)', color: 'var(--color-stone)' }}>
                {filteredMembers.length} Members
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ash)' }} />
              <input
                type="text"
                placeholder="Search member # (e.g. M-101), name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-canvas)',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-surface)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-hairline)',
                        color: 'var(--color-ink)'
                      }}>
                        {m.member_number}
                      </span>
                      <strong style={{ fontSize: '15px', color: 'var(--color-ink)' }}>{m.full_name}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-ash)', marginTop: '4px' }}>
                      <span>Remaining: <strong style={{ color: (m.remaining_meals ?? 0) <= 5 ? 'var(--color-error)' : 'var(--color-ink)' }}>{m.remaining_meals ?? 0}</strong> meals</span>
                      <span>Status: <span style={{ textTransform: 'capitalize' }}>{m.subscription_status}</span></span>
                    </div>
                  </div>

                  <button
                    disabled={checkingIn}
                    onClick={() => handleCheckIn(m.qr_token)}
                    className="btn btn-pill"
                    style={{
                      backgroundColor: 'var(--color-stone)',
                      color: '#fff',
                      fontSize: '12px',
                      padding: '8px 16px'
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-forest)' }}>Live Operational Log</span>
              <h2 style={{ fontSize: '24px', marginTop: '4px' }}>Today's Check-ins</h2>
            </div>
            <span className="badge badge-active">
              {recentTransactions.length} Total Today
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '560px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e9f5ec',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-forest)'
                    }}>
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {tx.member_name || 'Member'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)' }}>
                          ({tx.member_number})
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.meal_period}
                      </span>
                    </div>
                  </div>

                  <span className="badge" style={{ backgroundColor: '#fbeee8', color: 'var(--color-clay)', fontSize: '11px' }}>
                    -1 Meal
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-ash)', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
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


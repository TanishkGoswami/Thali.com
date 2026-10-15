import React, { useEffect, useState } from 'react';
import { ChefHat, RefreshCw, Users, UserX, CheckCircle2, Clock } from 'lucide-react';
import type { DailyHeadcount, MealPeriod } from '../types';
import { MEAL_CUTOFF_CONFIG, isMealCutoffPassed } from '../types';
import { api } from '../services/api';

export const KitchenHeadcountCard: React.FC = () => {
  const [dateOffset, setDateOffset] = useState<0 | 1>(0); // 0 = Today, 1 = Tomorrow
  const [headcount, setHeadcount] = useState<DailyHeadcount | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const targetDateObj = new Date(today);
  targetDateObj.setDate(today.getDate() + dateOffset);
  const targetDateStr = targetDateObj.toISOString().split('T')[0];

  const loadHeadcount = async () => {
    setLoading(true);
    try {
      const data = await api.getDailyHeadcount(targetDateStr);
      setHeadcount(data);
    } catch (e) {
      console.error('Error loading kitchen headcount:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeadcount();
  }, [targetDateStr]);

  const periods: { period: MealPeriod; title: string; icon: string; accentColor: string }[] = [
    { period: 'breakfast', title: 'Breakfast', icon: '🌅', accentColor: '#059669' },
    { period: 'lunch', title: 'Lunch', icon: '☀️', accentColor: '#2563eb' },
    { period: 'dinner', title: 'Dinner', icon: '🌙', accentColor: '#7c3aed' }
  ];

  return (
    <div className="card" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)' }}>
      {/* Card Header with Headcount Summary & Day Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-primary-bg)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ChefHat size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Kitchen Intelligence</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
              Kitchen Headcount & Food Planning
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
              Live plates calculation based on enrolled members minus skipped members.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Day Switcher */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-hairline)',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setDateOffset(0)}
              className="btn btn-pill"
              style={{
                backgroundColor: dateOffset === 0 ? '#ffffff' : 'transparent',
                color: dateOffset === 0 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: dateOffset === 0 ? 'var(--shadow-level-1)' : 'none',
                fontSize: '11px',
                fontWeight: dateOffset === 0 ? 600 : 400,
                padding: '4px 12px'
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateOffset(1)}
              className="btn btn-pill"
              style={{
                backgroundColor: dateOffset === 1 ? '#ffffff' : 'transparent',
                color: dateOffset === 1 ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: dateOffset === 1 ? 'var(--shadow-level-1)' : 'none',
                fontSize: '11px',
                fontWeight: dateOffset === 1 ? 600 : 400,
                padding: '4px 12px'
              }}
            >
              Tomorrow
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={loadHeadcount}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '11px', padding: '5px 10px', gap: '4px' }}
            title="Refresh headcount"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* 3 Sessions Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {periods.map(({ period, title, icon, accentColor }) => {
          const stats = headcount ? headcount[period] : { enrolled: 0, skipped: 0, consumed: 0 };
          const expectedToCook = Math.max(0, (stats?.enrolled ?? 0) - (stats?.skipped ?? 0));
          const cutoff = MEAL_CUTOFF_CONFIG[period];
          const isPassed = isMealCutoffPassed(targetDateStr, period);

          return (
            <div
              key={period}
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas-soft)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Accent Strip */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: accentColor
              }} />

              <div>
                {/* Session Title & Cutoff */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {title}
                    </h4>
                  </div>

                  <span className="badge" style={{
                    fontSize: '10px',
                    backgroundColor: isPassed ? 'rgba(107, 114, 128, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                    color: isPassed ? '#6b7280' : '#059669',
                    border: '1px solid currentColor'
                  }}>
                    {isPassed ? '● Slot Locked' : '● Cutoff Open'}
                  </span>
                </div>

                {/* Big Metric: Expected Plates to Cook */}
                <div style={{
                  marginTop: '16px',
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-hairline)',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-level-1)'
                }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-mute)', fontWeight: 600 }}>
                    Expected Plates to Cook
                  </div>
                  <div className="tnum" style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: accentColor,
                    lineHeight: 1.2,
                    marginTop: '4px'
                  }}>
                    {expectedToCook}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-secondary)', marginTop: '2px' }}>
                    plates needed for {dateOffset === 0 ? 'today' : 'tomorrow'}
                  </div>
                </div>

                {/* Granular Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  marginTop: '12px'
                }}>
                  {/* Enrolled */}
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: 'var(--color-ink-mute)' }}>
                      <Users size={10} /> Enrolled
                    </div>
                    <div className="tnum" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
                      {stats?.enrolled ?? 0}
                    </div>
                  </div>

                  {/* Skipped */}
                  <div style={{
                    padding: '8px',
                    backgroundColor: stats?.skipped ? '#fffbeb' : '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${stats?.skipped ? '#fde68a' : 'var(--color-hairline)'}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: stats?.skipped ? '#b45309' : 'var(--color-ink-mute)' }}>
                      <UserX size={10} /> Skipped
                    </div>
                    <div className="tnum" style={{ fontSize: '14px', fontWeight: 600, color: stats?.skipped ? '#b45309' : 'var(--color-ink)', marginTop: '2px' }}>
                      {stats?.skipped ?? 0}
                    </div>
                  </div>

                  {/* Eaten */}
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: 'var(--color-ink-mute)' }}>
                      <CheckCircle2 size={10} /> Eaten
                    </div>
                    <div className="tnum" style={{ fontSize: '14px', fontWeight: 600, color: '#059669', marginTop: '2px' }}>
                      {stats?.consumed ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cut-off footer */}
              <div style={{
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid var(--color-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--color-ink-mute)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} />
                  <span>Cut-off Deadline:</span>
                </div>
                <strong style={{ color: 'var(--color-ink)' }}>{cutoff.timeStr}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
